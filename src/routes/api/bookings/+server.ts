import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? '';
// ✅ เปลี่ยนมาดึงรหัสผ่านแอดมินตรงเพื่อไขระบบ Superuser ตัวใหม่แทนเหรียญ Token ดิบ
const USER_ADMIN = env.USER_ADMIN || '';
const USER_ADMIN_PASSWORD = env.USER_ADMIN_PASSWORD || '';

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

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!PB_URL) {
        throw error(500, 'Server configuration error');
    }

    // 🔒 ระบบดักสิทธิ์ขั้นต้น: ต้องผ่านด่านการล็อกอินของสถาบันมาก่อนเสมอ
    if (!locals.user) {
        throw error(401, 'กรุณาเข้าสู่ระบบก่อนทำการจอง');
    }

    // แกะตรวจสอบฟอร์มข้อมูลที่ยิงมาหน้าเบราว์เซอร์
    const body = await request.json().catch(() => null);
    const result = validateBody(body);
    if (!result.ok) {
        throw error(400, result.error);
    }
    const data = result.data;

    // ✅ ปรับปรุงโครงสร้างเปิดอินสแตนซ์แยกเดี่ยว ป้องกันสายสัญญาณแชร์ชนกันใน RAM
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        // ✅ ยืนยันตัวตนแอดมินผ่านตาราง _superusers เพื่อ bypass กฎการเขียน 'Admin only' ของ PocketBase
        await pb.collection('_superusers').authWithPassword(USER_ADMIN, USER_ADMIN_PASSWORD);
    } catch (adminErr) {
        console.error('❌ พังตรงล็อกอินแอดมินที่ Endpoint:', adminErr);
        throw error(500, 'ระบบภายในไม่สามารถเปิดสิทธิ์ผู้ดูแลเพื่อเขียนจองได้');
    }

    // ตรวจหาห้องประชุม
    try {
        await pb.collection('rooms').getOne(data.roomId);
    } catch {
        throw error(400, 'ไม่พบห้องนี้ในระบบ');
    }

    // จัดวางโครงสร้างคำนวณเวลาเหลื่อมซ้อนทับ (Overlap check)
    const startISO = `${data.date}T${data.startTime}:00+07:00`;
    const endISO = `${data.date}T${data.endTime}:00+07:00`;
    const startMs = Date.parse(startISO);
    const endMs = Date.parse(endISO);

    // ✅ ปรับชุดคำสั่ง Filter ให้คลีน ตัดทิ้งวงเล็บซ้อนที่ระบบ SQL เบื้องหลังแกะค่าพลาดจนพ่น no rows
    const sameDayBookings = await pb.collection('bookings').getFullList({
        filter: `field = "${data.roomId}" && date = "${data.date}" && status != "cancelled"`,
        sort: 'start_time',
    });

    for (const b of sameDayBookings) {
        const bsMs = Date.parse(String(b.start_time).replace(' ', 'T'));
        const beMs = Date.parse(String(b.end_time).replace(' ', 'T'));
        if (Number.isNaN(bsMs) || Number.isNaN(beMs)) continue;
        if (startMs < beMs && endMs > bsMs) {
            throw error(409, `เวลานี้ชนกับการจอง "${b.title}"`);
        }
    }

    // รวมข้อมูลรายละเอียดนักศึกษาจริง ๆ ที่ได้แกะผ่านคุกกี้ระบบ
    const bookerName = locals.user.name || locals.user.email;
    const bookerEmail = locals.user.email;

    let newBooking;
    try {
        // บันทึกแถวข้อมูลลงคลัง PocketBase
        newBooking = await pb.collection('bookings').create({
            field: data.roomId,
            date: data.date,
            start_time: startISO,
            end_time: endISO,
            title: data.title,
            bookerName,
            bookerEmail,
            detailLabel: data.notes || '', // ปล่อยว่างเปล่าได้หากไม่ได้กรอกเพิ่มเติม
            status: 'approved',
        });
    } catch (err: any) {
        console.error('❌ PocketBase Create Failed:', JSON.stringify(err.data, null, 2));
        throw error(400, `สร้าง Record ไม่สำเร็จ: ${err.message}`);
    } finally {
        // ✅ เคลียร์สิทธิ์ออกจากหน่วยความจำของคลาสเสมอเพื่อสุขอนามัยของระบบ
        pb.authStore.clear();
    }

    return json({ success: true, booking: newBooking });
};