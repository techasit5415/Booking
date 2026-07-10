<script lang="ts">
	let {
		displayMonthName,
		currentRoomName,
		clockText,
		dateText,
	}: {
		displayMonthName: string;
		currentRoomName: string;
		clockText: string;
		dateText: string;
	} = $props();
</script>

<div
	class="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between"
>
	<div class="space-y-1">
		<div
			class="text-foreground/60 text-xs font-bold tracking-wider uppercase flex items-center gap-1"
		>
			Room Schedule · {displayMonthName}
		</div>
		<h1 class="text-2xl font-bold tracking-tight text-foreground">
			{currentRoomName}
		</h1>
		<p class="text-foreground/60 text-sm">
			ตารางเวลาการจองใช้งานห้องประชุมรายเดือน
		</p>
	</div>

	<div class="flex flex-col items-start gap-1 md:items-end">
		<div
			class="font-mono text-xl md:text-2xl font-bold text-foreground leading-none"
		>
			{clockText}
		</div>
		<div
			class="text-foreground/45 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-0.5"
		>
			{dateText}
		</div>
	</div>
</div>
