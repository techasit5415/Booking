<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children,
		...restProps
	}: SelectPrimitive.GroupHeadingProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.GroupHeading
	class={cn('px-2 py-1.5 text-sm font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.GroupHeading>
