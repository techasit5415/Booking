<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.HeaderProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.Header
	bind:ref
	class={cn('flex justify-center pt-1 pb-3 items-center relative', className)}
	{...restProps}
>
	{@render children?.()}
</CalendarPrimitive.Header>
