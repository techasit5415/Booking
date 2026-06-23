<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import PocketBase from 'pocketbase';
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import Topbar from '$lib/components/Topbar.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';

	import {
		CheckCircle2,
		Loader2,
		Users,
		FileText,
		CalendarPlus,
		AlertCircle,
		Lightbulb
	} from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { authenticatePbFromCookie } from '$lib/pocketbase';

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';

	// Hoisted formatters
	const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' });

	type Room = { id: string; name: string; location?: string };
	type Booking = {
		id: string;
		title: string;
		start_time: string;
		end_time: string;
		date?: string;
		status: string;
		field: string;
		bookerName?: string;
		bookerEmail?: string;
		booker_email?: string;
		detailLabel?: string;
	};

	// === Security: validate roomId before using in filter ===
	const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
	function isValidRoomId(id: string): boolean {
		return typeof id === 'string' && SAFE_ID_PATTERN.test(id);
	}

	/** แปลง ISO datetime เป็น YYYY-MM-DD ใน Asia/Bangkok */
	function getBookingDateInBangkok(iso: string): string {
		try {
			return BANGKOK_DATE_FORMAT.format(new Date(iso.replace(' ', 'T')));
		} catch {
			return '';
		}
	}

	let rooms = $state<Room[]>([]);
	let loadingRooms = $state(true);

	// form fields
	let selectedRoomId = $state<string>('');
	let bookingDate = $state<string>(getTodayDate());
	let startTime = $state<string>('09:00');
	let endTime = $state<string>('10:00');
	let title = $state<string>('');
	let notes = $state<string>('');

	// existing bookings for selected room+date
	let existingBookings = $state<Booking[]>([]);
	let loadingBookings = $state(false);

	// form state
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let submitSuccess = $state(false);
	let validationError = $state<string | null>(null);

	let pb: PocketBase | null = null;

	function getTodayDate(): string {
		// ใช้วันที่ Bangkok เพื่อให้ตรงกับ booking ที่เก็บในระบบ
		return BANGKOK_DATE_FORMAT.format(new Date());
	}

	function toBangkokIso(dateStr: string, hhmm: string): string {
		// dateStr = "YYYY-MM-DD", hhmm = "HH:MM"
		return `${dateStr}T${hhmm}:00+07:00`;
	}

	/** format เวลาให้แสดงเป็น HH:MM (Bangkok) — รับได้ทั้ง ISO, UTC, Bangkok */
	function formatDisplayTime(value: string): string {
		try {
			return new Intl.DateTimeFormat('en-GB', {
				timeZone: 'Asia/Bangkok',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
				hourCycle: 'h23'
			}).format(new Date(value.replace(' ', 'T')));
		} catch {
			return value;
		}
	}

	function selectRoom(id: string) {
		selectedRoomId = id;
		validationError = null;
	}

	async function loadRooms() {
		if (!pb) return;
		try {
			const data = await pb.collection('rooms').getFullList<Room>({ sort: 'name' });
			rooms = data;
		} catch (err) {
			console.error('Failed to load rooms', err);
		} finally {
			loadingRooms = false;
		}
	}

	async function loadBookingsForSelected() {
		if (!pb || !selectedRoomId || !isValidRoomId(selectedRoomId)) {
			existingBookings = [];
			return;
		}
		loadingBookings = true;
		try {
			const safeId = selectedRoomId;
			const data = await pb.collection('bookings').getFullList({
				filter: `field = "${safeId}"`,
				sort: 'start_time'
			});
			const allBookings = data as unknown as Booking[];

			existingBookings = allBookings.filter((b) => {
				if (b.status === 'cancelled') return false;
				return getBookingDateInBangkok(b.start_time) === bookingDate;
			});
		} catch (err) {
			console.error('Failed to load bookings', err);
			existingBookings = [];
		} finally {
			loadingBookings = false;
		}
	}

	// re-fetch bookings when room or date changes
	$effect(() => {
		const rid = selectedRoomId;
		const d = bookingDate;
		untrack(() => {
			if (rid && d) {
				void loadBookingsForSelected();
			}
		});
	});

	function validateForm(): string | null {
		if (!selectedRoomId) return 'กรุณาเลือกห้อง';
		if (!isValidRoomId(selectedRoomId)) return 'รหัสห้องไม่ถูกต้อง';
		if (!bookingDate) return 'กรุณาเลือกวันที่';
		if (!startTime || !endTime) return 'กรุณาเลือกเวลา';
		if (startTime >= endTime) return 'เวลาเริ่มต้องน้อยกว่าเวลาจบ';
		if (!title.trim()) return 'กรุณากรอกหัวข้อการจอง';
		return null;
	}

	function checkOverlap(bookings: Booking[]): Booking | null {
		const newStartMs = Date.parse(toBangkokIso(bookingDate, startTime));
		const newEndMs = Date.parse(toBangkokIso(bookingDate, endTime));

		for (const b of bookings) {
			if (b.status === 'cancelled') continue;
			const bsMs = Date.parse(b.start_time.replace(' ', 'T'));
			const beMs = Date.parse(b.end_time.replace(' ', 'T'));
			if (Number.isNaN(bsMs) || Number.isNaN(beMs)) continue;

			// overlap: newStart < existingEnd && newEnd > existingStart
			if (newStartMs < beMs && newEndMs > bsMs) {
				return b;
			}
		}
		return null;
	}

	async function fetchBookingsForRoomDate(): Promise<Booking[]> {
		if (!pb || !selectedRoomId || !isValidRoomId(selectedRoomId)) {
			return [];
		}
		const safeId = selectedRoomId;
		const data = await pb.collection('bookings').getFullList({
			filter: `field = "${safeId}"`,
			sort: 'start_time'
		});
		const all = data as unknown as Booking[];
		return all.filter((b) => {
			if (b.status === 'cancelled') return false;
			return getBookingDateInBangkok(b.start_time) === bookingDate;
		});
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		validationError = null;
		submitError = null;

		const err = validateForm();
		if (err) {
			validationError = err;
			return;
		}

		if (!pb || !isValidRoomId(selectedRoomId)) {
			submitError = 'ระบบไม่พร้อมใช้งาน';
			return;
		}

		submitting = true;
		try {
			const fresh = await fetchBookingsForRoomDate();
			existingBookings = fresh;

			const conflict = checkOverlap(fresh);
			if (conflict) {
				const cStart = formatDisplayTime(conflict.start_time);
				const cEnd = formatDisplayTime(conflict.end_time);
				validationError = `เวลานี้ชนกับการจอง "${conflict.title}" (${cStart}-${cEnd})`;
				return;
			}

			const response = await fetch('/api/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					roomId: selectedRoomId,
					date: bookingDate,
					startTime,
					endTime,
					title: title.trim(),
					notes: notes.trim()
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'ส่งคำขอไม่สำเร็จ' }));
				throw new Error(errorData.message || 'เซิร์ฟเวอร์ปฏิเสธการจอง');
			}

			submitSuccess = true;
			title = '';
			notes = '';
			toast.success('ส่งคำขอจองเรียบร้อย', {
				description: 'รอผู้ดูแลอนุมัติ'
			});

			await loadBookingsForSelected();
		} catch (err: any) {
			console.error('Submit failed', err);
			submitError = err.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
			toast.error('ส่งคำขอไม่สำเร็จ', { description: submitError ?? '' });
		} finally {
			submitting = false;
		}
	}

	function formatTime(iso: string): string {
		try {
			return new Date(iso.replace(' ', 'T')).toLocaleTimeString('th-TH', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
				hourCycle: 'h23'
			});
		} catch {
			return iso;
		}
	}

	function getRoomName(id: string): string {
		return rooms.find((r) => r.id === id)?.name ?? '';
	}

	onMount(() => {
		if (pocketbaseUrl) {
			pb = new PocketBase(pocketbaseUrl);
			authenticatePbFromCookie(pb);
			void loadRooms();
		} else {
			loadingRooms = false;
		}
	});
</script>

<svelte:head>
	<title>จองห้องประชุม | Booking</title>
</svelte:head>

<div
	class="bg-background text-foreground min-h-screen w-screen font-['Inter','Prompt',sans-serif] antialiased"
>
	<Topbar />
	<div
		class="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10"
	>
		<!-- ============ HEADER ============ -->
		<header
			class="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-end md:justify-between"
		>
			<div class="flex flex-col gap-2">
				<div
					class="text-muted-foreground flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="bg-foreground inline-block h-1.5 w-1.5 rounded-full"></span>
					New Booking
				</div>
				<h1 class="text-3xl font-bold tracking-tight md:text-4xl">
					จองห้องประชุม
				</h1>
			</div>

			<ThemeToggle />
		</header>

		{#if submitSuccess}
			<!-- Success state -->
			<Card.Root
				class="border-emerald-500/30 bg-emerald-500/10 flex flex-col items-center gap-4 p-10 text-center"
			>
				<div
					class="bg-emerald-500 inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
				>
					<CheckCircle2 class="h-6 w-6" />
				</div>
				<Card.Header class="p-0">
					<Card.Title class="text-2xl">ส่งคำขอจองแล้ว</Card.Title>
					<Card.Description>
						รอผู้ดูแลอนุมัติ สถานะจะอัปเดตเป็น "approved" เมื่อได้รับการยืนยัน
					</Card.Description>
				</Card.Header>
				<div class="flex gap-3">
					<Button
						variant="outline"
						onclick={() => {
							submitSuccess = false;
						}}
					>
						จองอีกครั้ง
					</Button>
					<Button onclick={() => goto('/book')}>กลับหน้าหลัก</Button>
				</div>
			</Card.Root>
		{:else}
			<form onsubmit={handleSubmit} class="grid flex-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
				<!-- LEFT: form -->
				<div class="flex flex-col gap-6">
					<!-- 1. Room selection -->
					<Card.Root class="gap-3 p-6">
						<Card.Header class="flex flex-row items-center justify-between p-0">
							<Card.Title class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
								1 · เลือกห้อง
							</Card.Title>
							{#if selectedRoomId}
								<span class="text-muted-foreground text-xs">
									เลือก: <strong class="text-foreground">{getRoomName(selectedRoomId)}</strong>
								</span>
							{/if}
						</Card.Header>

						<Card.Content class="p-0">
							{#if loadingRooms}
								<p class="text-muted-foreground flex items-center gap-2 text-sm">
									<Loader2 class="h-3.5 w-3.5 animate-spin" />
									กำลังโหลดห้อง...
								</p>
							{:else if rooms.length === 0}
								<p class="text-muted-foreground text-sm">ไม่พบห้องในระบบ</p>
							{:else}
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{#each rooms as room (room.id)}
										<button
											type="button"
											onclick={() => selectRoom(room.id)}
											class={cn(
												'rounded-md border p-3 text-left transition-colors',
												selectedRoomId === room.id
													? 'border-primary bg-primary text-primary-foreground'
													: 'bg-card hover:border-muted-foreground/50'
											)}
										>
											<div class="text-sm font-semibold">{room.name}</div>
											{#if room.location}
												<div class="mt-0.5 text-xs opacity-70">{room.location}</div>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- 2. Date & time -->
					<Card.Root class="gap-4 p-6">
						<Card.Header class="p-0">
							<Card.Title class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
								2 · วันและเวลา
							</Card.Title>
						</Card.Header>

						<Card.Content class="grid grid-cols-1 gap-4 p-0 sm:grid-cols-3">
							<div class="flex flex-col gap-1.5">
								<Label for="book-date">วันที่</Label>
								<Input id="book-date" type="date" bind:value={bookingDate} />
							</div>

							<div class="flex flex-col gap-1.5">
								<Label for="book-start">เวลาเริ่ม</Label>
								<Input
									id="book-start"
									type="time"
									bind:value={startTime}
									class="font-mono"
								/>
							</div>

							<div class="flex flex-col gap-1.5">
								<Label for="book-end">เวลาจบ</Label>
								<Input id="book-end" type="time" bind:value={endTime} class="font-mono" />
							</div>
						</Card.Content>
					</Card.Root>

					<!-- 3. Details -->
					<Card.Root class="gap-4 p-6">
						<Card.Header class="p-0">
							<Card.Title class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
								3 · รายละเอียด
							</Card.Title>
						</Card.Header>

						<Card.Content class="flex flex-col gap-4 p-0">
							<div class="flex flex-col gap-1.5">
								<Label for="book-title">
									หัวข้อการจอง <span class="text-destructive">*</span>
								</Label>
								<Input
									id="book-title"
									type="text"
									bind:value={title}
									placeholder="เช่น Marketing Team Meeting"
									maxlength={200}
								/>
							</div>

							<div class="flex flex-col gap-1.5">
								<Label for="book-notes">
									รายละเอียดเพิ่มเติม <span class="text-muted-foreground">(ไม่บังคับ)</span>
								</Label>
								<Textarea
									id="book-notes"
									bind:value={notes}
									placeholder="เช่น ต้องการ projector, นั่ง 10 คน"
									rows={3}
									maxlength={500}
									class="resize-none"
								/>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Validation + submit -->
					{#if validationError}
						<Alert variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<AlertTitle>ไม่สามารถส่งคำขอได้</AlertTitle>
							<AlertDescription>{validationError}</AlertDescription>
						</Alert>
					{/if}
					{#if submitError}
						<Alert variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<AlertTitle>เซิร์ฟเวอร์ปฏิเสธคำขอ</AlertTitle>
							<AlertDescription>{submitError}</AlertDescription>
						</Alert>
					{/if}

					<Button type="submit" disabled={submitting} size="lg" class="gap-2">
						{#if submitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							กำลังส่ง...
						{:else}
							<CalendarPlus class="h-4 w-4" />
							ส่งคำขอจอง
						{/if}
					</Button>
				</div>

				<!-- RIGHT: existing bookings preview -->
				<aside class="flex flex-col gap-4">
					<Card.Root class="sticky top-6 gap-4 p-6">
						<Card.Header class="p-0">
							<Card.Title class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
								คิวของวันนี้
							</Card.Title>
						</Card.Header>

						<Card.Content class="flex flex-col gap-2 p-0">
							{#if !selectedRoomId}
								<p class="text-muted-foreground text-sm">เลือกห้องเพื่อดูคิวที่มีอยู่</p>
							{:else if loadingBookings}
								<p class="text-muted-foreground flex items-center gap-2 text-sm">
									<Loader2 class="h-3.5 w-3.5 animate-spin" />
									กำลังโหลด...
								</p>
							{:else if existingBookings.length === 0}
								<div
									class="border-muted-foreground/30 rounded-md border border-dashed px-4 py-8 text-center text-sm"
								>
									ห้องว่างตลอดทั้งวัน
								</div>
							{:else}
								<ul class="flex flex-col gap-2">
									{#each existingBookings as b (b.id)}
										<li
											class="bg-muted/40 flex flex-col gap-1 rounded-md border px-3 py-2"
										>
											<div class="flex items-center justify-between gap-2">
												<span class="font-mono text-xs font-medium">
													{formatTime(b.start_time)} - {formatTime(b.end_time)}
												</span>
												<Badge
													variant={b.status === 'pending' ? 'warning' : 'success'}
													class="text-[10px] uppercase tracking-wider"
												>
													{b.status}
												</Badge>
											</div>
											<p class="truncate text-sm font-semibold">{b.title}</p>
											{#if b.bookerName || b.bookerEmail || b.booker_email}
												<p class="text-muted-foreground flex items-center gap-1 truncate text-xs">
													<Users class="h-3 w-3 shrink-0" />
													<span class="truncate">
														{b.bookerName || b.bookerEmail || b.booker_email}
													</span>
												</p>
											{/if}
											{#if b.detailLabel}
												<p
													class="text-muted-foreground flex items-start gap-1 truncate text-xs"
													title={b.detailLabel}
												>
													<FileText class="mt-0.5 h-3 w-3 shrink-0" />
													<span class="truncate">{b.detailLabel}</span>
												</p>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</Card.Content>

						<Separator />

						<div
							class="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-md p-3 text-xs"
						>
							<Lightbulb class="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span>ระบบจะเช็คเวลาซ้อนทับให้อัตโนมัติ ถ้าเลือกเวลาที่ชนกับคิวเดิมจะแจ้งเตือน</span>
						</div>
					</Card.Root>
				</aside>
			</form>
		{/if}
	</div>
</div>