<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: TabsPrimitive.ListProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<TabsPrimitive.List
	bind:ref
	class={cn(
		'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</TabsPrimitive.List>
