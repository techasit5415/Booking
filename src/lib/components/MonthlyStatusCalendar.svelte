<script lang="ts">
    // รับข้อมูลปฏิทินประจำเดือนที่คำนวณเสร็จแล้วมาจากหน้าหลัก
    let { calendarDays = [] } = $props();

    const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
</script>

<div class="w-full rounded-[1.5vw] border border-slate-800/80 bg-slate-950/40 p-[1.5vw] shadow-2xl">
    <div class="grid grid-cols-7 gap-[0.5vw] text-center text-[clamp(11px,1.1vw,16px)] font-bold text-slate-500 uppercase mb-[1vw]">
        {#each daysOfWeek as day}
            <div class="py-[0.5vw]">{day}</div>
        {/each}
    </div>

    <div class="grid grid-cols-7 gap-[0.6vw]">
        {#each calendarDays as day}
            <div class={`min-h-[7.5vw] min-h-[90px] rounded-[1vw] border p-[0.6vw] flex flex-col justify-between transition-all duration-200 
                ${day.isCurrentMonth ? 'bg-black/60' : 'bg-slate-950/20 opacity-25 select-none'} 
                ${day.isToday ? 'border-indigo-500 shadow-lg shadow-indigo-950/20' : 'border-slate-900'}
                hover:border-slate-800`
            }>
                <div class="flex items-center justify-between">
                    <span class={`text-[clamp(11px,1.2vw,18px)] font-bold font-mono
                        ${day.isToday ? 'text-indigo-400 bg-indigo-950/60 px-[0.5vw] py-[0.1vw] rounded-[0.4vw]' : day.isCurrentMonth ? 'text-slate-400' : 'text-slate-600'}`
                    }>
                        {day.dayNumber}
                    </span>
                    
                    {#if day.bookings.length > 0 && day.isCurrentMonth}
                        <span class="h-[0.5vw] w-[0.5vw] rounded-full bg-red-500 animate-pulse"></span>
                    {/if}
                </div>

                <div class="mt-[0.4vw] flex-1 flex flex-col gap-[0.3vw] overflow-y-auto max-h-[11vw] pr-[0.1vw] min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full  [&::-webkit-scrollbar-thumb]:bg-slate-800 hover:[&::-webkit-scrollbar-thumb]:bg-indigo-500/50">
                    {#if day.isCurrentMonth && day.bookings.length > 0}
                        {#each day.bookings as booking}
                            <div class="rounded-[0.4vw] border border-slate-900 bg-slate-950/90 p-[0.4vw] text-left">
                                <p class="text-[clamp(9px,0.9vw,16px)] font-semibold text-slate-200 line-clamp-1 leading-tight ">
                                    {booking.title}
                                </p>
                                <p class="text-[clamp(8px,0.8vw,14px)] font-mono text-slate-500 mt-[0.1vw]">
                                    {booking.time} | {booking.roomName}
                                </p>
                            </div>
                        {/each}
                    {:else if day.isCurrentMonth}
                        <div class="hidden md:flex flex-1 items-center justify-center text-[clamp(9px,0.8vw,14px)] text-slate-800 italic select-none">
                            ว่าง
                        </div>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>