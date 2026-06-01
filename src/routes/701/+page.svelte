<script lang="ts">
	import { onMount } from 'svelte';
	import PocketBase from 'pocketbase';
	import QRCode from 'qrcode';
	import { env } from '$env/dynamic/public';

// Toggle debug logs here (set to false to disable)
const DEBUG = false;

	type BookingItem = {
		id: string;
		title: string;
		detailLabel: string;
		startTime: string;
		startEpoch?: number | null;
		endTime: string;
		endEpoch?: number | null;
		status: 'confirmed' | 'pending' | 'cancelled';
		bookerName: string;
	};

		type BookingRecord = Record<string, unknown> & {
		expand?: {
			field?: {
				name?: unknown;
			};
		};
	};

	type RoomItem = {
		name: string;
		location: string;
		booking_url: string;
	};

	type BookingViewState = 'active' | 'idle';

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';
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
		},
		{
			id: '2',
			title: 'Dev Sprint Planning',
			detailLabel: 'ห้องประชุม B',
			startTime: '15:30',
			endTime: '16:30',
			status: 'confirmed',
            bookerName: 'คุณสมหญิง'
		},
		{
			id: '3',
			title: 'HR Interview (Candidate A)',
			detailLabel: 'ห้องสัมภาษณ์',
			startTime: '17:00',
			endTime: '18:00',
			status: 'pending',
            bookerName: 'คุณสมปอง'
		}
	];

	let clockText = $state('');
	let dateText = $state('');
	let qrCodeDataUrl = $state('');
	let bookings = $state(sampleBookings);
	let connectionStatus = $state<'connecting' | 'live' | 'demo'>(pocketbaseUrl ? 'connecting' : 'demo');
	let roomName = $state(defaultRoomName);
	let roomLocation = $state(defaultRoomLocation);
	let bookingUrl = $state(defaultBookingUrl);
	let currentBooking = $state(sampleBookings[0]);
	let upcomingBookings = $state(sampleBookings.slice(1));
	let progressPercent = $state(68);
	let progressNote = $state('');
	let bookingViewState = $state<BookingViewState>('idle');
	let statusLabel = $state('DEMO MODE');

	function updateClock() {
		const now = new Date();
		clockText = now.toLocaleTimeString('th-TH', { hour12: false });
		dateText = now.toLocaleDateString('th-TH', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		updateProgressBar();
	}

	function updateDerivedState() {
		const now = Date.now();
		const activeBooking = bookings.find((booking) => {
			const startEpoch = booking.startEpoch ?? null;
			const endEpoch = booking.endEpoch ?? null;

			if (startEpoch === null || endEpoch === null) {
				return false;
			}
            if(booking.status === 'cancelled'|| booking.status === 'pending') {
                return false;
            }

			return now >= startEpoch && now < endEpoch;
		});

		const nextBookings = bookings.filter((booking) => {
			const startEpoch = booking.startEpoch ?? null;

			if (startEpoch === null) {
				return false;
			}
            if (booking.status === 'cancelled') {
            return false;
        }
			return startEpoch > now;
		});

		bookingViewState = activeBooking ? 'active' : 'idle';
		currentBooking = activeBooking ?? {
			id: 'empty',
			title: 'ไม่มีการจองในตอนนี้',
			detailLabel: '-',
			startTime: '--:--',
			endTime: '--:--',
			status: 'cancelled',
			bookerName: '-'
		};
		upcomingBookings = nextBookings;
		updateProgressBar();
	}

	function timeToMinutes(value: string) {
		// deprecated: keep for compatibility but prefer parseTimeToEpoch
		const match = /^(\d{1,2}):(\d{2})$/.exec(value);
		if (!match) return null;
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
		return hours * 60 + minutes;
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

		// HH:MM (no date) -> assume today local
		const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
		if (hhmm) {
			const epoch = parseBangkokTimeToEpoch(value);
			if (epoch === null) return null;
			const now = Date.now();
			const twelveHours = 12 * 60 * 60 * 1000;
			if (epoch - now > twelveHours) {
				const adjusted = epoch - 24 * 60 * 60 * 1000;
				if (DEBUG) console.log('[parseTimeToEpoch] HH:MM adjusted to yesterday', value, new Date(adjusted).toISOString());
				return adjusted;
			}
			if (DEBUG) console.log('[parseTimeToEpoch] HH:MM parsed as today', value, new Date(epoch).toISOString());
			return epoch;
		}

		// Try ISO / Date parse
			const normalized = String(value).replace(' ', 'T');
			const parsed = Date.parse(normalized);
		if (Number.isNaN(parsed)) return null;
		return parsed;
	}

	function formatDisplayTime(value: unknown): string {
		if (typeof value !== 'string' || !value.trim()) {
			return '--:--';
		}

		const trimmed = value.trim();
		if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
			return trimmed;
		}

		const normalized = trimmed.replace(' ', 'T');
		const parsed = Date.parse(normalized);
		if (Number.isNaN(parsed)) {
			return trimmed;
		}

		return new Date(parsed).toLocaleTimeString('th-TH', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function updateProgressBar() {
		if (currentBooking.id === 'empty') {
			progressPercent = 0;
			progressNote = 'ยังไม่มีรายการ';
			return;
		}

		const startEpoch = currentBooking.startEpoch ?? parseTimeToEpoch(currentBooking.startTime);
		const endEpoch = currentBooking.endEpoch ?? parseTimeToEpoch(currentBooking.endTime);
		const now = Date.now();

		if (startEpoch === null || endEpoch === null || endEpoch <= startEpoch) {
			// If parsing failed, fallback to showing something reasonable
			progressPercent = bookings.length > 0 ? 100 : 0;
			progressNote = bookings.length > 0 ? 'กำลังใช้งาน' : 'ยังไม่มีรายการ';
			return;
		}

		if (now < startEpoch) {
			const mins = Math.ceil((startEpoch - now) / 60000);
			progressPercent = 0;
			progressNote = `จะเริ่มใน ${mins} นาที`;
			return;
		}

		if (now >= endEpoch) {
			progressPercent = 100;
			progressNote = 'จบการจองแล้ว';
			return;
		}

		const pct = ((now - startEpoch) / (endEpoch - startEpoch)) * 100;
		progressPercent = Math.max(0, Math.min(100, Math.round(pct)));
		const minsLeft = Math.ceil((endEpoch - now) / 60000);
		progressNote = `เหลืออีก ${minsLeft} นาที`;
		if (DEBUG) console.log('[updateProgressBar]', {
			startEpoch: new Date(startEpoch).toISOString(),
			endEpoch: new Date(endEpoch).toISOString(),
			now: new Date(now).toISOString(),
			progressPercent,
			progressNote
		});
	}

	async function generateQrCode() {
		qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
			width: 280,
			margin: 1,
			color: {
				dark: '#0f172a',
				light: '#ffffff'
			}
		});
	}

	function mapRecord(record: BookingRecord): BookingItem {
		const rawStatus = String(record.status ?? 'pending');
		const status: BookingItem['status'] =
			rawStatus === 'pending' || rawStatus === 'cancelled' ? rawStatus : 'confirmed';
		const bookingDetail = String(record.detailLabel ?? '').trim();
		const expandedFieldName = String(record.expand?.field?.name ?? '').trim();
		const detailLabel = bookingDetail || expandedFieldName || String(record.field ?? 'Unknown room');
        const bookerName = String(record.bookerName ?? '').trim();
		const startRaw = record.start_time ?? '';
		const endRaw = record.end_time ?? '';

		let startEpoch: number | null = null;
		let endEpoch: number | null = null;

		// If start_time is ISO or full date, parse directly
		if (typeof startRaw === 'string' && !/^(\d{1,2}:\d{2})$/.test(startRaw)) {
			const normalizedStart = startRaw.replace(' ', 'T');
			const p = Date.parse(normalizedStart);
			if (!Number.isNaN(p)) startEpoch = p;
		}

		if (typeof endRaw === 'string' && !/^(\d{1,2}:\d{2})$/.test(endRaw)) {
			const normalizedEnd = endRaw.replace(' ', 'T');
			const p = Date.parse(normalizedEnd);
			if (!Number.isNaN(p)) endEpoch = p;
		}

		// If we have a date field, and times are HH:MM, combine them with that date
		if ((startEpoch === null || endEpoch === null) && record.date) {
			const dateParsed = Date.parse(String(record.date));
			if (!Number.isNaN(dateParsed)) {
				if (typeof startRaw === 'string' && /^(\d{1,2}:\d{2})$/.test(startRaw)) {
					const hhmm = /^(\d{1,2}):(\d{2})$/.exec(startRaw) as RegExpExecArray;
					const d = new Date(dateParsed);
					d.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
					startEpoch = d.getTime();
				}
				if (typeof endRaw === 'string' && /^(\d{1,2}:\d{2})$/.test(endRaw)) {
					const hhmm = /^(\d{1,2}):(\d{2})$/.exec(endRaw) as RegExpExecArray;
					const d2 = new Date(dateParsed);
					d2.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
					endEpoch = d2.getTime();
				}
			}
		}

		if (DEBUG) console.log('[mapRecord] parsed', {
			id: record.id,
			title: record.title,
			startRaw,
			endRaw,
			startEpoch: startEpoch ? new Date(startEpoch).toISOString() : null,
			endEpoch: endEpoch ? new Date(endEpoch).toISOString() : null,
			detailLabel,
            bookerName,
		});

		return {
			id: String(record.id ?? crypto.randomUUID()),
			title: String(record.title ?? 'Untitled booking'),
			detailLabel,
            bookerName,
			startTime: formatDisplayTime(startRaw),
			startEpoch,
			endTime: formatDisplayTime(endRaw),
			endEpoch,
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

	async function refreshRoomData(pb: PocketBase, destroyed: boolean) {
		const rooms = await pb.collection('rooms').getFullList({ sort: '-created' });
		const room = rooms[0] as Record<string, unknown> | undefined;

		if (destroyed || !room) {
			await generateQrCode();
			return;
		}

		const mappedRoom = mapRoom(room);
		roomName = mappedRoom.name;
		roomLocation = mappedRoom.location;
		bookingUrl = mappedRoom.booking_url || bookingUrl;
		connectionStatus = 'live';
		statusLabel = 'REALTIME';
		await generateQrCode();
	}

	onMount(() => {
		updateClock();
		updateDerivedState();

		const clockTimer = window.setInterval(updateClock, 1000);
		let destroyed = false;

		async function loadRoom() {
			if (!pocketbaseUrl) {
				await generateQrCode();
				return;
			}

			try {
				const pb = new PocketBase(pocketbaseUrl);
				await refreshRoomData(pb, destroyed);

				await pb.collection('rooms').subscribe('*', async () => {
					await refreshRoomData(pb, destroyed);
				});
			} catch (error) {
				console.error('PocketBase room load failed', error);
				if (DEBUG) console.log('[loadRoom] room data loaded');
				await generateQrCode();
			}
		}

		async function loadBookings() {
			if (!pocketbaseUrl) {
				connectionStatus = 'demo';
				statusLabel = 'DEMO MODE';
				return;
			}

			try {
				const pb = new PocketBase(pocketbaseUrl);
				const records = await pb.collection('bookings').getFullList({ sort: 'start_time', expand: 'field' });
				if (DEBUG) console.log('[loadBookings] fetched', records.length, records[0]);

				if (destroyed) {
					return;
				}
				bookings = records.map((record) => mapRecord(record as BookingRecord));
				updateDerivedState();
				connectionStatus = 'live';
				statusLabel = 'REALTIME';

				await pb.collection('bookings').subscribe('*', async () => {
					const nextRecords = await pb.collection('bookings').getFullList({ sort: 'start_time', expand: 'field' });
					bookings = nextRecords.map((record) => mapRecord(record as BookingRecord));
					updateDerivedState();
				});
			} catch (error) {
				console.error('PocketBase load failed', error);
				connectionStatus = 'demo';
				statusLabel = 'DEMO MODE';
				bookings = sampleBookings;
				updateDerivedState();
			}
		}

		void loadRoom();
		void loadBookings();

		return () => {
			destroyed = true;
			window.clearInterval(clockTimer);
		};
	});
</script>

<svelte:head>
	<title>{roomName} | Booking Dashboard</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen w-screen overflow-hidden bg-black p-4 text-slate-100 md:p-6 font-['Prompt',sans-serif]">
	<div class="flex min-h-screen flex-col gap-4 md:gap-6">
		<header class="flex flex-col gap-4 border-b border-slate-700/40 pb-4 md:flex-row md:items-center md:justify-between md:pb-5">
			<div class="flex items-center gap-4">
				<div class="rounded-2xl bg-indigo-600 px-4 py-3 text-lg font-extrabold tracking-[0.16em] text-white shadow-lg shadow-indigo-950/30">
					ROOM
				</div>
				<div>
					<h1 class="text-2xl font-bold text-white md:text-4xl">{roomName}</h1>
						<p class="mt-4 text-sm text-slate-400 md:text-base">ห้อง: {roomLocation}</p>
				</div>
			</div>

			<div class="text-left md:text-right">
				<div class="text-3xl font-extrabold leading-none text-indigo-300 md:text-5xl">{clockText}</div>
				<div class="mt-2 text-sm text-slate-400 md:text-base">{dateText}</div>
				<div class="mt-3 inline-flex rounded-full border border-indigo-400/20 bg-slate-950/80 px-3 py-1 text-xs font-bold tracking-[0.14em] text-indigo-300">
					{statusLabel}
				</div>
			</div>
		</header>

		<main class="grid flex-1 min-h-0 gap-4 md:gap-6 xl:grid-cols-[1.4fr_0.9fr]">
			<section class="flex min-h-0 flex-col gap-4 md:gap-6">
				<article class={`relative flex min-h-[280px] flex-1 flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-2xl shadow-black/30 md:p-7 ${bookingViewState === 'idle' ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-950/55 ' : 'border-red-500/20 bg-gradient-to-br from-red-950/55 '}`}>
					<div class={`absolute inset-y-0 left-0 w-2 bg-gradient-to-b ${bookingViewState === 'idle' ? 'from-emerald-400 via-lime-500 to-black' : 'from-red-500 via-orange-500 to-black'}`}></div>
					<div>
						<div class={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-[0.12em] md:text-sm ${bookingViewState === 'idle' ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300' : 'border-red-400/20 bg-red-500/15 text-red-300'}`}>
							<span class={`h-2 w-2 animate-pulse rounded-full ${bookingViewState === 'idle' ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
							{bookingViewState === 'idle' ? 'ว่าง' : currentBooking.status === 'pending' ? 'รออนุมัติ' : 'กำลังใช้งาน'}
						</div>
						<h2 class="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">{currentBooking.title}</h2>
						<p class="mt-3 text-lg text-slate-300 md:text-2xl">{currentBooking.startTime} - {currentBooking.endTime}</p>
						<p class="mt-3 text-sm text-slate-400 md:text-base">{bookingViewState === 'idle' ? 'ตอนนี้ไม่มีการจอง' : `รายละเอียด: ${currentBooking.detailLabel}`}</p>
                        <p class="mt-3 text-sm text-slate-400 md:text-base">
                            {`ผู้จอง: ${currentBooking.bookerName}`}
                        </p>

					</div>

					<div class="mt-6">
						<div class="mb-2 flex items-center justify-between text-xs text-slate-400 md:text-sm">
							<span>{progressNote}</span>
							<span class="font-semibold text-red-300">{progressPercent}%</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
							<div class="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={`width: ${progressPercent}%`}></div>
						</div>
					</div>
				</article>

				<article class="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-700/50 bg-slate-800/45 p-5 md:p-6">
					<h3 class="mb-4 text-xs font-semibold tracking-[0.16em] text-slate-400 md:text-sm">คิวถัดไปวันนี้</h3>
					<div class="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
						{#if upcomingBookings.length > 0}
							{#each upcomingBookings as booking}
								<div class="flex items-center justify-between gap-4 rounded-2xl border border-slate-700/60 bg-slate-900 px-4 py-3">
									<div>
										<p class="text-base font-semibold text-white md:text-lg">{booking.title}</p>
										<p class="mt-1 text-xs text-slate-400 md:text-sm">ห้อง: {roomLocation}</p>
									</div>
									<span class="shrink-0 rounded-xl bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 md:text-sm">{booking.startTime} - {booking.endTime}</span>
								</div>
							{/each}
						{:else}
							<div class="rounded-2xl border border-dashed border-slate-600 px-4 py-5 text-center text-sm text-slate-400">ไม่มีรายการจองถัดไป</div>
						{/if}
					</div>
				</article>
			</section>

			<section class="flex min-h-0 flex-col gap-4 md:gap-6">
				<article class="flex flex-1 flex-col items-center justify-center rounded-3xl border border-slate-700/50 bg-slate-800/40 p-5 text-center md:p-6">
					<h3 class="text-lg font-bold text-white md:text-xl">ต้องการจองห้องนี้?</h3>
					<p class="mt-1 text-xs text-slate-400 md:text-sm">สแกน QR code เพื่อเปิดหน้าจอง</p>

					<div class="mt-5 rounded-2xl bg-white p-3 shadow-xl shadow-black/25 md:p-4">
						{#if qrCodeDataUrl}
							<img class="h-48 w-48 md:h-56 md:w-56" src={qrCodeDataUrl} alt="QR code สำหรับจองห้อง" />
						{:else}
							<div class="grid h-48 w-48 place-items-center text-sm font-semibold text-slate-900 md:h-56 md:w-56">Loading QR</div>
						{/if}
					</div>

					<div class="mt-4 inline-flex rounded-full border border-indigo-400/20 bg-indigo-950/50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-indigo-300 md:text-sm">
						SCAN TO BOOK NOW
					</div>
				</article>

				<article class="flex items-start gap-3 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 to-slate-950 p-4 md:p-5">
					<div class="text-2xl">💡</div>
					<div>
						<h4 class="text-sm font-semibold text-indigo-300 md:text-base">ข้อแนะนำการใช้งาน</h4>
						<p class="mt-1 text-xs leading-relaxed text-slate-400 md:text-sm">ถ้าประชุมเสร็จก่อนกำหนด ให้กดคืนห้องในระบบ เพื่อให้คนอื่นใช้งานต่อได้ทันที</p>
					</div>
				</article>
			</section>
		</main>
	</div>
</div>
