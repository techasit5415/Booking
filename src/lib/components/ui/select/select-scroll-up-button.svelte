<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronUp } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: SelectPrimitive.ScrollUpButtonProps & { class?: string } = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	class={cn('flex cursor-default items-center justify-center py-1', className)}
	{...restProps}
>
	<ChevronUp class="h-4 w-4" />
</SelectPrimitive.ScrollUpButton>
