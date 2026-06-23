<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CalendarPrimitive.HeadCellProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<CalendarPrimitive.HeadCell
	bind:ref
	class={cn('text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center', className)}
	{...restProps}
>
	{@render children?.()}
</CalendarPrimitive.HeadCell>
