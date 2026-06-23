<script lang="ts">
	import { Clock, Users } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';

	let {
		bookingViewState = 'idle',
		currentBooking = {
			title: '',
			startTime: '',
			endTime: '',
			detailLabel: '',
			bookerName: '',
			bookerEmail: '',
			booker_email: '',
			status: ''
		},
		progressNote = '',
		progressPercent = 0
	} = $props();

	// ชื่อคนจอง — fallback email ถ้าชื่อว่าง
	const displayBooker = $derived(
		currentBooking.bookerName || currentBooking.bookerEmail || currentBooking.booker_email || '-'
	);

	type Variant = 'default' | 'success' | 'warning' | 'destructive';

	const variantClass = $derived.by<{
		card: string;
		bar: string;
		badge: Variant;
	}>(() => {
		if (bookingViewState === 'idle') {
			return {
				card: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-background to-background',
				bar: 'bg-gradient-to-b from-emerald-400 via-lime-500 to-emerald-900',
				badge: 'success'
			};
		}
		if (currentBooking.status === 'pending') {
			return {
				card: 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-background to-background',
				bar: 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-900',
				badge: 'warning'
			};
		}
		return {
			card: 'border-red-500/30 bg-gradient-to-br from-red-950/40 via-background to-background',
			bar: 'bg-gradient-to-b from-red-500 via-orange-500 to-red-900',
			badge: 'destructive'
		};
	});

	const statusLabel = $derived(
		bookingViewState === 'idle'
			? 'ว่าง'
			: currentBooking.status === 'pending'
				? 'รออนุมัติ'
				: 'กำลังใช้งาน'
	);
</script>

<Card.Root
	class={cn(
		'relative min-h-10 overflow-hidden gap-1 border p-3.5 shadow-2xl',
		variantClass.card
	)}
>
	<!-- แถบสีสถานะ (left bar) -->
	<div class={cn('absolute inset-y-0 left-0 w-1', variantClass.bar)} aria-hidden="true"></div>

	<Card.Header class="flex flex-col gap-1 p-0">
		<div class="flex flex-col gap-1">
			<Badge variant={variantClass.badge} class="w-fit gap-1 px-3 py-1.5 text-[11px]">
				<span
					class={cn(
						'h-1.5 w-1.5 rounded-full',
						bookingViewState === 'idle'
							? 'bg-emerald-500'
							: currentBooking.status === 'pending'
								? 'bg-amber-500'
								: 'bg-red-500'
					)}
				></span>
				{statusLabel}
			</Badge>

			<div>
				<h2 class="mt-1.5 text-2xl leading-tight font-bold tracking-tight md:text-4xl">
					{currentBooking.title}
					<span class="text-muted-foreground ml-9 text-2xl font-medium">
						({currentBooking.startTime} - {currentBooking.endTime})
					</span>
				</h2>
				{#if bookingViewState !== 'idle'}
					<p class="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
						<Clock class="h-3.5 w-3.5" />
						{currentBooking.detailLabel}
					</p>
					<p class="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
						<Users class="h-3.5 w-3.5" />
						{displayBooker}
					</p>
				{/if}
			</div>
		</div>
	</Card.Header>

	<Card.Content class="flex flex-col gap-1 p-0">
		<div class="text-muted-foreground flex items-center justify-between text-xs font-medium">
			<span>{progressNote}</span>
			<span class="text-foreground font-mono tabular-nums">{progressPercent}%</span>
		</div>
		<Progress value={progressPercent} max={100} class="h-1" />
	</Card.Content>
</Card.Root>