<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.HeadingProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.Heading
	bind:ref
	class={cn('text-sm font-medium', className)}
	{...restProps}
>
	{@render children?.()}
</CalendarPrimitive.Heading>
