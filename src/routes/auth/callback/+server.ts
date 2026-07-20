import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { loginWithKmitlCode } from '$lib/pocketbase.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = cookies.get('iam_oauth_state');

    if (!state || state !== expectedState) {
        throw redirect(302, '/login?error=' + encodeURIComponent('การยืนยันรหัสความปลอดภัย (State) ล้มเหลว กรุณาลองใหม่อีกครั้ง'));
    }

    // Clear state cookie immediately after verification
    cookies.delete('iam_oauth_state', { path: '/' });

    if (!code) {
        // KMITL redirect กลับมาโดยไม่มี code → redirect กลับ login พร้อม error
        throw redirect(302, '/login?error=' + encodeURIComponent('ไม่ได้รับรหัสยืนยันตัวตนจาก KMITL กรุณาลองใหม่'));
    }

    let next = '/book';
    try {
        const authData = await loginWithKmitlCode(code);

        // Get the dynamic redirect path and clean up
        next = cookies.get('iam_oauth_next') || '/book';
        cookies.delete('iam_oauth_next', { path: '/' });

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
        // Clean up next cookie in case of error
        cookies.delete('iam_oauth_next', { path: '/' });
        // login fail → redirect กลับ login พร้อม error message แทนการ return JSON ดิบ
        const message = error instanceof Error ? error.message : 'ล็อกอินไม่สำเร็จ';
        throw redirect(302, '/login?error=' + encodeURIComponent(message));
    }

    throw redirect(302, next);
    
};
