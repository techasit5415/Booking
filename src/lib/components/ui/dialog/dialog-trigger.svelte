<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';

	let { children, ...restProps }: DialogPrimitive.TriggerProps & { children?: import('svelte').Snippet } = $props();
</script>

<DialogPrimitive.Trigger {...restProps}>
	{@render children?.()}
</DialogPrimitive.Trigger>
