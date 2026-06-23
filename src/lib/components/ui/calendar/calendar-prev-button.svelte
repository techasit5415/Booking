<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { ChevronLeft } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.PrevButtonProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.PrevButton
	bind:ref
	class={cn(
		'ring-offset-background focus-visible:ring-ring absolute left-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if !children}
		<ChevronLeft class="h-4 w-4" />
	{/if}
</CalendarPrimitive.PrevButton>
