<script lang="ts">
	import { Users } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { upcomingBookings = [], roomLocation = '' } = $props();
</script>

<Card.Root class="gap-4 p-3">
	<Card.Header class="p-0">
		<h3 class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
			คิวถัดไปวันนี้
		</h3>
	</Card.Header>

	<Card.Content class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-0 pr-1">
		{#if upcomingBookings.length > 0}
			{#each upcomingBookings as booking (booking.id)}
				<div class="bg-muted/40 flex items-center justify-between gap-4 rounded-md border px-4 py-3">
					<div class="min-w-0 flex-1">
						<p class="truncate text-base font-semibold">
							{booking.title}
						</p>
						<p class="text-muted-foreground mt-0.5 truncate text-xs">
							{roomLocation}
						</p>
						{#if booking.bookerName || booking.bookerEmail || booking.booker_email}
							<p class="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
								<Users class="h-3 w-3 shrink-0" />
								<span class="truncate">
									{booking.bookerName || booking.bookerEmail || booking.booker_email}
								</span>
							</p>
						{/if}
					</div>
					<Badge variant="outline" class="font-mono tabular-nums">
						{booking.startTime} - {booking.endTime}
					</Badge>
				</div>
			{/each}
		{:else}
			<div class="border-muted-foreground/30 rounded-md border border-dashed px-4 py-8 text-center text-sm">
				ไม่มีรายการจองถัดไป
			</div>
		{/if}
	</Card.Content>
</Card.Root>