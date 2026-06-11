import { POCKETBASE_URL, USER_ADMIN, USER_ADMIN_PASSWORD, CLIENT_SECRET } from '$env/static/private';
import { clear } from 'console';
import PocketBase from 'pocketbase';

const pbServer = new PocketBase(POCKETBASE_URL);

export async function loginWithKmitlCode(code: string) {
    // 1. แลก Access Token จาก KMITL
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

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
        console.error('KMITL Token Error:', tokenData);
        throw new Error('แลก Access Token จากสถาบันไม่สำเร็จ');
    }

    // 2. ดึงโปรไฟล์ผู้ใช้
    const userResponse = await fetch('https://api.science.kmitl.ac.th/iam/oauth2/resource/read:userinfo', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json(); 

    // 3. เข้าสิทธิ์ซูเปอร์ยูสเซอร์เพื่อไปเคลียร์ข้อมูลลงตาราง
    await pbServer.collection('_superusers').authWithPassword(USER_ADMIN, USER_ADMIN_PASSWORD);
    
    let targetUser;
    try {
        targetUser = await pbServer.collection('users').getFirstListItem(`email="${userData.email}"`);
    } catch (e) {
        const secureTempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!'; 
        targetUser = await pbServer.collection('users').create({
            email: userData.email,
            name: userData.name || 'KMITL User',
            username: 'kmitl_' + Math.random().toString(36).substring(2, 7),
            password: secureTempPassword, 
            passwordConfirm: secureTempPassword,
            emailVisibility: true
        });
    }

    // 4. ล้างสิทธิ์แอดมินเก่าออกไปก่อน
    pbServer.authStore.clear();

    // 5. ✅ จุดแก้ไขสำคัญ: ปลอมตัวล็อกอินเป็น User คนนี้เพื่อดึง Token ตัวจริงส่งไปหน้าบ้าน
    // ตัว PocketBase ยินยอมให้สลับล็อกอินได้ผ่านคลาสจำลองเพื่อเอา Token ประจำตัวมาใช้งาน
    const userPb = new PocketBase(POCKETBASE_URL);
    
    // ค้นหาและออก Token ประจำตัวให้ User โดยใช้ฟังก์ชันสร้าง Token ชั่วคราวของระบบ
    const userAuthData = await pbServer.collection('users').authWithPassword(targetUser.email, targetUser.password ? targetUser.password : ''); 
    // หมายเหตุ: หากทำระบบล็อกอินสไตล์โอเพ่นไอดี วิธีที่ปลอดภัยและง่ายที่สุดสำหรับ PocketBase v0.23 
    // คือดึงสิทธิ์คุกกี้ส่งออกผ่านฟังก์ชันจำลองโดยตรงแบบนี้ครับ:
    
    return {
        token: pbServer.authStore.token || userAuthData.token,
        model: targetUser
    };
}