import { POCKETBASE_URL, USER_ADMIN, USER_ADMIN_PASSWORD, CLIENT_SECRET } from '$env/static/private';
import { PUBLIC_KMITL_CLIENT_ID, PUBLIC_KMITL_REDIRECT_URI } from '$env/static/public';
import PocketBase from 'pocketbase';
import type { KmitlTokenResponse, KmitlUserInfo, KmitlProfile, KmitlLoginResult } from './types';

const pbServer = new PocketBase(POCKETBASE_URL);

/**
 * แลกรหัส Authorization Code จาก KMITL IAM Portal และเข้าสู่ระบบ PocketBase ดำเนินการสร้าง/ซิงก์ผู้ใช้
 * @param code Authorization Code จาก KMITL
 * @returns Token และ Model ข้อมูลผู้ใช้
 */
export async function loginWithKmitlCode(code: string): Promise<KmitlLoginResult> {
	// 1. แลก Access Token จาก KMITL
	const tokenResponse = await fetch('https://api.science.kmitl.ac.th/iam/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			'grant_type': 'authorization_code',
			'client_id': PUBLIC_KMITL_CLIENT_ID,
			'client_secret': CLIENT_SECRET,
			'redirect_uri': PUBLIC_KMITL_REDIRECT_URI,
			'code': code
		})
	});

	const tokenResponseData = (await tokenResponse.json()) as KmitlTokenResponse;
	const accessToken = tokenResponseData?.data?.access_token || tokenResponseData?.access_token;

	if (!accessToken) {
		console.error('KMITL Token Error:', tokenResponseData);
		throw new Error('แลก Access Token จากสถาบันไม่สำเร็จ');
	}

	// 2. ดึงข้อมูล UserInfo และ Profile จาก API สถาบันพร้อมกัน
	const [userinfoRes, profileRes] = await Promise.all([
		fetch('https://api.science.kmitl.ac.th/iam/oauth2/resource/read:userinfo', {
			method: 'GET',
			headers: { 'Authorization': `Bearer ${accessToken}` }
		}),
		fetch('https://api.science.kmitl.ac.th/iam/oauth2/resource/read:profile', {
			method: 'GET',
			headers: { 'Authorization': `Bearer ${accessToken}` }
		})
	]);

	const userinfoJson = (await userinfoRes.json()) as any;
	const profileJson = (await profileRes.json()) as any;

	const infoData = (userinfoJson?.data ? userinfoJson.data : userinfoJson) as KmitlUserInfo;
	const profileData = (profileJson?.data ? profileJson.data : profileJson) as KmitlProfile;

	// ผสานข้อมูล (UserInfo + Profile)
	const userData = { ...infoData, ...profileData };
	console.log('ข้อมูลรวมจาก KMITL (UserInfo + Profile):', userData);

	const studentId = userData.email?.split('@')[0] || '';

	// สรุปโครงสร้างชื่อเต็มผู้ใช้
	const fullName =
		[userData.title, userData.firstname_th, userData.lastname_th]
			.filter(Boolean)
			.join(' ')
			.trim() ||
		userData.name ||
		userData.fullname ||
		(studentId ? `นักศึกษา ${studentId}` : 'KMITL User');

	// 3. เข้าสู่ระบบ Superuser PocketBase เพื่อแก้ไขฐานข้อมูล
	await pbServer.collection('_superusers').authWithPassword(USER_ADMIN, USER_ADMIN_PASSWORD);

	const KMITL_USER_TYPE = '000000000000001';
	let targetUser;

	try {
		targetUser = await pbServer.collection('users').getFirstListItem(`email="${userData.email}"`);
		console.log('พบผู้ใช้เดิมในระบบ:', targetUser.email);

		const needsNameUpdate = targetUser.name !== fullName;
		const needsTypeUpdate = !targetUser.user_type;
		const updates: Record<string, string> = {};

		if (needsNameUpdate) updates.name = fullName;
		if (needsTypeUpdate) updates.user_type = KMITL_USER_TYPE;

		if (Object.keys(updates).length > 0) {
			targetUser = await pbServer.collection('users').update(targetUser.id, updates);
			console.log('อัปเดตข้อมูลจริงให้ผู้ใช้เดิม:', targetUser.id, '→', Object.keys(updates).join(', '));
		}
	} catch (e) {
		console.log('ไม่พบผู้ใช้เดิม กำลังสร้างบัญชีใหม่...');
		const secureTempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
		targetUser = await pbServer.collection('users').create({
			email: userData.email,
			name: fullName,
			username: studentId || 'kmitl_' + Math.random().toString(36).substring(2, 7),
			password: secureTempPassword,
			passwordConfirm: secureTempPassword,
			emailVisibility: true,
			user_type: KMITL_USER_TYPE
		});
		console.log('สร้างบัญชีผู้ใช้ใหม่สำเร็จ:', targetUser.id);
	}

	// 4. สร้างสิทธิ์ impersonate ออก token ในฐานะผู้ใช้นั้น
	await pbServer.collection('users').impersonate(targetUser.id, 60 * 60 * 24 * 7);
	const userToken = pbServer.authStore.token;

	// ดึงข้อมูลผู้ใช้ล่าสุด
	const freshUser = await pbServer.collection('users').getOne(targetUser.id);

	// เคลียร์ session admin เพื่อความปลอดภัย
	pbServer.authStore.clear();

	return {
		token: userToken,
		model: {
			id: freshUser.id,
			email: freshUser.email,
			name: freshUser.name ?? '',
			username: freshUser.username
		}
	};
}