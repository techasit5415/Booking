import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loginWithKmitlCode } from '$lib/pocketbase.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');

    if (!code) {
        return json({ error: 'Authorization code missing' }, { status: 400 });
    }

    // ประกาศตัวแปรไว้ข้างนอกเพื่อส่งผ่านข้อมูล
    let loginSuccess = false;

    try {
        const authData = await loginWithKmitlCode(code);
        
        // สร้างก้อนข้อมูล Cookie รูปแบบมาตรฐานที่ PocketBase หน้าบ้านแกะอ่านได้ทันที
        const cookiePayload = {
            token: authData.token,
            model: authData.model
        };

        // เซ็ตคุกกี้ชื่อ 'pb_auth' ส่งกลับไปที่เบราว์เซอร์
        cookies.set('pb_auth', JSON.stringify(cookiePayload), { 
            path: '/', 
            // เปลี่ยนเป็น false ชั่วคราวเพื่อให้รันบน localhost ช่วงพัฒนาได้ไม่ติดปัญหาข้ามสายโปรโตคอล
            // หากขึ้นระบบจริงบน https ค่อยเปลี่ยนกลับเป็น true ได้ครับ
            secure: false, 
            httpOnly: false, 
            maxAge: 60 * 60 * 24 * 7 
        });

        loginSuccess = true;
    } catch (error) {
        console.error('OAuth Handling Error:', error);
        return json({ error: 'Authentication failed' }, { status: 500 });
    }

    // ✅ ย้ายออกมายิงข้างนอกบล็อก Try-Catch เพื่อไม่ให้ SvelteKit สับสน
    if (loginSuccess) {
        throw redirect(302, '/book');
    }
    
    return json({ error: 'Unknown process error' }, { status: 500 });
};