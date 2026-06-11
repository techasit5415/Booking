/**
 * /api/bookings — server endpoint สำหรับจัดการ bookings
 *
 * ต้อง login ก่อน (ผ่าน pb_auth cookie) — ใช้ชื่อ/อีเมลผู้จองจาก session
 * เขียนลง PocketBase ด้วย admin token (หรือ createRule ของ collection)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
const PB_ADMIN_TOKEN = env.POCKETBASE_ADMIN_TOKEN ?? '';

// === Validation helpers ===
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidRoomId(s: string): boolean {
    return typeof s === 'string' && SAFE_ID.test(s);
}
function isValidDate(s: string): boolean {
    return typeof s === 'string' && DATE.test(s);
}
function isValidTime(s: string): boolean {
    return typeof s === 'string' && TIME.test(s);
}

type CreateBookingBody = {
    roomId: string;
    date: string;
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM
    title: string;
    notes?: string;
};

function validateBody(b: any): { ok: true; data: CreateBookingBody } | { ok: false; error: string } {
    if (!b || typeof b !== 'object') return { ok: false, error: 'Invalid body' };
    const { roomId, date, startTime, endTime, title, notes } = b;

    if (!isValidRoomId(roomId)) return { ok: false, error: 'Invalid roomId' };
    if (!isValidDate(date)) return { ok: false, error: 'Invalid date' };
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return { ok: false, error: 'Invalid time format' };
    }
    if (startTime >= endTime) {
        return { ok: false, error: 'เวลาเริ่มต้องน้อยกว่าเวลาจบ' };
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
        return { ok: false, error: 'กรุณากรอกหัวข้อการจอง' };
    }
    if (title.length > 200) {
        return { ok: false, error: 'หัวข้อยาวเกิน 200 ตัวอักษร' };
    }
    if (notes && typeof notes === 'string' && notes.length > 500) {
        return { ok: false, error: 'รายละเอียดยาวเกิน 500 ตัวอักษร' };
    }

    return {
        ok: true,
        data: {
            roomId,
            date,
            startTime,
            endTime,
            title: title.trim(),
            notes: typeof notes === 'string' ? notes.trim() : '',
        },
    };
}

/** สร้าง PB client — ใช้ admin token ถ้ามี ไม่งั้นใช้ anonymous (ต้องพึ่ง createRule) */
function getPb(): PocketBase {
    if (!PB_URL) {
        throw new Error('POCKETBASE_URL is not set in .env');
    }
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    if (PB_ADMIN_TOKEN) {
        pb.authStore.save(PB_ADMIN_TOKEN, null);
    }
    return pb;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!PB_URL) {
        throw error(500, 'Server configuration error');
    }

    // ต้อง login ก่อน — เอาชื่อ/อีเมลจาก session (hook.server.ts ตรวจ cookie ให้แล้ว)
    if (!locals.user) {
        throw error(401, 'กรุณาเข้าสู่ระบบก่อนทำการจอง');
    }

    // Validate body
    const body = await request.json().catch(() => null);
    const result = validateBody(body);
    if (!result.ok) {
        throw error(400, result.error);
    }
    const data = result.data;

    const pb = getPb();

    try {
        await pb.collection('rooms').getOne(data.roomId);
    } catch {
        throw error(400, 'ไม่พบห้องนี้ในระบบ');
    }

    // Overlap check
    const startISO = `${data.date}T${data.startTime}:00+07:00`;
    const endISO = `${data.date}T${data.endTime}:00+07:00`;
    const startMs = Date.parse(startISO);
    const endMs = Date.parse(endISO);

    const sameDayBookings = await pb.collection('bookings').getFullList({
        filter: `field = "${data.roomId}" && date = "${data.date}" && (status = "approved" || status = "confirmed" || status = "pending")`,
        sort: 'start_time',
    });

    for (const b of sameDayBookings) {
        if (b.status === 'cancelled') continue;
        const bsMs = Date.parse(String(b.start_time).replace(' ', 'T'));
        const beMs = Date.parse(String(b.end_time).replace(' ', 'T'));
        if (Number.isNaN(bsMs) || Number.isNaN(beMs)) continue;
        if (startMs < beMs && endMs > bsMs) {
            throw error(409, `เวลานี้ชนกับการจอง "${b.title}"`);
        }
    }

    // ผูก booking กับ user ที่ login (มาจาก PB ผ่าน hook → authRefresh แล้ว แก้ไม่ได้)
    const bookerName = locals.user.name || locals.user.email;
    const bookerEmail = locals.user.email;

    let newBooking;
    try {
        newBooking = await pb.collection('bookings').create({
            field: data.roomId,
            date: data.date,
            start_time: startISO,
            end_time: endISO,
            title: data.title,
            bookerName,
            bookerEmail,
            // ✅ detailLabel คือ "รายละเอียดเพิ่มเติม/notes" ไม่ใช่ชื่อคนจอง
            detailLabel: data.notes,
            status: 'approved',
        });
    } catch (err: any) {
        console.error('❌ PocketBase Create Failed:', JSON.stringify(err.data, null, 2));
        throw error(400, `สร้าง Record ไม่สำเร็จ: ${JSON.stringify(err.data?.data || err.message)}`);
    }

    return json({ success: true, booking: newBooking });
};
