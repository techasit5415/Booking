<script lang="ts">
	import { Users, CalendarDays, Clock, MapPin } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import type { BookingItem } from '$lib/types';

	interface Props {
		upcomingBookings?: BookingItem[];
		roomLocation?: string;
	}

	let { upcomingBookings = [], roomLocation = '' }: Props = $props();
</script>

<Card.Root class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 rounded-xl flex flex-col gap-4 shadow-xs">
	<Card.Header class="p-0 flex flex-row items-center justify-between">
		<h3 class="text-zinc-500 dark:text-zinc-400 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 font-['Prompt',sans-serif]">
			<CalendarDays class="h-4 w-4 text-zinc-400" />
			คิวถัดไปในวันนี้
		</h3>
		{#if upcomingBookings.length > 0}
			<Badge variant="secondary" class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-250/20 text-[10px] font-bold">
				{upcomingBookings.length} คิว
			</Badge>
		{/if}
	</Card.Header>

	<Card.Content class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-0 pr-1 max-h-[300px]">
		{#if upcomingBookings.length > 0}
			<div class="space-y-3">
				{#each upcomingBookings as booking (booking.id)}
					<div
						class="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/40 transition-colors duration-200 flex items-center justify-between gap-4 rounded-lg px-4 py-3"
					>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="truncate text-sm font-bold text-zinc-800 dark:text-zinc-200 font-['Prompt',sans-serif] tracking-tight">
								{booking.title}
							</p>
							<div class="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5 text-xs text-zinc-500">
								{#if roomLocation}
									<div class="flex items-center gap-1">
										<MapPin class="h-3 w-3 text-zinc-400" />
										<span class="truncate">{roomLocation}</span>
									</div>
								{/if}
								{#if booking.bookerName || booking.bookerEmail || booking.booker_email}
									<div class="flex items-center gap-1">
										<Users class="h-3 w-3 text-zinc-400" />
										<span class="truncate">
											{booking.bookerName || booking.bookerEmail || booking.booker_email}
										</span>
									</div>
								{/if}
							</div>
						</div>
						<div class="flex flex-col items-end">
							<Badge
								variant="outline"
								class="border-zinc-200 dark:border-zinc-800 bg-background text-zinc-650 dark:text-zinc-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
							>
								<Clock class="h-3.5 w-3.5" />
								{booking.startTime} - {booking.endTime}
							</Badge>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="border-zinc-200 dark:border-zinc-800 border-dashed bg-zinc-50/50 dark:bg-zinc-950/10 rounded-lg border-2 px-4 py-10 text-center text-zinc-400 text-xs flex flex-col items-center justify-center space-y-1.5"
			>
				<CalendarDays class="h-6 w-6 text-zinc-400" />
				<p class="font-semibold text-zinc-700 dark:text-zinc-300">ไม่มีรายการจองถัดไปในวันนี้</p>
				<p class="text-zinc-400 dark:text-zinc-500">ห้องว่างสำหรับช่วงเวลาที่เหลือ</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>