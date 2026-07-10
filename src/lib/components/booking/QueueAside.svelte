<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Loader2, MapPin, CheckCircle2, Clock, Users, FileText } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import type { Booking } from "$lib/types";

	let {
		selectedRoomId,
		bookingDate,
		loadingBookings,
		existingBookings,
	}: {
		selectedRoomId: string;
		bookingDate: string;
		loadingBookings: boolean;
		existingBookings: Booking[];
	} = $props();

	function formatTime(iso: string): string {
		try {
			return new Date(iso.replace(" ", "T")).toLocaleTimeString("th-TH", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				hourCycle: "h23",
			});
		} catch {
			return iso;
		}
	}
</script>

<aside class="flex flex-col gap-4">
	<Card.Root
		class="sticky top-20 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xs"
	>
		<Card.Header
			class="border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex flex-row items-center justify-between"
		>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-zinc-700 dark:text-zinc-300"
			>
				คิวการจองวันนี้
			</Card.Title>
			<Badge
				variant="outline"
				class="font-mono text-[10px] px-2 py-0.5"
			>
				{bookingDate}
			</Badge>
		</Card.Header>

		<Card.Content class="p-6">
			{#if !selectedRoomId}
				<div
					class="flex flex-col items-center justify-center text-center py-8 space-y-2"
				>
					<div
						class="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400"
					>
						<MapPin class="h-5 w-5" />
					</div>
					<p class="text-zinc-500 text-xs">
						โปรดเลือกห้องประชุมเพื่อเรียกดูตารางการจองวันนี้
					</p>
				</div>
			{:else if loadingBookings}
				<div
					class="text-zinc-400 dark:text-zinc-500 flex items-center justify-center py-8 gap-2 text-xs"
				>
					<Loader2 class="h-4 w-4 animate-spin text-indigo-600" />
					กำลังดึงรายการคิวจอง...
				</div>
			{:else if existingBookings.length === 0}
				<div
					class="border-zinc-200 dark:border-zinc-800 border-dashed bg-zinc-50/50 dark:bg-zinc-950/10 rounded-lg border-2 px-4 py-10 text-center text-xs flex flex-col items-center justify-center space-y-1.5"
				>
					<CheckCircle2 class="h-6 w-6 text-emerald-500" />
					<p class="font-semibold text-zinc-700 dark:text-zinc-300">
						ห้องว่างตลอดทั้งวัน
					</p>
					<p class="text-zinc-400 dark:text-zinc-500">
						สามารถเลือกเวลาใช้งานที่ต้องการได้ทันที
					</p>
				</div>
			{:else}
				<!-- Vertical Queue Timeline -->
				<div class="relative pl-5 space-y-4 py-1">
					<div
						class="absolute left-2 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800"
					></div>

					{#each existingBookings as b (b.id)}
						<div class="relative">
							<!-- Simple status colored indicator dot -->
							<div
								class={cn(
									"absolute -left-[18px] top-1.5 h-2 w-2 rounded-full border bg-background",
									b.status === "pending"
										? "border-amber-500 bg-amber-500"
										: "border-emerald-500 bg-emerald-500"
								)}
							></div>

							<div
								class="bg-zinc-50/60 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800/80 rounded-lg px-4 py-3"
							>
								<div
									class="flex items-center justify-between gap-2 mb-1"
								>
									<span
										class="font-mono text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded"
									>
										<Clock class="h-3 w-3 text-zinc-400" />
										{formatTime(b.start_time)} - {formatTime(b.end_time)}
									</span>

									<Badge
										variant={b.status === "pending" ? "warning" : "success"}
										class="text-[8px] font-semibold px-1 rounded"
									>
										{b.status === "pending" ? "pending" : "approved"}
									</Badge>
								</div>

								<h4
									class="text-xs font-bold text-zinc-850 dark:text-zinc-200 line-clamp-1"
								>
									{b.title}
								</h4>

								<div class="mt-2 space-y-1 text-[10px]">
									{#if b.bookerName || b.bookerEmail || b.booker_email}
										<div
											class="text-zinc-500 flex items-center gap-1.5 truncate"
										>
											<Users class="h-3 w-3 text-zinc-400" />
											<span class="truncate">
												{b.bookerName || b.bookerEmail || b.booker_email}
											</span>
										</div>
									{/if}

									{#if b.detailLabel}
										<div
											class="text-zinc-500 flex items-start gap-1.5 truncate"
										>
											<FileText class="h-3 w-3 text-zinc-400" />
											<span class="truncate">{b.detailLabel}</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<Separator class="my-4 border-zinc-100 dark:border-zinc-800/60" />
		</Card.Content>
	</Card.Root>
</aside>
