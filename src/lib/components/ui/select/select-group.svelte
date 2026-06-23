<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';

	let { children, ...restProps }: SelectPrimitive.GroupProps & { children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.Group {...restProps}>
	{@render children?.()}
</SelectPrimitive.Group>
