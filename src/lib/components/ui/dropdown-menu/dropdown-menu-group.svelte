<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let { children, ...restProps }: DropdownMenuPrimitive.GroupProps & { children?: import('svelte').Snippet } = $props();
</script>

<DropdownMenuPrimitive.Group {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Group>
