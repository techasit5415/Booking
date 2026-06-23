<script lang="ts">
	import { Separator as SeparatorPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		orientation = 'horizontal',
		ref = $bindable(null),
		...restProps
	}: SeparatorPrimitive.RootProps & { class?: string } = $props();
</script>

<SeparatorPrimitive.Root
	bind:ref
	class={cn(
		'bg-border shrink-0',
		orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
		className
	)}
	{...restProps}
/>
