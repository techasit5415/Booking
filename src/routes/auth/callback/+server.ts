import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { loginWithKmitlCode } from '$lib/pocketbase.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');

    if (!code) {
        // KMITL redirect กลับมาโดยไม่มี code → redirect กลับ login พร้อม error
        throw redirect(302, '/login?error=' + encodeURIComponent('ไม่ได้รับรหัสยืนยันตัวตนจาก KMITL กรุณาลองใหม่'));
    }

    try {
        const authData = await loginWithKmitlCode(code);

        // เก็บใน cookie แค่ token + model — hooks.server.ts เอา token ไป verify กับ PB
        // แล้วดึง user record ของจริง (ไม่เชื่อ model ใน cookie เพราะแก้ได้)
        const cookiePayload = {
            token: authData.token,
            model: authData.model,
        };

        // เซ็ตคุกกี้ชื่อ 'pb_auth' ส่งกลับไปที่เบราว์เซอร์
        // - secure: ใช้ !dev เพื่อให้ localhost dev ใช้ http ได้ แต่ prod บังคับ https
        cookies.set('pb_auth', JSON.stringify(cookiePayload), {
            path: '/',
            secure: !dev,
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7
        });
    } catch (error) {
        console.error('OAuth Handling Error:', error);
        // login fail → redirect กลับ login พร้อม error message แทนการ return JSON ดิบ
        const message = error instanceof Error ? error.message : 'ล็อกอินไม่สำเร็จ';
        throw redirect(302, '/login?error=' + encodeURIComponent(message));
    }

    throw redirect(302, '/book');
    
};
