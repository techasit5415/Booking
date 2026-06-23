<script lang="ts">
	let {
		roomName = '',
		roomLocation = '',
		clockText = '',
		dateText = '',
		statusLabel = ''
	} = $props();
</script>

<header
	class="border-border flex flex-col gap-3 border-b pb-1 md:flex-row md:items-end md:justify-between h-11"
>
	<div class="flex flex-col gap-0.5">
		<h1 class="text-2xl font-bold tracking-tight md:text-2xl">
			{roomName}
		</h1>
		<p class="text-muted-foreground text-sm font-medium md:text-base">
			{roomLocation}
			<span class="bg-muted-foreground/50 mx-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"></span>
			Room · {statusLabel}
		</p>
	</div>

	<div class="flex flex-col items-start md:items-end">
		<div class="font-mono text-xl font-medium tabular-nums md:text-3xl">
			{clockText}
		</div>
		<div class="text-muted-foreground text-xs font-medium md:text-sm">
			{dateText}
		</div>
	</div>
</header>