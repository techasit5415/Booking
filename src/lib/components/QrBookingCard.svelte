<script lang="ts">
    let { qrCodeDataUrl = '' } = $props();
</script>

<div class="flex flex-col gap-[2vw]">
    <!-- SUB-CARD: QR CODE -->
    <article class="flex flex-1 flex-col items-center justify-center rounded-[2vw] border border-slate-800/80 bg-black p-[2.5vw] text-center shadow-2xl shadow-black/40">
        <h3 class="text-[clamp(16px,2vw,28px)] font-bold text-white tracking-wide">
            ต้องการจองห้องนี้?
        </h3>
        <p class="mt-[0.5vw] text-[clamp(12px,1.3vw,18px)] text-slate-400">
            สแกน QR code เพื่อเปิดหน้าจอง
        </p>

        <div class="mt-[1.5vw] rounded-[1.5vw] bg-white p-[1.5vw] shadow-xl shadow-black/30">
            {#if qrCodeDataUrl}
                <img
                    class="h-[15vw] w-[15vw] min-h-[140px] min-w-[140px] max-h-[240px] max-w-[240px] object-contain"
                    src={qrCodeDataUrl}
                    alt="QR code สำหรับจองห้อง"
                />
            {:else}
                <div class="grid h-[15vw] w-[15vw] min-h-[140px] min-w-[140px] max-h-[240px] max-w-[240px] place-items-center text-[1.2vw] font-semibold text-slate-950 animate-pulse">
                    Loading QR...
                </div>
            {/if}
        </div>

        <div class="mt-[1.5vw] inline-flex rounded-full border border-indigo-500/10 bg-indigo-950/30 px-[1.2vw] py-[0.4vw] text-[clamp(10px,1.1vw,14px)] font-bold tracking-[0.14em] text-indigo-400 uppercase">
            SCAN TO BOOK NOW
        </div>
    </article>

    <!-- SUB-CARD: TIPS -->
    <article class="flex items-start gap-[1vw] rounded-[2vw] border border-indigo-500/10 bg-gradient-to-br from-indigo-950/20 to-black p-[1.8vw] shadow-lg">
        <div class="text-[clamp(18px,2vw,28px)] leading-none select-none">💡</div>
        <div>
            <h4 class="text-[clamp(13px,1.3vw,18px)] font-semibold text-indigo-300">
                ข้อแนะนำการใช้งาน
            </h4>
            <p class="mt-[0.4vw] text-[clamp(11px,1.1vw,16px)] leading-relaxed text-slate-400">
                ถ้าประชุมเสร็จก่อนกำหนด ให้กดคืนห้องในระบบ เพื่อให้คนอื่นใช้งานต่อได้ทันที
            </p>
        </div>
    </article>
</div>