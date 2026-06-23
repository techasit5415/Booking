<script lang="ts">
	import { Select as SelectPrimitive, type SelectSingleRootProps } from 'bits-ui';

	type Props = Omit<SelectSingleRootProps, 'value' | 'open' | 'type'> & {
		class?: string;
		value?: string;
		open?: boolean;
		ref?: HTMLElement | null;
		children?: import('svelte').Snippet;
	};

	let {
		value = $bindable(),
		open = $bindable(false),
		children,
		...restProps
	}: Props = $props();
</script>

<SelectPrimitive.Root type="single" bind:value bind:open {...restProps}>
	{@render children?.()}
</SelectPrimitive.Root>
