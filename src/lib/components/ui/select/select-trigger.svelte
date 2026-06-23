<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: SelectPrimitive.TriggerProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	class={cn(
		'border-input bg-background ring-offset-background data-[placeholder]:text-muted-foreground focus:ring-ring flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDown class="h-4 w-4 opacity-50" />
</SelectPrimitive.Trigger>
