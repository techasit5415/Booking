<script lang="ts">
	import { Clock, Users, ShieldAlert, CheckCircle2 } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import type { BookingItem } from '$lib/types';

	interface Props {
		bookingViewState?: 'active' | 'idle';
		currentBooking?: BookingItem | {
			id: string;
			title: string;
			startTime: string;
			endTime: string;
			detailLabel: string;
			bookerName: string;
			bookerEmail?: string;
			booker_email?: string;
			status: string;
		};
		progressNote?: string;
		progressPercent?: number;
	}

	let {
		bookingViewState = 'idle',
		currentBooking = {
			id: 'empty',
			title: 'ว่าง',
			startTime: '',
			endTime: '',
			detailLabel: '-',
			bookerName: '-',
			status: 'cancelled'
		},
		progressNote = '',
		progressPercent = 0
	}: Props = $props();

	const displayBooker = $derived(
		currentBooking.bookerName || currentBooking.bookerEmail || currentBooking.booker_email || '-'
	);

	type Variant = 'default' | 'success' | 'warning' | 'destructive';

	// Compute simple color-based variables (no glows)
	const themeStyles = $derived.by<{
		card: string;
		leftBorder: string;
		badgeVariant: Variant;
		dotColor: string;
		progressBarColor: string;
	}>(() => {
		if (bookingViewState === 'idle') {
			return {
				card: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
				leftBorder: 'bg-emerald-500',
				badgeVariant: 'success',
				dotColor: 'bg-emerald-500',
				progressBarColor: 'bg-emerald-500',
			};
		}
		if (currentBooking.status === 'pending') {
			return {
				card: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
				leftBorder: 'bg-amber-500',
				badgeVariant: 'warning',
				dotColor: 'bg-amber-500',
				progressBarColor: 'bg-amber-500',
			};
		}
		// Active & occupied
		return {
			card: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
			leftBorder: 'bg-rose-500',
			badgeVariant: 'destructive',
			dotColor: 'bg-rose-500',
			progressBarColor: 'bg-rose-500',
		};
	});

	const statusLabel = $derived(
		bookingViewState === 'idle'
			? 'ว่าง (Available)'
			: currentBooking.status === 'pending'
				? 'รออนุมัติ (Pending)'
				: 'กำลังใช้งาน (Occupied)'
	);
</script>

<Card.Root
	class={cn(
		'relative min-h-[160px] overflow-hidden border p-6 shadow-xs rounded-xl flex flex-col justify-between transition-colors duration-300',
		themeStyles.card
	)}
>
	<!-- Status left vertical stripe (solid color, no shadow) -->
	<div class={cn('absolute inset-y-0 left-0 w-1.5 transition-colors duration-300', themeStyles.leftBorder)} aria-hidden="true"></div>

	<Card.Header class="p-0 space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<Badge variant={themeStyles.badgeVariant} class="w-fit gap-1.5 px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded">
				<span class={cn('h-1.5 w-1.5 rounded-full transition-colors duration-350', themeStyles.dotColor)}></span>
				{statusLabel}
			</Badge>

			{#if bookingViewState !== 'idle'}
				<span class="font-mono text-xs font-bold text-zinc-650 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded">
					{currentBooking.startTime} - {currentBooking.endTime}
				</span>
			{/if}
		</div>

		<div class="space-y-2">
			<h2 class="text-2xl md:text-3xl leading-tight font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-['Prompt','Inter',sans-serif]">
				{#if bookingViewState === 'idle'}
					<span class="text-emerald-600 dark:text-emerald-500 font-bold">ว่าง</span>
				{:else}
					{currentBooking.title}
				{/if}
			</h2>

			{#if bookingViewState !== 'idle'}
				<div class="flex flex-wrap gap-x-5 gap-y-1 pt-0.5">
					<div class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 text-xs md:text-sm font-medium">
						<Clock class="h-3.5 w-3.5" />
						<span>{currentBooking.detailLabel}</span>
					</div>
					<div class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 text-xs md:text-sm font-medium">
						<Users class="h-3.5 w-3.5" />
						<span>{displayBooker}</span>
					</div>
				</div>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="p-0 pt-4 space-y-1.5">
		<div class="text-zinc-500 dark:text-zinc-400 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
			<span class="flex items-center gap-1">
				{#if bookingViewState === 'idle'}
					<CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
				{:else}
					<ShieldAlert class="h-3.5 w-3.5 text-zinc-400" />
				{/if}
				{progressNote}
			</span>
			<span class="text-zinc-700 dark:text-zinc-300 font-mono tabular-nums">{progressPercent}%</span>
		</div>
		<div class="relative w-full bg-zinc-100 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-200 dark:border-zinc-800/40">
			<div
				class={cn("h-full rounded-full transition-all duration-300", themeStyles.progressBarColor)}
				style="width: {progressPercent}%"
			></div>
		</div>
	</Card.Content>
</Card.Root>