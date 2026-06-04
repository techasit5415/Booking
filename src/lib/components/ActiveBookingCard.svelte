<script lang="ts">
    let {
        bookingViewState = 'idle',
        currentBooking = { title: '', startTime: '', endTime: '', detailLabel: '', bookerName: '', status: '' },
        progressNote = '',
        progressPercent = 0
    } = $props();

    // กำหนดสีของ article (border + background gradient)
    function getArticleClass(state: string, status: string): string {
        if (state === 'idle') return 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-black to-black';
        if (status === 'pending') return 'border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-black to-black';
        return 'border-red-500/15 bg-gradient-to-br from-red-950/40 via-black to-black';
    }

    function getStatusBarClass(state: string, status: string): string {
        if (state === 'idle') return 'bg-gradient-to-b from-emerald-400 via-lime-500 to-black';
        if (status === 'pending') return 'bg-gradient-to-b from-amber-400 via-orange-500 to-black';
        return 'bg-gradient-to-b from-red-500 via-orange-500 to-black';
    }

    function getStatusDotClass(state: string, status: string): string {
        if (state === 'idle') return 'bg-emerald-500 dark:bg-emerald-400';
        if (status === 'pending') return 'bg-amber-500 dark:bg-amber-400';
        return 'bg-red-500 dark:bg-red-400';
    }

    // text color ของ title และรายละเอียด (ต้องเป็นสีอ่อน เพราะ bg เป็น dark gradient)
    const TITLE_CLASS = 'text-white';
    const SUBTITLE_CLASS = 'text-zinc-300';
    const META_CLASS = 'text-zinc-400';
</script>

<article class="relative flex min-h-10 flex-col justify-between border-zinc-300 gap-1 overflow-hidden rounded-lg border p-3.5 shadow-2xl shadow-white/20 {getArticleClass(bookingViewState, currentBooking.status)}">
    <!-- แถบสีสถานะ (left bar) -->
    <div
        class="absolute inset-y-0 left-0 w-1 {getStatusBarClass(bookingViewState, currentBooking.status)}"
        aria-hidden="true"
    ></div>

    <!-- Status + Title -->
    <div class="flex flex-col gap-1 ">
        <div class="inline-flex w-fit items-center gap-1 rounded-md border border-zinc-600 bg-white/5 px-3 py-1.5 text-[11px] font-semibold tracking-[0.15em] text-zinc-200 uppercase backdrop-blur-sm">
            <span class="inline-block h-1.5 w-1.5 rounded-full {getStatusDotClass(bookingViewState, currentBooking.status)}"></span>
            {bookingViewState === "idle" ? "ว่าง" : currentBooking.status === "pending" ? "รออนุมัติ" : "กำลังใช้งาน"}
        </div>

        <div>
            <h2 class="text-2xl font-bold leading-tight tracking-tight {TITLE_CLASS} md:text-4xl mt-1.5">
                {currentBooking.title} 
                <span class="ml-9 text-2xl font-medium {SUBTITLE_CLASS}">
                    ({currentBooking.startTime} - {currentBooking.endTime})
                </span>
            </h2>
            {#if bookingViewState === "idle"}
                <p class="mt-2 text-2xl {META_CLASS}">
                    
                </p>
            {:else}
       
                <p class="mt-0.1 text-sm {META_CLASS}">
                    รายละเอียด: {currentBooking.detailLabel}
                </p>
                <p class="mt-0.5 text-sm {META_CLASS}">
                    ผู้จอง: {currentBooking.bookerName}
                </p>
            {/if}
        </div>
    </div>

    <!-- Progress -->
    <div class="flex flex-col gap-1">
        <div class=" flex items-center justify-between text-xs font-medium {META_CLASS}">
            <span>{progressNote}</span>
            <span class="font-['JetBrains_Mono',monospace] tabular-nums text-zinc-100">{progressPercent}%</span>
        </div>
        <div class="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
                class="h-full rounded-full bg-white/90 transition-all duration-700 ease-out"
                style={`width: ${progressPercent}%`}
            ></div>
        </div>
    </div>
</article>
