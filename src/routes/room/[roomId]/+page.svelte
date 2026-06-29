<script lang="ts">
	import { onMount } from 'svelte';
	import PocketBase from 'pocketbase';
	import QRCode from 'qrcode';
	import { env } from '$env/dynamic/public';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import ActiveBookingCard from '$lib/components/ActiveBookingCard.svelte';
	import UpcomingBookingsList from '$lib/components/UpcomingBookingsList.svelte';
	import QrBookingCard from '$lib/components/QrBookingCard.svelte';
	import { page } from '$app/state';
	import type { BookingItem, RoomItem } from '$lib/types';

	type BookingRecord = Record<string, unknown> & {
		expand?: {
			field?: {
				name?: unknown;
			};
		};
	};

	type BookingViewState = 'active' | 'idle';

	// === Security: ป้องกัน filter injection ===
	const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
	function isValidRoomId(id: string | undefined): id is string {
		return typeof id === 'string' && SAFE_ID_PATTERN.test(id);
	}
	function escapeFilterValue(value: string): string {
		return value.replace(/[\\"'\n\r\t]/g, '\\$&');
	}

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';
	const currentRoomId = page.params.roomId;
	const defaultRoomName = 'CONFERENCE ROOM 01';
	const defaultRoomLocation = 'อาคารอเนกประสงค์ ชั้น 3';
	const defaultBookingUrl = 'https://example.com/book-room';

	const sampleBookings: BookingItem[] = [
		{
			id: '1',
			title: 'Marketing Team Meeting',
			detailLabel: 'ห้องประชุม A',
			startTime: '13:00',
			endTime: '15:00',
			status: 'confirmed',
			bookerName: 'คุณสมชาย'
		}
	];

	let clockText = $state('');
	let dateText = $state('');
	let qrCodeDataUrl = $state('');
	let bookings = $state<BookingItem[]>(sampleBookings);
	let roomName = $state(defaultRoomName);
	let roomLocation = $state(defaultRoomLocation);
	let currentBooking = $state<BookingItem>(sampleBookings[0]);
	let upcomingBookings = $state<BookingItem[]>([]);
	let progressPercent = $state(0);
	let progressNote = $state('');
	let bookingViewState = $state<BookingViewState>('idle');
	let statusLabel = $state('DEMO MODE');

	function updateClock() {
		const now = new Date();
		clockText = now.toLocaleTimeString('th-TH', { hour12: false, hourCycle: 'h23' });
		dateText = now.toLocaleDateString('th-TH', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		updateDerivedState();
	}

	function updateDerivedState() {
		const now = Date.now();
		const todayKey = getBangkokDateKey(new Date(now));

		// ✅ แสดง booking ทุกตัวของ "วันนี้" (Bangkok day) — ทั้งผ่านไปแล้ว/กำลังใช้/กำลังจะมา
		//    เรียงตาม start time (อดีตก่อน → ปัจจุบัน → อนาคต)
		const todaysBookings = bookings
			.filter((b) => {
				if (!b.startEpoch) return false;
				if (b.status === 'cancelled' || b.status === 'pending') return false;
				return getBangkokDateKey(new Date(b.startEpoch)) === todayKey;
			})
			.sort((a, b) => (a.startEpoch ?? 0) - (b.startEpoch ?? 0));

		const activeBooking = todaysBookings.find((b) => {
			if (!b.startEpoch || !b.endEpoch) return false;
			return now >= b.startEpoch && now < b.endEpoch;
		});

		// upcoming = ที่ยังไม่จบ (รวม current) — เพื่อโชว์ใน list
		const nextBookings = todaysBookings.filter((b) => {
			if (!b.endEpoch) return false;
			return b.endEpoch > now;
		});

		bookingViewState = activeBooking ? 'active' : 'idle';

		// Active card: ใช้ current ถ้ามี → ไม่งั้นใช้ next upcoming → ไม่งั้น "ว่าง"
		const displayBooking =
			activeBooking ?? nextBookings[0] ?? todaysBookings[todaysBookings.length - 1];

		currentBooking = displayBooking ?? {
			id: 'empty',
			title: 'ว่าง',
			detailLabel: '-',
			startTime: '',
			endTime: '',
			status: 'cancelled',
			bookerName: '-'
		};

		upcomingBookings = nextBookings;

		if (currentBooking.id === 'empty' || !currentBooking.startEpoch) {
			progressPercent = 0;
			progressNote = 'ห้องว่างและพร้อมใช้งาน';
		} else {
			const start = currentBooking.startEpoch;
			const end = currentBooking.endEpoch ?? now;

			if (end > start) {
				const pct = ((now - start) / (end - start)) * 100;
				progressPercent = Math.max(0, Math.min(100, Math.round(pct)));
				const minsLeft = Math.ceil((end - now) / 60000);

				if (minsLeft > 60) {
					const hoursLeft = Math.floor(minsLeft / 60);
					const remMins = minsLeft % 60;
					progressNote = `เหลือเวลาอีก ${hoursLeft} ชม. ${remMins} นาที`;
				} else if (minsLeft > 0) {
					progressNote = `เหลือเวลาอีก ${minsLeft} นาที`;
				} else {
					progressNote = 'กำลังจะเริ่มประชุมถัดไป';
				}
			} else {
				progressPercent = 0;
				progressNote = 'กำลังใช้งานห้องประชุม';
			}
		}
	}

	function getBangkokDateKey(date = new Date()) {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Asia/Bangkok',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(date);

		const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
		const month = parts.find((part) => part.type === 'month')?.value ?? '01';
		const day = parts.find((part) => part.type === 'day')?.value ?? '01';

		return `${year}-${month}-${day}`;
	}

	function parseBangkokTimeToEpoch(value: string) {
		const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
		if (!hhmm) return null;

		const hours = Number(hhmm[1]);
		const minutes = Number(hhmm[2]);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

		const dateKey = getBangkokDateKey();
		const isoLike = `${dateKey}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+07:00`;
		const parsed = Date.parse(isoLike);
		return Number.isNaN(parsed) ? null : parsed;
	}

	function parseTimeToEpoch(value: string): number | null {
		if (!value) return null;

		const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
		if (hhmm) {
			return parseBangkokTimeToEpoch(value);
		}

		const normalized = String(value).replace(' ', 'T');
		const parsed = Date.parse(normalized);
		return Number.isNaN(parsed) ? null : parsed;
	}

	function formatDisplayTime(value: unknown): string {
		if (typeof value !== 'string' || !value.trim()) return '--:--';
		const trimmed = value.trim();
		if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

		const normalized = trimmed.replace(' ', 'T');
		const parsed = Date.parse(normalized);
		if (Number.isNaN(parsed)) return trimmed;

		return new Date(parsed).toLocaleTimeString('th-TH', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			hourCycle: 'h23'
		});
	}

	function mapRecord(record: BookingRecord): BookingItem {
		const rawStatus = String(record.status ?? 'pending');
		const status: BookingItem['status'] =
			rawStatus === 'pending' || rawStatus === 'cancelled' ? rawStatus : 'confirmed';
		const bookingDetail = String(record.detailLabel ?? '').trim();
		const expandedFieldName = String(record.expand?.field?.name ?? '').trim();
		const detailLabel =
			bookingDetail || expandedFieldName || String(record.field ?? 'Unknown room');
		const bookerName = String(record.bookerName ?? '').trim();
		const bookerEmail = String(record.bookerEmail ?? record.booker_email ?? '').trim();
		const startRaw = String(record.start_time ?? '');
		const endRaw = String(record.end_time ?? '');

		return {
			id: String(record.id ?? crypto.randomUUID()),
			title: String(record.title ?? 'Untitled booking'),
			detailLabel,
			bookerName,
			bookerEmail,
			booker_email: bookerEmail,
			startTime: formatDisplayTime(startRaw),
			startEpoch: parseTimeToEpoch(startRaw),
			endTime: formatDisplayTime(endRaw),
			endEpoch: parseTimeToEpoch(endRaw),
			status
		};
	}

	function mapRoom(record: Record<string, unknown>): RoomItem {
		return {
			name: String(record.name ?? defaultRoomName),
			location: String(record.location ?? defaultRoomLocation),
			booking_url: String(record.booking_url ?? defaultBookingUrl)
		};
	}

	onMount(() => {
		updateClock();
		const clockTimer = window.setInterval(updateClock, 1000);
		let destroyed = false;
		let pb: PocketBase | null = null;

		async function generateQrCode() {
			try {
				const bookUrl = `${window.location.origin}/book`;
				qrCodeDataUrl = await QRCode.toDataURL(bookUrl, {
					width: 280,
					margin: 1,
					color: { dark: '#0f172a', light: '#ffffff' }
				});
			} catch (err) {
				console.error('Failed to generate QR Code', err);
			}
		}

		async function initRealtimeSystem() {
			if (!pocketbaseUrl) {
				statusLabel = 'DEMO MODE';
				await generateQrCode();
				return;
			}

			if (!isValidRoomId(currentRoomId)) {
				console.warn(`Invalid roomId: ${currentRoomId}`);
				statusLabel = 'INVALID ROOM';
				return;
			}
			const safeRoomId = escapeFilterValue(currentRoomId);

			try {
				pb = new PocketBase(pocketbaseUrl);
				const room = await pb.collection('rooms').getOne(safeRoomId);
				if (!destroyed) {
					const mappedRoom = mapRoom(room);
					roomName = mappedRoom.name;
					roomLocation = mappedRoom.location;
				}
			} catch (err) {
				console.error(`หาห้องไอดี ${currentRoomId} ไม่เจอในระบบ`, err);
			}

			const POLL_INTERVAL_MS = 15_000;
			let pollTimer: number | null = null;

			async function fetchAndSetBookings() {
				if (destroyed) return;
				try {
					const res = await fetch(`/api/rooms/${safeRoomId}/bookings`);
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const data = await res.json();
					if (destroyed) return;
					bookings = (data.bookings ?? []).map((rec: any) => mapRecord(rec as BookingRecord));
					statusLabel = 'LIVE';
					updateDerivedState();
					await generateQrCode();
				} catch (err) {
					console.error('[room] fetch bookings failed:', err);
					if (!destroyed) {
						statusLabel = 'OFFLINE';
						bookings = sampleBookings;
					}
				}
			}

			await fetchAndSetBookings();
			pollTimer = window.setInterval(fetchAndSetBookings, POLL_INTERVAL_MS);

			(window as any).__roomPollTimer = pollTimer;
		}

		void initRealtimeSystem();

		return () => {
			destroyed = true;
			window.clearInterval(clockTimer);
			const t = (window as any).__roomPollTimer;
			if (t) {
				window.clearInterval(t);
				(window as any).__roomPollTimer = null;
			}
		};
	});
</script>

<svelte:head>
	<title>{roomName} | Panel Display</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div
	class="min-h-screen w-screen bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-slate-100 font-['Inter','Prompt',sans-serif] antialiased transition-colors duration-300"
>
	<div class="mx-auto flex min-h-screen max-w-[1300px] flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
		<!-- 1. Header -->
		<RoomHeader {roomName} {roomLocation} {clockText} {dateText} {statusLabel} />

		<!-- 2. Main Grid Layout -->
		<main class="grid flex-1 min-h-0 gap-6 grid-cols-1 lg:grid-cols-[1.6fr_0.7fr] items-start">
			<!-- Left column: Active Booking Card & Queue List -->
			<div class="flex flex-col gap-6 min-h-0">
				<ActiveBookingCard
					{bookingViewState}
					{currentBooking}
					{progressNote}
					{progressPercent}
				/>
				<UpcomingBookingsList {upcomingBookings} {roomLocation} />
			</div>

			<!-- Right column: QR Booking Widget -->
			<div class="lg:sticky lg:top-24">
				<QrBookingCard {qrCodeDataUrl} />
			</div>
		</main>
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
</style>
