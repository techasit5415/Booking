import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loginWithKmitlCode } from '$lib/pocketbase.server';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');

    if (!code) {
        return json({ error: 'Authorization code missing' }, { status: 400 });
    }

    try {
        // สั่งรันฟังก์ชันยิงตรงที่เราเพิ่งเขียนไปด้านบน
        const authData = await loginWithKmitlCode(code);
        
        // เซ็ตสิทธิ์ Cookie กลับไปที่หน้าบ้าน
        cookies.set('pb_auth', authData.token, { 
            path: '/', 
            httpOnly: false,
            secure: true,
            maxAge: 60 * 60 * 24 * 7
        });

        // ล็อกอินผ่านฉลุย พาไปหน้าแรกของแอปคุณได้เลย
        throw redirect(302, '/dashboard');
    } catch (error) {
        console.error('OAuth Handling Error:', error);
        return json({ error: 'Authentication failed' }, { status: 500 });
    }
};