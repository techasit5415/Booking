<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLTableSectionElement> & { children?: import('svelte').Snippet } = $props();
</script>

<thead class={cn('[&_tr]:border-b', className)} {...restProps}>
	{@render children?.()}
</thead>
