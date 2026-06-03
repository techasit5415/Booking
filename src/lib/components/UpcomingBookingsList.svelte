<script lang="ts">
    let { upcomingBookings = [], roomLocation = '' } = $props();
</script>

<article class="flex flex-col rounded-[2vw] border border-slate-800/80 bg-black p-[2vw] shadow-xl shadow-black/20">
    <h3 class="mb-[1vw] text-[1.2vw] font-semibold tracking-[0.16em] text-slate-400 uppercase">
        คิวถัดไปวันนี้
    </h3>
    
    <div class="space-y-[1vw] overflow-auto pr-[0.5vw] min-h-0">
        {#if upcomingBookings.length > 0}
            {#each upcomingBookings as booking}
                <div class="flex items-center justify-between gap-[1.5vw] rounded-[1.5vw] border border-slate-800 bg-slate-950 px-[1.5vw] py-[1.2vw]">
                    <div>
                        <p class="text-[clamp(14px,1.5vw,22px)] font-semibold text-white">
                            {booking.title}
                        </p>
                        <p class="mt-[0.2vw] text-[clamp(11px,1.1vw,16px)] text-slate-400">
                            ห้อง: {roomLocation}
                        </p>
                    </div>
                    <span class="shrink-0 rounded-[0.8vw] bg-slate-900 border border-slate-800 px-[1.2vw] py-[0.4vw] text-[clamp(11px,1.1vw,16px)] font-medium text-slate-300">
                        {booking.startTime} - {booking.endTime}
                    </span>
                </div>
            {/each}
        {:else}
            <div class="rounded-[1.5vw] border border-dashed border-slate-800 px-[1.5vw] py-[3vw] text-center text-[clamp(12px,1.3vw,18px)] text-slate-500">
                ไม่มีรายการจองถัดไป
            </div>
        {/if}
    </div>
</article>