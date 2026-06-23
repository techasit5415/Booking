<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.GridHeadProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.GridHead bind:ref class={cn('[&>tr]:flex', className)} {...restProps}>
	{@render children?.()}
</CalendarPrimitive.GridHead>
