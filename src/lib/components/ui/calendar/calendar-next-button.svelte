<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { ChevronRight } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.NextButtonProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.NextButton
	bind:ref
	class={cn(
		'ring-offset-background focus-visible:ring-ring absolute right-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if !children}
		<ChevronRight class="h-4 w-4" />
	{/if}
</CalendarPrimitive.NextButton>
