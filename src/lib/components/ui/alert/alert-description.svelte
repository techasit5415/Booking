<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLParagraphElement> & { children?: import('svelte').Snippet } = $props();
</script>

<div
	data-slot="alert-description"
	class={cn(
		'col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
