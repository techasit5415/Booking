<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: CalendarPrimitive.DayProps & { class?: string } = $props();
</script>

<CalendarPrimitive.Day
	bind:ref
	class={cn(
		"data-[outside-month]:text-muted-foreground/50 data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[unavailable]:text-muted-foreground data-[unavailable]:line-through data-[today]:bg-accent data-[today]:text-accent-foreground inline-flex h-8 w-8 flex-1 items-center justify-center rounded-md text-sm font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
		className
	)}
	{...restProps}
/>
