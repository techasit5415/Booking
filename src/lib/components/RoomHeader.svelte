<script lang="ts">
    let { 
        roomName = '', 
        roomLocation = '', 
        clockText = '', 
        dateText = '', 
        statusLabel = '' 
    } = $props();
</script>

<header class="flex flex-col gap-[1.5vw] border-b border-slate-800/80 pb-[1.5vw] md:flex-row md:items-center md:justify-between">
    <div class="flex items-center gap-[1.5vw]">
        <div class="rounded-[1vw] bg-indigo-600 px-[1.5vw] py-[0.8vw] text-[1.2vw] font-extrabold tracking-[0.16em] text-white shadow-lg shadow-indigo-950/30">
            ROOM
        </div>
        <div>
            <h1 class="text-[clamp(24px,3.5vw,48px)] font-bold text-white leading-none">
                {roomName}
            </h1>
            <p class="mt-[0.3vw] text-[clamp(13px,1.2vw,18px)] text-slate-400">
                ห้อง: {roomLocation}
            </p>
        </div>
    </div>

    <div class="text-left md:text-right pr-[4vw]">
        <div class="text-[clamp(36px,5vw,68px)] font-extrabold leading-none text-indigo-300 tracking-tight">
            {clockText}
        </div>
        <div class="mt-[0.5vw] text-[clamp(13px,1.2vw,18px)] text-slate-400">
            {dateText}
        </div>
        <div class="mt-[0.5vw] inline-flex rounded-full border border-indigo-400/20 bg-slate-950/80 px-[1vw] py-[0.2vw] text-[1vw] font-bold tracking-[0.14em] text-indigo-300">
            {statusLabel}
        </div>
    </div>
</header>