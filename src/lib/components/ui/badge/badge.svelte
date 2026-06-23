<script lang="ts" module>
	import { cn } from '$lib/utils.js';
	import { tv, type VariantProps } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-hidden',
		variants: {
			variant: {
				default:
					'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
				success:
					'border-transparent bg-emerald-500 text-white shadow hover:bg-emerald-500/80',
				warning:
					'border-transparent bg-amber-500 text-white shadow hover:bg-amber-500/80',
				info: 'border-transparent bg-sky-500 text-white shadow hover:bg-sky-500/80',
				outline: 'text-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		variant = 'default',
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		variant?: BadgeVariant;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
