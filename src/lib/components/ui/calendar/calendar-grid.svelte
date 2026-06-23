<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.GridProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.Grid
	bind:ref
	class={cn('w-full border-collapse space-y-1', className)}
	{...restProps}
>
	{@render children?.()}
</CalendarPrimitive.Grid>
