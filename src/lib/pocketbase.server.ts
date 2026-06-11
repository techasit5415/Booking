import { POCKETBASE_URL, USER_ADMIN, USER_ADMIN_PASSWORD, CLIENT_SECRET } from '$env/static/private';
import PocketBase from 'pocketbase';

const pbServer = new PocketBase(POCKETBASE_URL);

export async function loginWithKmitlCode(code: string) {
    // 1. แลก Access Token จาก KMITL (เหมือนเดิม)
    const tokenResponse = await fetch('https://api.science.kmitl.ac.th/iam/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'grant_type': 'authorization_code',
            'client_id': 'CI0IHz3JNTe7v2SHEr3RkFTdIZgRPFZY.e637637a-5f74-491f-be6e-dfe6e299190c.client.iam.science.kmitl.ac.th',
            'client_secret': CLIENT_SECRET, 
            'redirect_uri': 'http://localhost:5173/auth/callback',
            'code': code
        })
    });

    const tokenResponseData = await tokenResponse.json();
    const accessToken = tokenResponseData?.data?.access_token;

    if (!accessToken) {
        console.error('KMITL Token Error:', tokenResponseData);
        throw new Error('แลก Access Token จากสถาบันไม่สำเร็จ');
    }

    // 2. ✅ [จุดปรับปรุงใหม่] ยิงดึงข้อมูลจากทั้ง 2 API พร้อมกันเพื่อประหยัดเวลา
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

    const userinfoJson = await userinfoRes.json();
    const profileJson = await profileRes.json();

    // แกะข้อมูลชั้น .data ออกมาให้เรียบร้อย
    const infoData = userinfoJson?.data ? userinfoJson.data : userinfoJson;
    const profileData = profileJson?.data ? profileJson.data : profileJson;

    // 🔄 ผสานข้อมูล (Merge) รวมร่างกันเป็นวัตถุ userData ก้อนเดียว
    // ตัวแปร userData ตอนนี้จะมีทั้ง email (จาก userinfo) และ name/ข้อมูลส่วนตัว (จาก profile)
    const userData = { ...infoData, ...profileData };
    console.log('ข้อมูลรวมจาก KMITL (UserInfo + Profile):', userData);

    // แกะข้อมูลที่จำเป็นไปใช้งาน
    const studentId = userData.email?.split('@')[0] || '';

    // ✅ สร้าง fullName ให้ถูกต้อง — KMITL ส่ง title + firstname_th + lastname_th มา
    //    (ไม่ใช่ name/fullname — เคยเขียนผิดจน fallback ไปใช้ studentId ตลอด)
    const fullName =
        [userData.title, userData.firstname_th, userData.lastname_th]
            .filter(Boolean)
            .join(' ')
            .trim() ||
        userData.name ||
        userData.fullname ||
        (studentId ? `นักศึกษา ${studentId}` : 'KMITL User');

    const username = studentId || 'kmitl_' + Math.random().toString(36).substring(2, 7);

    // 3. เข้าสิทธิ์ซูเปอร์ยูสเซอร์เพื่อไปเคลียร์ข้อมูลลงตาราง PocketBase
    await pbServer.collection('_superusers').authWithPassword(USER_ADMIN, USER_ADMIN_PASSWORD);

    const KMITL_USER_TYPE = '000000000000001';

    let targetUser;
    try {
        targetUser = await pbServer.collection('users').getFirstListItem(`email="${userData.email}"`);
        console.log('พบผู้ใช้เดิมในระบบ:', targetUser.email);

        // ✅ บังคับ sync ชื่อจาก KMITL ทุกครั้งที่ login
        //    (เดิมดักเฉพาะ placeholder → user เก่าที่เคยถูกสร้างตอน title=undefined
        //     จะมีชื่อเป็น "undefined เตชสิทธิ์ ..." ซึ่งไม่ใช่ placeholder → ไม่อัปเดต)
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
            name: fullName, // ใช้ fullName ตัวเดียวกับที่ update ใช้
            username: studentId || 'kmitl_' + Math.random().toString(36).substring(2, 7),
            password: secureTempPassword,
            passwordConfirm: secureTempPassword,
            emailVisibility: true,
            user_type: KMITL_USER_TYPE,
        });
        console.log('สร้างบัญชีผู้ใช้ใหม่สำเร็จ:', targetUser.id);
    }

    // 4. สั่งล็อกอินข้ามร่างออก Token สิทธิ์ของ User
    await pbServer.collection('users').impersonate(targetUser.id, 60 * 60 * 24 * 7);

    const userToken = pbServer.authStore.token;

    // 4.5) ✅ ดึงข้อมูล user จาก PB ด้วย superadmin (อยู่ใน authStore ตอนนี้)
    //    เพื่อให้ cookie ได้ข้อมูลล่าสุดจากฐานข้อมูลจริง (ชื่อที่เพิ่ง update, email, username ฯลฯ)
    //    ไม่ใช่พึ่ง payload จาก impersonate response ที่อาจไม่ sync
    const freshUser = await pbServer.collection('users').getOne(targetUser.id);

    // 5. ล้างสิทธิ์แอดมินเพื่อความปลอดภัย
    pbServer.authStore.clear();

    return {
        token: userToken,
        model: {
            id: freshUser.id,
            email: freshUser.email,
            name: freshUser.name ?? '',
            username: freshUser.username,
        },
    };
}