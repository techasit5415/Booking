<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';

	let { children, ...restProps }: PopoverPrimitive.CloseProps & { children?: import('svelte').Snippet } = $props();
</script>

<PopoverPrimitive.Close {...restProps}>
	{@render children?.()}
</PopoverPrimitive.Close>
