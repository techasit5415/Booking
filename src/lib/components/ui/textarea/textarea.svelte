<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Props = HTMLTextareaAttributes & {
		class?: string;
		value?: string;
		ref?: HTMLTextAreaElement | null;
	};

	let { class: className, value = $bindable(), ref = $bindable(), ...restProps }: Props = $props();
</script>

<textarea
	bind:this={ref}
	class={cn(
		'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}
></textarea>