<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.GridBodyProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.GridBody bind:ref class={cn(className)} {...restProps}>
	{@render children?.()}
</CalendarPrimitive.GridBody>
