/**
 * /auth/iam-login — เริ่ม OIDC flow กับ KMITL IAM (server-side)
 *
 * ไม่ใช้ PKCE เพราะ:
 * - IAM docs ไม่พูดถึง code_verifier (ดูเหมือน IAM ใช้ confidential client ล้วน)
 * - PB OIDC config เปิด PKCE ไว้ แต่ PB จัดการเองตอน authWithOAuth2Code
 * - ตอนนี้ SvelteKit ทำหน้าที่แค่ initiate — ไม่ต้องกับ PB flow
 *
 * Flow:
 * 1. Generate state (CSRF) — เก็บใน cookie
 * 2. Build authURL ไป portal.science.kmitl.ac.th + scope=read:userinfo,read:profile
 * 3. 302 redirect ไป IAM
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

const IAM_AUTH_URL = 'https://portal.science.kmitl.ac.th/o/oauth2/auth';
const SCOPE = 'read:userinfo';

const IAM_STATE_COOKIE = 'iam_oauth_state';
const IAM_NEXT_COOKIE = 'iam_oauth_next';

function b64url(buf: Buffer): string {
    return buf.toString('base64url');
}

function safeNextPath(next: string | null): string {
    if (!next) return '/book';
    if (!next.startsWith('/') || next.startsWith('//')) return '/book';
    return next;
}

function tempCookieOptions() {
    return {
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: false, // dev: HTTP localhost
        maxAge: 300,
    };
}

export const GET: RequestHandler = async ({ url, cookies }) => {
    const clientId = env.IAM_CLIENT_ID;
    // const redirectUri = env.IAM_REDIRECT_URI ?? 'http://localhost:5173/auth/iam-callback';
    const redirectUri = env.IAM_REDIRECT_URI ?? 'https://booking.cskmitl.com/auth/iam-callback';

    if (!clientId) {
        throw error(500, 'IAM_CLIENT_ID is not set in .env');
    }

    const next = safeNextPath(url.searchParams.get('next'));

    // State สำหรับ CSRF (ไม่ใช้ PKCE)
    const state = b64url(crypto.randomBytes(16));

    cookies.set(IAM_STATE_COOKIE, state, tempCookieOptions());
    cookies.set(IAM_NEXT_COOKIE, next, tempCookieOptions());

    const authUrl = new URL(IAM_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('state', state);

    console.log('🔐 [iam-login] redirecting to IAM (no PKCE):', authUrl.toString());

    throw redirect(302, authUrl.toString());
};
