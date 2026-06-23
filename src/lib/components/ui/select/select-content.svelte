<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import SelectScrollUpButton from './select-scroll-up-button.svelte';
	import SelectScrollDownButton from './select-scroll-down-button.svelte';

	let {
		class: className,
		sideOffset = 4,
		children,
		ref = $bindable(null),
		...restProps
	}: SelectPrimitive.ContentProps & { class?: string; children?: import('svelte').Snippet } = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		bind:ref
		{sideOffset}
		class={cn(
			'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-popover text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
			className
		)}
		{...restProps}
	>
		<SelectScrollUpButton />
		<SelectPrimitive.Viewport class={cn('p-1')}>
			{@render children?.()}
		</SelectPrimitive.Viewport>
		<SelectScrollDownButton />
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
