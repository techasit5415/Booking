<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.GridRowProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.GridRow bind:ref class={cn('flex w-full mt-2', className)} {...restProps}>
	{@render children?.()}
</CalendarPrimitive.GridRow>
