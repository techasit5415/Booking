<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	// รับข้อมูลปฏิทินประจำเดือนที่คำนวณเสร็จแล้วมาจากหน้าหลัก
	let { calendarDays = [] } = $props();

	const daysOfWeek = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
</script>

<Card.Root class="gap-0 overflow-hidden p-0">
	<!-- Day-of-week header -->
	<div class="border-border grid grid-cols-7 border-b">
		{#each daysOfWeek as day}
			<div class="text-muted-foreground py-3 text-center text-[10px] font-semibold tracking-[0.15em] uppercase">
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid grid-cols-7">
		{#each calendarDays as day, i (day.dateKey)}
			{@const isLastInRow = (i + 1) % 7 === 0}
			{@const isLastRow = i >= 35}
			<div
				class={cn(
					'group flex min-h-[110px] flex-col gap-1.5 p-3 transition-colors md:min-h-[140px]',
					!isLastInRow && 'border-border border-r',
					!isLastRow && 'border-border border-b',
					day.isCurrentMonth ? 'bg-card' : 'bg-muted/20',
					day.isToday && 'bg-muted/40',
					'hover:bg-muted/30'
				)}
			>
				<!-- Day number -->
				<div class="flex items-center justify-between">
					{#if day.isToday}
						<Badge class="h-6 min-w-6 justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums">
							{day.dayNumber}
						</Badge>
					{:else}
						<span
							class={cn(
								'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
								day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40'
							)}
						>
							{day.dayNumber}
						</span>
					{/if}

					{#if day.bookings.length > 0 && day.isCurrentMonth}
						<span
							class="bg-foreground/80 h-1.5 w-1.5 rounded-full"
							title="{day.bookings.length} bookings"
						></span>
					{/if}
				</div>

				<!-- Bookings list -->
				<div class="flex flex-1 flex-col gap-1 overflow-hidden">
					{#if day.isCurrentMonth && day.bookings.length > 0}
						{#each day.bookings.slice(0, 3) as booking, bi (bi)}
							<div class="bg-muted/60 hover:bg-muted rounded border p-1.5 text-left transition-colors">
								<p class="truncate text-sm font-semibold leading-tight">
									{booking.title}
								</p>
								<p class="text-muted-foreground mt-0.5 truncate font-mono text-xs leading-tight">
									{booking.time}
								</p>
							</div>
						{/each}
						{#if day.bookings.length > 3}
							<div class="text-muted-foreground text-[10px] font-medium">
								+{day.bookings.length - 3} more
							</div>
						{/if}
					{:else if day.isCurrentMonth}
						<div class="text-muted-foreground hidden flex-1 items-center justify-center text-xs italic md:flex">
							ว่าง
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</Card.Root>