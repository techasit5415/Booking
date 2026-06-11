<script lang="ts">
  function redirectToKmitl() {
    // ❌ จุดผิดที่ทำให้เกิด 400: ห้ามใส่คำว่า /login ต่อท้าย URL เด็ดขาด 
    // โดเมนที่ถูกต้องตามคู่มือแผ่นที่ 1 คือ portal.science.kmitl.ac.th
    const url = new URL('https://portal.science.kmitl.ac.th/o/oauth2/auth');
    
    // 1. ตรวจสอบ Client ID ตัวยาวๆ ของคุณ (ก๊อปปี้จากก้อน Payload รอบที่แล้วมาวางให้ครบ)
    url.searchParams.set('client_id', 'CI0IHz3JNTe7v2SHEr3RkFTdIZgRPFZY.e637637a-5f74-491f-be6e-dfe6e299190c.client.iam.science.kmitl.ac.th');
    
    // 2. ลิงก์จุดนัดพบที่วิ่งกลับมาหาหลังบ้านเรา (ต้องตรงกับที่ลงทะเบียนไว้ในแดชบอร์ดสถาบัน)
    // url.searchParams.set('redirect_uri', 'https://db.cskmitl.com/auth/callback'); 
    url.searchParams.set('redirect_uri', 'http://localhost:5173/auth/callback');
    // 3. กำหนดค่าพารามิเตอร์อื่นๆ ตามมาตรฐาน
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'read:userinfo');
    url.searchParams.set('state', 'any-random-string-123');

    // สั่งย้ายหน้าจอ
    window.location.href = url.toString();
  }
</script>

<button on:click={redirectToKmitl}>Sign in with KMITL Account</button>