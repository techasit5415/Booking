<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';

	let {
		value = $bindable(),
		children,
		...restProps
	}: TabsPrimitive.RootProps & { children?: import('svelte').Snippet } = $props();
</script>

<TabsPrimitive.Root bind:value {...restProps}>
	{@render children?.()}
</TabsPrimitive.Root>
