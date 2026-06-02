<script lang="ts">
    let { 
        bookingViewState = 'idle', 
        currentBooking = { title: '', startTime: '', endTime: '', detailLabel: '', bookerName: '', status: '' }, 
        progressNote = '', 
        progressPercent = 0 
    } = $props();
</script>

<article class={`relative flex min-h-[25vw] flex-col justify-between overflow-hidden rounded-[2vw] border border-slate-800/80 p-[2.5vw] shadow-2xl shadow-black/40 ${bookingViewState === "idle" ? "border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-black to-black" : "border-red-500/15 bg-gradient-to-br from-red-950/40 via-black to-black"}`}>
    <div class={`absolute inset-y-0 left-0 w-[0.8vw] bg-gradient-to-b ${bookingViewState === "idle" ? "from-emerald-400 via-lime-500 to-black" : "from-red-500 via-orange-500 to-black"}`}></div>
    
    <div>
        <div class={`inline-flex items-center gap-[0.5vw] rounded-full border px-[1.2vw] py-[0.4vw] text-[1.1vw] font-bold tracking-[0.12em] ${bookingViewState === "idle" ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300" : "border-red-400/20 bg-red-500/15 text-red-300"}`}>
            <span class={`h-[0.6vw] w-[0.6vw] min-h-[6px] min-w-[6px] animate-pulse rounded-full ${bookingViewState === "idle" ? "bg-emerald-400" : "bg-red-500"}`}></span>
            {bookingViewState === "idle" ? "ว่าง" : currentBooking.status === "pending" ? "รออนุมัติ" : "กำลังใช้งาน"}
        </div>
        
        <h2 class="mt-[1.5vw] text-[clamp(24px,3.8vw,52px)] font-extrabold leading-tight text-white">
            {currentBooking.title}
        </h2>
        <p class="mt-[0.5vw] text-[clamp(18px,2.4vw,32px)] font-medium text-slate-300">
            {currentBooking.startTime} - {currentBooking.endTime}
        </p>
        <p class="mt-[0.8vw] text-[clamp(13px,1.3vw,18px)] text-slate-400">
            {bookingViewState === "idle" ? "ตอนนี้ไม่มีการจอง" : `รายละเอียด: ${currentBooking.detailLabel}`}
        </p>
        <p class="mt-[0.4vw] text-[clamp(13px,1.3vw,18px)] text-slate-400">
            ผู้จอง: {currentBooking.bookerName}
        </p>
    </div>

    <div class="mt-[2vw]">
        <div class="mb-[0.5vw] flex items-center justify-between text-[1.2vw] text-slate-400">
            <span>{progressNote}</span>
            <span class="font-semibold text-orange-400">{progressPercent}%</span>
        </div>
        <div class="h-[0.6vw] min-h-[6px] w-full overflow-hidden rounded-full bg-slate-900">
            <div
                class="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000 ease-out"
                style={`width: ${progressPercent}%`}
            ></div>
        </div>
    </div>
</article>