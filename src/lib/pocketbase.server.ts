import { POCKETBASE_URL, USER_ADMIN, USER_ADMIN_PASSWORD, CLIENT_SECRET } from '$env/static/private';
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
            'redirect_uri': 'http://localhost:5173/auth/callback', // เช็คให้ตรงกับหน้าเว็บสถาบันและหน้าบ้าน
            'code': code
        })
    });

    const tokenResponseData = await tokenResponse.json();
    
    // ✅ แก้ไข: ดึงเข้าชั้น .data.access_token ให้ถูกโครงสร้าง JSON จริงของ KMITL
    const accessToken = tokenResponseData?.data?.access_token;

    if (!accessToken) {
        console.error('KMITL Token Error:', tokenResponseData);
        throw new Error('แลก Access Token จากสถาบันไม่สำเร็จ');
    }

    // 2. ดึงข้อมูลผู้ใช้ (endpoint read:userinfo เท่านั้น เพราะ scope ที่ขอแค่ตัวเดียว)
    const userResponse = await fetch('https://api.science.kmitl.ac.th/iam/oauth2/resource/read:userinfo', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const userResponseData = await userResponse.json();
    // รองรับทั้ง {data: {...}} และ {...} ตรงๆ
    const userData = userResponseData?.data ? userResponseData.data : userResponseData;
    console.log('KMITL user data:', userData);

    // รหัสนักศึกษา = prefix ของ email KMITL (เช่น 66050160@kmitl.ac.th → 66050160)
    const studentId = userData.email?.split('@')[0] || '';

    // ชื่อ user — KMITL userinfo ไม่ส่งชื่อมา ใช้ placeholder ที่อ่านได้แทน email prefix ดิบๆ
    // (เมื่อ KMITL admin ลงทะเบียน scope read:profile แล้ว จะกลับมาใช้ชื่อไทยจริง)
    const fullName = userData.name || (studentId ? `นักศึกษา ${studentId}` : 'KMITL User');

    // username ใช้รหัสนักศึกษา (unique ต่อคน) แทน random string
    // fallback เป็น random เฉพาะกรณีที่ email ไม่มี prefix (เช่น staff ที่ใช้ email อื่น)
    const username = studentId || 'kmitl_' + Math.random().toString(36).substring(2, 7);

    // helper: ตรวจว่า name ที่มีอยู่ใน PB เป็น placeholder เก่าที่ควร overwrite หรือไม่
    // (กันไม่ให้ทับชื่อจริงที่ user อาจเคยแก้เอง)
    const isPlaceholder = (n: string | undefined) =>
        !n || n === 'KMITL User' || n.startsWith('นักศึกษา ');

    // 3. เข้าสิทธิ์ซูเปอร์ยูสเซอร์เพื่อไปเคลียร์ข้อมูลลงตาราง PocketBase
    await pbServer.collection('_superusers').authWithPassword(USER_ADMIN, USER_ADMIN_PASSWORD);

    // ค่า user_type ที่จะใส่ให้ user KMITL ทุกคน
    const KMITL_USER_TYPE = '000000000000001';

    let targetUser;
    try {
        targetUser = await pbServer.collection('users').getFirstListItem(`email="${userData.email}"`);
        console.log('พบผู้ใช้เดิมในระบบ:', targetUser.email);

        // sync เฉพาะ field ที่ยังขาด หรือ placeholder เท่านั้น (ไม่ทับชื่อจริงที่ user แก้เอง)
        const needsNameUpdate = isPlaceholder(targetUser.name) && targetUser.name !== fullName;
        const needsTypeUpdate = !targetUser.user_type;
        const updates: Record<string, string> = {};
        if (needsNameUpdate) updates.name = fullName;
        if (needsTypeUpdate) updates.user_type = KMITL_USER_TYPE;

        if (Object.keys(updates).length > 0) {
            targetUser = await pbServer.collection('users').update(targetUser.id, updates);
            console.log('อัพเดทข้อมูลผู้ใช้เดิม:', targetUser.id, '→', Object.keys(updates).join(', '));
        } else {
            console.log('ข้อมูลผู้ใช้เดิมครบแล้ว ไม่ต้องอัพเดท');
        }
    } catch (e) {
        console.log('ไม่พบผู้ใช้เดิม กำลังสร้างบัญชีใหม่...');
        const secureTempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
        targetUser = await pbServer.collection('users').create({
            email: userData.email,
            name: fullName,
            username,
            password: secureTempPassword,
            passwordConfirm: secureTempPassword,
            emailVisibility: true,
            user_type: KMITL_USER_TYPE
        });
        console.log('สร้างบัญชีผู้ใช้ใหม่สำเร็จ:', targetUser.id, '| name:', fullName, '| username:', username, '| user_type:', KMITL_USER_TYPE);
    }

    // 4. ✅ สั่งออก Token ประจำตัวให้สำหรับผู้ใช้คนนี้
    // ❌ ห้ามใช้ authWithOAuth2 บน server: มันพยายามเปิด browser popup ไปที่ PocketBase
    //    (Not in a browser context) — เราเป็น superuser อยู่แล้ว ใช้ impersonate แทน
    //    เพื่อออก token ตรงให้ user เลย ไม่ต้องผ่าน OAuth flow ฝั่ง client
    await pbServer.collection('users').impersonate(
        targetUser.id,
        60 * 60 * 24 * 7 // token อายุ 7 วัน (วินาที)
    );

    // SDK เก็บผลลัพธ์ไว้ใน authStore ฝั่ง client instance (ไม่ใช่ return value)
    const userToken = pbServer.authStore.token;
    const userModel = pbServer.authStore.record;

    // 5. ล้างสิทธิ์แอดมินเก่าออกจากอินสแตนซ์เพื่อความปลอดภัย
    pbServer.authStore.clear();

    // 6. ส่ง Token และ Model กลับไปให้ไฟล์ Callback เซ็ตคุกกี้
    return {
        token: userToken,
        model: userModel
    };
}