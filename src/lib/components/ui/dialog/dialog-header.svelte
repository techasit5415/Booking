<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> & { children?: import('svelte').Snippet } = $props();
</script>

<div
	class={cn('flex flex-col gap-2 text-center sm:text-left', className)}
	{...restProps}
>
	{@render children?.()}
</div>
