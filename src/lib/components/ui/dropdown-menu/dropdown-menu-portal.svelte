<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let { children, ...restProps }: DropdownMenuPrimitive.PortalProps & { children?: import('svelte').Snippet } = $props();
</script>

<DropdownMenuPrimitive.Portal {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Portal>
