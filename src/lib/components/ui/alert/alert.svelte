<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';
	import { cn } from '$lib/utils.js';

	export const alertVariants = tv({
		base: 'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				destructive:
					'text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
				warning: 'border-amber-500/50 text-amber-600 [&>svg]:text-amber-600 dark:text-amber-400 dark:[&>svg]:text-amber-400',
				success: 'border-emerald-500/50 text-emerald-600 [&>svg]:text-emerald-600 dark:text-emerald-400 dark:[&>svg]:text-emerald-400',
				info: 'border-sky-500/50 text-sky-600 [&>svg]:text-sky-600 dark:text-sky-400 dark:[&>svg]:text-sky-400',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		variant = 'default',
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		variant?: AlertVariant;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
