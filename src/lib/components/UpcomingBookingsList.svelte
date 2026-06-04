<script lang="ts">
    let { upcomingBookings = [], roomLocation = '' } = $props();
</script>

<article class="flex flex-col gap-4 rounded-lg border border-zinc-400 bg-black p-3 dark:border-zinc-800 dark:bg-zinc-950">
    <h3 class="text-[11px] font-semibold tracking-[0.2em] text-white uppercase dark:text-zinc-400">
        คิวถัดไปวันนี้
    </h3>

    <div class="flex flex-col gap-6 overflow-auto pr-1 min-h-0">
        {#if upcomingBookings.length > 0}
            {#each upcomingBookings as booking}
                <div class="flex items-center justify-between gap-4 rounded-md border border-zinc-400  px-4 py-3 dark:border-zinc-800 bg-zinc-900/40">
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-base font-semibold text-zinc-300">
                            {booking.title}
                        </p>
                        <p class="mt-0.5 truncate text-xs text-zinc-300 dark:text-zinc-400">
                            {roomLocation}
                        </p>
                    </div>
                    <span class="shrink-0 rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-['JetBrains_Mono',monospace] text-xs font-medium tabular-nums text-zinc-300 dark:border-zinc-800 bg-zinc-950 ">
                        {booking.startTime} - {booking.endTime}
                    </span>
                </div>
            {/each}
        {:else}
            <div class="rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-300 dark:border-zinc-800 ">
                ไม่มีรายการจองถัดไป
            </div>
        {/if}
    </div>
</article>
