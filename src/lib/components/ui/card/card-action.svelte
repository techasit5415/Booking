<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLElement> & { children?: import('svelte').Snippet } = $props();
</script>

<div
	class={cn('ml-auto self-start', className)}
	data-slot="card-action"
	{...restProps}
>
	{@render children?.()}
</div>
