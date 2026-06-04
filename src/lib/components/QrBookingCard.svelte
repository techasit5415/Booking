<script lang="ts">
    let { qrCodeDataUrl = '' } = $props();
</script>

<div class="flex flex-col gap-2">
    <!-- QR Card -->
    <article class="flex flex-col items-center gap-1 rounded-lg border border-zinc-400 bg-black p-1 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div class="flex flex-col gap-1">
            <h3 class="text-xl font-bold tracking-tight text-white dark:text-zinc-50">
                ต้องการจองห้องนี้?
            </h3>
            <p class="text-xs text-zinc-300">
                สแกน QR code เพื่อเปิดหน้าจอง
            </p>
        </div>

        <div class="rounded-md border border-zinc-200 bg-black p-1 dark:border-zinc-800">
            {#if qrCodeDataUrl}
                <img
                    class="h-10 w-30 md:h-44 md:w-44 object-contain"
                    src={qrCodeDataUrl}
                    alt="QR code สำหรับจองห้อง"
                />
            {:else}
                <div class="grid h-10 w-30 md:h-44 md:w-44 place-items-center text-sm font-semibold text-white dark:text-zinc-500">
                    Loading...
                </div>
            {/if}
        </div>

        <div class="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase ">
            Scan to book
        </div>
    </article>

    <!-- Tips -->
    <article class="flex flex-col gap-0.5 rounded-lg border border-zinc-400 bg-black p-1 dark:border-zinc-800 dark:bg-zinc-900/40 ">
        <h4 class="text-sm font-semibold tracking-[0.15em] text-white uppercase dark:text-zinc-300 ml-1">
             ข้อแนะนำ
        </h4>
        <p class="text-xs leading-relaxed text-zinc-300 dark:text-zinc-400 ">
            ถ้าประชุมเสร็จก่อนกำหนด ให้กดคืนห้องในระบบ เพื่อให้คนอื่นใช้งานต่อได้ทันที
        </p>
    </article>
</div>
