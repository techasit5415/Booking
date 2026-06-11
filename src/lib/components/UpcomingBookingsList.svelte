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
                        <p class="mt-0.5 truncate text-xs text-zinc-400">
                            {roomLocation}
                        </p>
                        {#if booking.bookerName || booking.bookerEmail || booking.booker_email}
                            <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-300">
                                <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span class="truncate">{booking.bookerName || booking.bookerEmail || booking.booker_email}</span>
                            </p>
                        {/if}
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
