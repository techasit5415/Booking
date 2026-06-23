<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLHeadingElement> & { children?: import('svelte').Snippet } = $props();
</script>

<h5
	data-slot="alert-title"
	class={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
	{...restProps}
>
	{@render children?.()}
</h5>
