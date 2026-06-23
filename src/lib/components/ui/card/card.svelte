<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLElement> & { children?: import('svelte').Snippet } = $props();
</script>

<div
	class={cn(
		'bg-card text-card-foreground rounded-lg border shadow-sm',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
