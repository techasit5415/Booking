<script lang="ts">
  import { page } from '$app/state';

  // ดึง error message จาก query param (?error=...) ถ้ามี
  const errorMessage = page.url.searchParams.get('error');

  function redirectToKmitl() {
    // ❌ จุดผิดที่ทำให้เกิด 400: ห้ามใส่คำว่า /login ต่อท้าย URL เด็ดขาด
    // โดเมนที่ถูกต้องตามคู่มือแผ่นที่ 1 คือ portal.science.kmitl.ac.th
    const url = new URL('https://portal.science.kmitl.ac.th/o/oauth2/auth');

    // 1. ตรวจสอบ Client ID ตัวยาวๆ ของคุณ (ก๊อปปี้จากก้อน Payload รอบที่แล้วมาวางให้ครบ)
    url.searchParams.set('client_id', 'CI0IHz3JNTe7v2SHEr3RkFTdIZgRPFZY.e637637a-5f74-491f-be6e-dfe6e299190c.client.iam.science.kmitl.ac.th');

    // 2. ลิงก์จุดนัดพบที่วิ่งกลับมาหาหลังบ้านเรา (ต้องตรงกับที่ลงทะเบียนไว้ในแดชบอร์ดสถาบัน)
    // url.searchParams.set('redirect_uri', 'https://db.cskmitl.com/auth/callback');
    // url.searchParams.set('redirect_uri', 'http://localhost:5173/auth/callback');
    url.searchParams.set('redirect_uri', 'https://booking.cskmitl.com/auth/callback');
    // 3. กำหนดค่าพารามิเตอร์อื่นๆ ตามมาตรฐาน
    url.searchParams.set('response_type', 'code');
    // OAuth scope
    // - read:userinfo  → id, email, role (ใช้งานได้)
    // - read:profile   → title, firstname_th, lastname_th ฯลฯ (ชั่วคราวปิดไว้ก่อน
    //                    เพราะ KMITL auth server ตอบ 400 + body stream already read
    //                    ต้องเช็ค KMITL admin ว่าลงทะเบียน scope นี้หรือยัง)
    url.searchParams.set('scope', 'read:userinfo,read:profile');
    url.searchParams.set('state', 'any-random-string-123');

    // สั่งย้ายหน้าจอ
    window.location.href = url.toString();
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
  <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">ยินดีต้อนรับ</h1>
      <p class="text-gray-600 dark:text-gray-400">ระบบจองห้องเรียน คณะวิทยาศาสตร์ สจล.</p>
    </div>

    {#if errorMessage}
      <div role="alert" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{errorMessage}</span>
      </div>
    {/if}

    <button
      onclick={redirectToKmitl}
      class="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
      </svg>
      Sign in with KMITL Account
    </button>

    <p class="text-xs text-center text-gray-500 dark:text-gray-400">
      ล็อกอินด้วยบัญชี KMITL ของท่าน (@kmitl.ac.th)
    </p>
  </div>
</div>
