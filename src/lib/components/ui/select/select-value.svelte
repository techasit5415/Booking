<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';

	let { children, ...restProps }: SelectPrimitive.ValueProps & { children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.Value {...restProps}>
	{@render children?.()}
</SelectPrimitive.Value>
