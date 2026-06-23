<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { Check } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: SelectPrimitive.ItemProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.Item
	bind:ref
	class={cn(
		"data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{#snippet children({ selected, highlighted })}
		<span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if selected}
				<Check class="h-4 w-4" />
			{/if}
		</span>
		{@render children?.({ selected, highlighted })}
	{/snippet}
</SelectPrimitive.Item>
