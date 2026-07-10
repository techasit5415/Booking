<script lang="ts">
	import { fade } from "svelte/transition";
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { Check } from "@lucide/svelte";

	let { onReset }: { onReset: () => void } = $props();
</script>

<div class="mx-auto max-w-xl" in:fade={{ duration: 200 }}>
	<Card.Root
		class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center gap-5 p-10 text-center shadow-xs rounded-xl"
	>
		<div
			class="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex h-14 w-14 items-center justify-center rounded-full"
		>
			<Check class="h-6 w-6 stroke-[3.5]" />
		</div>
		<Card.Header class="p-0 space-y-1.5">
			<Card.Title
				class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
			>
				ส่งคำขอจองห้องประชุมแล้ว
			</Card.Title>
			<Card.Description
				class="text-zinc-500 dark:text-zinc-400 text-sm"
			>
				ส่งคำขอสำเร็จแล้ว สถานะของรายการจะเป็น <span
					class="text-indigo-600 dark:text-indigo-400 font-semibold"
					>approved</span
				> เมื่อได้รับการตรวจสอบและยืนยันจากผู้ดูแลระบบ
			</Card.Description>
		</Card.Header>
		<div class="flex gap-3 mt-1">
			<Button
				variant="outline"
				onclick={onReset}
				class="rounded-lg"
			>
				จองรายการอื่นเพิ่มเติม
			</Button>
			<Button
				href="/book"
				class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
			>
				กลับหน้าหลัก
			</Button>
		</div>
	</Card.Root>
</div>
