<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { children, ...restProps }: DialogPrimitive.CloseProps & { children?: import('svelte').Snippet } = $props();
</script>

<DialogPrimitive.Close {...restProps}>
	{@render children?.()}
</DialogPrimitive.Close>
