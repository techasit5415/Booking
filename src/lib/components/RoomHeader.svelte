<script lang="ts">
    let {
        roomName = '',
        roomLocation = '',
        clockText = '',
        dateText = '',
        statusLabel = ''
    } = $props();
</script>

<header class="flex flex-col gap-6 border-b border-zinc-200 pb-2 dark:border-zinc-800 md:flex-row md:items-end md:justify-between h-17">
    <div class="flex flex-col gap-0.1">
        <div class="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            <span class="inline-block h-1 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
            Room · {statusLabel}
        </div>
        <h1 class=" text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
            {roomName}
        </h1>
        <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400 md:text-base">
            {roomLocation}
        </p>
    </div>

    <div class="flex flex-col items-start  md:items-end">
        <div class="font-['JetBrains_Mono',monospace] text-1xl font-medium tabular-nums text-zinc-900 dark:text-zinc-100 md:text-3xl">
            {clockText}
        </div>
        <div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 md:text-sm">
            {dateText}
        </div>
    </div>
</header>
