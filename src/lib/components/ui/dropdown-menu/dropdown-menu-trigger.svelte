<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let { children, ...restProps }: DropdownMenuPrimitive.TriggerProps & { children?: import('svelte').Snippet } = $props();
</script>

<DropdownMenuPrimitive.Trigger {...restProps}>
	{@render children?.()}
</DropdownMenuPrimitive.Trigger>
