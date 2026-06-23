<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { QrCode } from '@lucide/svelte';

	let { qrCodeDataUrl = '' } = $props();
</script>

<div class="flex flex-col gap-2">
	<!-- QR Card -->
	<Card.Root class="bg-foreground text-background gap-1 border-2 p-4 text-center">
		<Card.Header class="flex flex-col gap-1 p-0">
			<Card.Title class="text-background text-xl font-bold tracking-tight">
				ต้องการจองห้องนี้?
			</Card.Title>
			<Card.Description class="text-background/70 text-xs">
				สแกน QR code เพื่อเปิดหน้าจอง
			</Card.Description>
		</Card.Header>

		<Card.Content class="bg-background mx-auto rounded-md border p-1">
			{#if qrCodeDataUrl}
				<img
					class="h-44 w-44 object-contain"
					src={qrCodeDataUrl}
					alt="QR code สำหรับจองห้อง"
				/>
			{:else}
				<div class="text-muted-foreground grid h-44 w-44 place-items-center text-sm font-semibold">
					<QrCode class="h-12 w-12 animate-pulse" />
				</div>
			{/if}
		</Card.Content>

		<Card.Footer class="justify-center p-0">
			<div class="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-70">
				Scan to book
			</div>
		</Card.Footer>
	</Card.Root>

	<!-- Tips -->
	<Card.Root class="bg-foreground text-background gap-0.5 border-2 p-3">
		<Card.Header class="p-0">
			<Card.Title class="text-background text-sm font-semibold tracking-[0.15em] uppercase">
				ข้อแนะนำ
			</Card.Title>
		</Card.Header>
		<Card.Content class="text-background/70 p-0 text-xs leading-relaxed">
			ถ้าประชุมเสร็จก่อนกำหนด ให้กดคืนห้องในระบบ เพื่อให้คนอื่นใช้งานต่อได้ทันที
		</Card.Content>
	</Card.Root>
</div>