<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.CellProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.Cell
	bind:ref
	class={cn(
		"p-0 [&:has([data-today])]:bg-accent [&:has([data-selected])]:bg-accent relative flex-1 text-center text-sm aspect-square size-auto select-none",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</CalendarPrimitive.Cell>
