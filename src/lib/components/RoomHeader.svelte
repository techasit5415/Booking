<script lang="ts">
    let {
        roomName = '',
        roomLocation = '',
        clockText = '',
        dateText = '',
        statusLabel = ''
    } = $props();
</script>

<header class="flex flex-col gap-3 border-b border-zinc-400 pb-1 dark:border-zinc-800 md:flex-row md:items-end md:justify-between h-11">
    <div class="flex flex-col gap-0.1">
    
        <h1 class=" text-2xl font-bold tracking-tight text-white dark:text-zinc-50 md:text-2xl">
            {roomName}
        </h1>
        <p class="text-sm font-medium text-zinc-400  md:text-base">
            {roomLocation}
                        <span class="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
            Room · {statusLabel}
        </p>

    </div>

    <div class="flex flex-col items-start  md:items-end">
        <div class="font-['JetBrains_Mono',monospace] text-1xl font-medium tabular-nums text-white  md:text-3xl">
            {clockText}
        </div>
        <div class="text-xs font-medium text-zinc-400 md:text-sm">
            {dateText}
        </div>
    </div>
</header>
