<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		inset,
		ref = $bindable(null),
		children,
		...restProps
	}: DropdownMenuPrimitive.ItemProps & {
		class?: string;
		children?: import('svelte').Snippet;
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	class={cn(
		"data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:size-4 [&_svg]:shrink-0",
		inset && 'pl-8',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</DropdownMenuPrimitive.Item>
