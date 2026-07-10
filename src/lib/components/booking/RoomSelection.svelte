<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Loader2, MapPin, Check } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import type { Room } from "$lib/types";

	let {
		rooms,
		selectedRoomId,
		loadingRooms,
		onSelectRoom,
		getRoomName,
	}: {
		rooms: Room[];
		selectedRoomId: string;
		loadingRooms: boolean;
		onSelectRoom: (id: string) => void;
		getRoomName: (id: string) => string;
	} = $props();
</script>

<Card.Root
	class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xs"
>
	<Card.Header
		class="border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex flex-row items-center justify-between"
	>
		<div class="flex items-center gap-2">
			<span
				class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
			>
				1
			</span>
			<Card.Title
				class="text-sm font-semibold tracking-wide uppercase text-zinc-700 dark:text-zinc-300"
			>
				เลือกห้องเรียน / ห้องประชุม
			</Card.Title>
		</div>
		{#if selectedRoomId}
			<Badge
				variant="outline"
				class="border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
			>
				เลือก: {getRoomName(selectedRoomId)}
			</Badge>
		{/if}
	</Card.Header>

	<Card.Content class="p-6">
		{#if loadingRooms}
			<div
				class="text-zinc-400 dark:text-zinc-500 flex items-center justify-center py-6 gap-2 text-xs"
			>
				<Loader2 class="h-4 w-4 animate-spin text-indigo-600" />
				กำลังโหลดรายการห้อง...
			</div>
		{:else if rooms.length === 0}
			<div
				class="text-zinc-400 dark:text-zinc-500 text-center py-6 text-xs italic"
			>
				ไม่พบห้องประชุมในขณะนี้
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each rooms as room (room.id)}
					<button
						type="button"
						onclick={() => onSelectRoom(room.id)}
						class={cn(
							"rounded-lg border p-4 text-left transition-colors duration-200 flex flex-col justify-between h-24 cursor-pointer",
							selectedRoomId === room.id
								? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20"
								: "border-zinc-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-850"
						)}
					>
						<div>
							<div
								class="text-sm font-bold text-zinc-800 dark:text-zinc-200"
							>
								{room.name}
							</div>
							{#if room.location}
								<div
									class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1 text-xs"
								>
									<MapPin class="h-3 w-3 shrink-0" />
									<span class="truncate">{room.location}</span>
								</div>
							{/if}
						</div>

						<div class="flex justify-end w-full">
							<div
								class={cn(
									"h-5 w-5 rounded-full flex items-center justify-center border text-[10px]",
									selectedRoomId === room.id
										? "bg-indigo-600 border-indigo-600 text-white"
										: "border-zinc-300 dark:border-zinc-700 bg-background text-transparent"
								)}
							>
								<Check class="h-3 w-3 stroke-[2.5]" />
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
