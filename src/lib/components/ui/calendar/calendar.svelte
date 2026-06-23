<script lang="ts">
	import { Calendar as CalendarPrimitive, type CalendarSingleRootProps } from 'bits-ui';
	import type { DateValue } from '@internationalized/date';
	import { cn } from '$lib/utils.js';

	type Props = Omit<CalendarSingleRootProps, 'value' | 'type'> & {
		class?: string;
		value?: DateValue;
		ref?: HTMLElement | null;
	};

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<CalendarPrimitive.Root
	bind:ref
	bind:value
	type="single"
	class={cn('p-3', className)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header>
			<CalendarPrimitive.PrevButton />
			<CalendarPrimitive.Heading />
			<CalendarPrimitive.NextButton />
		</CalendarPrimitive.Header>
		<CalendarPrimitive.Grid>
			<CalendarPrimitive.GridHead>
				<CalendarPrimitive.GridRow>
					{#each weekdays as day (day)}
						<CalendarPrimitive.HeadCell>
							{day}
						</CalendarPrimitive.HeadCell>
					{/each}
				</CalendarPrimitive.GridRow>
			</CalendarPrimitive.GridHead>
			<CalendarPrimitive.GridBody>
				{#each months as month (month.value)}
					<CalendarPrimitive.GridRow>
						{#each month.weeks as week, weekIndex (weekIndex)}
							{#each week as day (day)}
								<CalendarPrimitive.Cell date={day} month={month.value}>
									<CalendarPrimitive.Day />
								</CalendarPrimitive.Cell>
							{/each}
						{/each}
					</CalendarPrimitive.GridRow>
				{/each}
			</CalendarPrimitive.GridBody>
		</CalendarPrimitive.Grid>
	{/snippet}
</CalendarPrimitive.Root>
