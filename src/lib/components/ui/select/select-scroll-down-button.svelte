<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: SelectPrimitive.ScrollDownButtonProps & { class?: string } = $props();
</script>

<SelectPrimitive.ScrollDownButton
	bind:ref
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}
>
	<ChevronDown class="h-4 w-4" />
</SelectPrimitive.ScrollDownButton>
