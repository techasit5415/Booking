<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';

	let {
		open = $bindable(false),
		children,
		...restProps
	}: PopoverPrimitive.RootProps & { children?: import('svelte').Snippet } = $props();
</script>

<PopoverPrimitive.Root bind:open {...restProps}>
	{@render children?.()}
</PopoverPrimitive.Root>
