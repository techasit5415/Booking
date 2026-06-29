<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { QrCode, HelpCircle } from '@lucide/svelte';

	interface Props {
		qrCodeDataUrl?: string;
	}

	let { qrCodeDataUrl = '' }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<!-- QR Card -->
	<Card.Root class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center rounded-xl shadow-xs flex flex-col justify-between min-h-[280px]">
		<Card.Header class="flex flex-col gap-1 p-0">
			<Card.Title class="text-zinc-900 dark:text-zinc-50 text-base font-bold tracking-tight flex items-center justify-center gap-1.5 font-['Prompt',sans-serif]">
				ต้องการจองห้องนี้?
			</Card.Title>
			<Card.Description class="text-zinc-500 dark:text-zinc-400 text-xs">
				สแกน QR Code ด้วยอุปกรณ์ของคุณเพื่อเข้าสู่ระบบจอง
			</Card.Description>
		</Card.Header>

		<Card.Content class="mx-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white p-2.5 shadow-xs mt-3 mb-3">
			{#if qrCodeDataUrl}
				<img
					class="h-36 w-36 object-contain rounded-md"
					src={qrCodeDataUrl}
					alt="QR code สำหรับจองห้อง"
				/>
			{:else}
				<div class="text-zinc-400 grid h-36 w-36 place-items-center text-sm font-semibold">
					<QrCode class="h-8 w-8 animate-pulse text-zinc-300 dark:text-zinc-650" />
				</div>
			{/if}
		</Card.Content>

		<Card.Footer class="justify-center p-0">
			<div class="text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
				Scan to Reserve
			</div>
		</Card.Footer>
	</Card.Root>

	<!-- Tips -->
	<Card.Root class="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10 p-4 rounded-xl">
		<Card.Header class="p-0 pb-1 flex flex-row items-center gap-1.5">
			<HelpCircle class="h-3.5 w-3.5 text-zinc-400" />
			<Card.Title class="text-zinc-500 dark:text-zinc-400 text-xs font-bold tracking-wider uppercase font-['Prompt',sans-serif]">
				คำแนะนำเพิ่มเติม
			</Card.Title>
		</Card.Header>
		<Card.Content class="text-zinc-500 dark:text-zinc-400 p-0 text-xs leading-relaxed">
			เมื่อใช้งานห้องเสร็จแล้วก่อนกำหนดการจอง โปรดกดยกเลิกหรือส่งคืนห้องในระบบ เพื่อจัดคิวส่งต่อให้ท่านอื่นได้รวดเร็วยิ่งขึ้น
		</Card.Content>
	</Card.Root>
</div>