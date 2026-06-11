import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * หน้า /book ต้อง login ก่อนเสมอ — ถ้ายังไม่ได้ login ให้ redirect ไป /login
 * (เฉพาะหน้า book เท่านั้น หน้าอื่น เช่น room, dashboard เข้าได้ปกติ)
 */
export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        const redirectTo = url.pathname + url.search;
        throw redirect(
            302,
            `/login?redirect=${encodeURIComponent(redirectTo)}`
        );
    }
    return {};
};
