<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: TabsPrimitive.ContentProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<TabsPrimitive.Content
	bind:ref
	class={cn('focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-hidden', className)}
	{...restProps}
>
	{@render children?.()}
</TabsPrimitive.Content>
