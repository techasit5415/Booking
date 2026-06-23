<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Props = HTMLInputAttributes & {
		class?: string;
		value?: string | number;
		ref?: HTMLInputElement | null;
	};

	let { class: className, value = $bindable(), ref = $bindable(), ...restProps }: Props = $props();
</script>

<input
	bind:this={ref}
	class={cn(
		'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}
/>
