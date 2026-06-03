<script lang="ts">
    // รับข้อมูลปฏิทินประจำเดือนที่คำนวณเสร็จแล้วมาจากหน้าหลัก
    let { calendarDays = [] } = $props();

    const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
</script>

<div class="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
    <!-- Day-of-week header -->
    <div class="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
        {#each daysOfWeek as day}
            <div class="py-3 text-center text-[10px] font-semibold tracking-[0.15em] text-zinc-400 uppercase dark:text-zinc-500">
                {day}
            </div>
        {/each}
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7">
        {#each calendarDays as day, i}
            {@const isLastInRow = (i + 1) % 7 === 0}
            {@const isLastRow = i >= 35}
            <div
                class="group min-h-27.5 md:min-h-35 p-3 flex flex-col gap-1.5 transition-colors
                    {!isLastInRow ? 'border-r border-zinc-200 dark:border-zinc-800' : ''}
                    {!isLastRow ? 'border-b border-zinc-200 dark:border-zinc-800' : ''}
                    {day.isCurrentMonth ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}
                    {day.isToday ? 'bg-zinc-50 dark:bg-zinc-900/60' : ''}
                    hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
                <!-- Day number -->
                <div class="flex items-center justify-between">
                    <span
                        class="inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums
                            {day.isToday
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                : day.isCurrentMonth
                                    ? 'text-zinc-700 dark:text-zinc-300'
                                    : 'text-zinc-300 dark:text-zinc-700'}"
                    >
                        {day.dayNumber}
                    </span>

                    {#if day.bookings.length > 0 && day.isCurrentMonth}
                        <span class="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" title="{day.bookings.length} bookings"></span>
                    {/if}
                </div>

                <!-- Bookings list -->
                <div class="flex flex-1 flex-col gap-1 overflow-hidden">
                    {#if day.isCurrentMonth && day.bookings.length > 0}
                        {#each day.bookings.slice(0, 3) as booking}
                            <div class="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-left transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
                                <p class="truncate text-[11px] font-semibold leading-tight text-zinc-800 dark:text-zinc-200">
                                    {booking.title}
                                </p>
                                <p class="mt-0.5 truncate font-['JetBrains_Mono',monospace] text-[10px] leading-tight text-zinc-500 dark:text-zinc-500">
                                    {booking.time}
                                </p>
                            </div>
                        {/each}
                        {#if day.bookings.length > 3}
                            <div class="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">
                                +{day.bookings.length - 3} more
                            </div>
                        {/if}
                    {:else if day.isCurrentMonth}
                        <div class="hidden flex-1 items-center justify-center text-[10px] italic text-zinc-300 md:flex dark:text-zinc-700">
                            ว่าง
                        </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>
