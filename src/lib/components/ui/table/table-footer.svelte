<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLTableSectionElement> & { children?: import('svelte').Snippet } = $props();
</script>

<tfoot
	class={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
	{...restProps}
>
	{@render children?.()}
</tfoot>
