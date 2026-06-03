<script lang="ts">
    // 🚨 รองรับระบบ Runes ของ Svelte 5 รับอาเรย์ข้อมูลห้องมาจากแดชบอร์ดหลัก
    let { roomRows = [] } = $props();
</script>

<div class="w-full overflow-hidden rounded-[1.5vw] border border-slate-800/80 bg-slate-950/40 shadow-2xl">
    <table class="w-full border-collapse text-left">
        <thead>
            <tr class="border-b border-slate-800 bg-slate-900/60 text-[clamp(12px,1.2vw,18px)] font-bold tracking-wider text-slate-400 uppercase">
                <th class="p-[1.5vw]">ชื่อห้อง</th>
                <th class="p-[1.5vw]">สถานะ</th>
                <th class="p-[1.5vw]">กิจกรรมในตอนนี้</th>
                <th class="p-[1.5vw]">เวลา</th>
                <th class="p-[1.5vw]">ผู้จอง</th>
            </tr>
        </thead>
        
        <tbody class="text-[clamp(13px,1.3vw,20px)] text-slate-200 divide-y divide-slate-900">
            {#if roomRows.length > 0}
                {#each roomRows as row}
                    <tr class="transition-colors duration-200 hover:bg-slate-900/30">
                        <td class="p-[1.5vw]">
                            <span class="font-bold text-white">{row.roomName}</span>
                            <span class="block mt-[0.2vw] text-[clamp(11px,1vw,14px)] text-slate-500">{row.roomLocation}</span>
                        </td>
                        
                        <td class="p-[1.5vw]">
                            <div class={`inline-flex items-center gap-[0.4vw] rounded-full border px-[1vw] py-[0.3vw] text-[clamp(11px,1vw,15px)] font-bold tracking-wide ${row.isOccupied ? 'border-red-500/20 bg-red-500/15 text-red-400' : 'border-emerald-500/20 bg-emerald-500/15 text-emerald-400'}`}>
                                <span class={`h-[0.5vw] w-[0.5vw] min-h-[6px] min-w-[6px] rounded-full ${row.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                                {row.isOccupied ? 'กำลังใช้งาน' : 'ว่าง'}
                            </div>
                        </td>
                        
                        <td class="p-[1.5vw] font-medium max-w-[20vw] truncate">
                            {row.currentTitle}
                        </td>
                        
                        <td class="p-[1.5vw] font-mono text-slate-400">
                            {row.timeRange}
                        </td>
                        
                        <td class="p-[1.5vw] text-slate-400">
                            {row.bookerName}
                        </td>
                    </tr>
                {/each}
            {:else}
                <tr>
                    <td colspan="5" class="p-[4vw] text-center text-slate-500 text-[1.2vw] animate-pulse">
                        กำลังดึงข้อมูลระบบห้องประชุมเรียลไทม์...
                    </td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>