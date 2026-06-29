<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	interface BookingDisplayItem {
		title: string;
		time: string;
		roomName: string;
	}

	interface CalendarDay {
		dateKey: string;
		dayNumber: number;
		isCurrentMonth: boolean;
		isToday: boolean;
		bookings: BookingDisplayItem[];
	}

	interface Props {
		calendarDays?: CalendarDay[];
	}

	let { calendarDays = [] }: Props = $props();

	const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
</script>

<Card.Root class="gap-0 overflow-hidden p-0 border border-zinc-200 dark:border-zinc-850 bg-card shadow-xs rounded-xl">
	<!-- Day-of-week header -->
	<div class="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 grid grid-cols-7 border-b">
		{#each daysOfWeek as day}
			<div class="text-zinc-650 dark:text-zinc-400 py-3.5 text-center text-xs font-bold tracking-wider font-['Prompt',sans-serif]">
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar Grid of Cells -->
	<div class="grid grid-cols-7 divide-x divide-y divide-zinc-200/50 dark:divide-zinc-850/50 border-t border-l border-zinc-200/50 dark:border-zinc-850/50">
		{#each calendarDays as day, i (day.dateKey)}
			<div
				class={cn(
					'group flex min-h-[110px] flex-col gap-1.5 p-3 transition-colors duration-250 relative',
					day.isCurrentMonth ? 'bg-card' : 'bg-zinc-50/30 dark:bg-zinc-950/10',
					day.isToday && 'bg-indigo-50/20 dark:bg-indigo-950/10 ring-1 ring-indigo-600/20 z-10',
					'hover:bg-zinc-50/40 dark:hover:bg-zinc-850/40'
				)}
			>
				<!-- Day Header inside cell -->
				<div class="flex items-center justify-between">
					{#if day.isToday}
						<Badge class="h-5 min-w-5 justify-center rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold tabular-nums px-1">
							{day.dayNumber}
						</Badge>
					{:else}
						<span
							class={cn(
								'inline-flex h-5 min-w-5 items-center justify-center rounded text-xs font-semibold tabular-nums',
								day.isCurrentMonth ? 'text-zinc-850 dark:text-zinc-200' : 'text-zinc-400/40'
							)}
						>
							{day.dayNumber}
						</span>
					{/if}

					<!-- Small point when there is any booking in cell -->
					{#if day.bookings.length > 0 && day.isCurrentMonth}
						<span
							class="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
							title="{day.bookings.length} รายการจอง"
						></span>
					{/if}
				</div>

				<!-- Bookings Schedule List -->
				<div class="flex flex-1 flex-col gap-1 overflow-hidden">
					{#if day.isCurrentMonth && day.bookings.length > 0}
						{#each day.bookings.slice(0, 3) as booking, bi (bi)}
							<div class="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800 rounded px-2 py-0.5 text-left transition-colors duration-150">
								<p class="truncate text-[11px] font-bold leading-normal text-zinc-800 dark:text-zinc-200 font-['Prompt',sans-serif]">
									{booking.title}
								</p>
								<p class="text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-mono text-[9px] leading-tight">
									{booking.time}
								</p>
							</div>
						{/each}
						{#if day.bookings.length > 3}
							<div class="text-zinc-500 dark:text-zinc-400 text-[8px] font-bold pl-1 mt-0.5 uppercase">
								+ {day.bookings.length - 3} คิวเพิ่มเติม
							</div>
						{/if}
					{:else if day.isCurrentMonth}
						<div class="text-zinc-400/30 hidden flex-1 items-center justify-center text-[9px] font-bold tracking-wider uppercase md:flex">
							ว่าง
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</Card.Root>