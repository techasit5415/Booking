<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import PocketBase from 'pocketbase';
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import MonthlyStatusCalendar from '$lib/components/MonthlyStatusCalendar.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { CalendarPlus } from '@lucide/svelte';

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';
	const CALENDAR_CELLS = 42; // 6 weeks × 7 days

	// Hoisted formatters (สร้างครั้งเดียว reuse ได้)
	const BANGKOK_TIME_FORMAT = new Intl.DateTimeFormat('th-TH', {
		timeZone: 'Asia/Bangkok',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		hourCycle: 'h23'
	});
	const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' });

	// === Security: ป้องกัน PocketBase filter injection ===
	const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

	function isValidRoomId(id: string | undefined): id is string {
		return typeof id === 'string' && SAFE_ID_PATTERN.test(id);
	}

	function escapeFilterValue(value: string): string {
		return value.replace(/[\\"'\n\r\t]/g, '\\$&');
	}

	function formatToBangkokTime(utcTimeString: string): string {
		if (!utcTimeString) return '--:--';
		try {
			return BANGKOK_TIME_FORMAT.format(new Date(utcTimeString.replace(' ', 'T')));
		} catch {
			return '--:--';
		}
	}

	function formatToBangkokDate(utcTimeString: string): string {
		if (!utcTimeString) return '';
		return BANGKOK_DATE_FORMAT.format(new Date(utcTimeString.replace(' ', 'T')));
	}

	let currentRoomId = $derived(page.params.roomId);
	let selectedRoomId = $state<string>('');
	let calendarDays = $state<any[]>([]);
	let clockText = $state('');
	let dateText = $state('');
	let currentMonthName = $state('');
	let rawRooms = $state<any[]>([]);
	let pb: PocketBase | null = null;

	let currentRoomName = $derived(
		rawRooms.find((r) => r.id === currentRoomId)?.name ?? 'กำลังโหลดข้อมูลห้อง...'
	);

	// sync URL → local state (กรณีเปิดลิงก์ตรง หรือ back/forward)
	$effect(() => {
		const urlId = currentRoomId;
		if (urlId) {
			untrack(() => {
				if (selectedRoomId !== urlId) {
					selectedRoomId = urlId;
				}
			});
		}
	});

	function generateMonthGridStructure(rooms: any[], bookings: any[]) {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const startOffset = firstDayOfMonth.getDay();
		const startDate = new Date(firstDayOfMonth);
		startDate.setDate(startDate.getDate() - startOffset);

		const daysArray: any[] = [];
		const todayStr = BANGKOK_DATE_FORMAT.format(now);

		for (let i = 0; i < CALENDAR_CELLS; i++) {
			const currentLoopDate = new Date(startDate);
			currentLoopDate.setDate(startDate.getDate() + i);

			const dateStrKey = `${currentLoopDate.getFullYear()}-${String(currentLoopDate.getMonth() + 1).padStart(2, '0')}-${String(currentLoopDate.getDate()).padStart(2, '0')}`;
			const isCurrentMonth = currentLoopDate.getMonth() === month;

			const cellStartEpoch = Date.parse(`${dateStrKey}T00:00:00+07:00`);
			const cellEndEpoch = Date.parse(`${dateStrKey}T23:59:59+07:00`);

			const matchedBookings = bookings
				.filter((b) => {
					if (!b.start_time || !b.end_time) return false;

					try {
						const bookingStartEpoch = Date.parse(b.start_time.replace(' ', 'T'));
						const bookingEndEpoch = Date.parse(b.end_time.replace(' ', 'T'));

						const isOverlapping =
							bookingStartEpoch <= cellEndEpoch && bookingEndEpoch >= cellStartEpoch;
						const isStatusValid = b.status === 'approved' || b.status === 'confirmed';
						const isThisRoom = b.field === currentRoomId;

						return isOverlapping && isStatusValid && isThisRoom;
					} catch (e) {
						return false;
					}
				})
				.sort(
					(a, b) =>
						Date.parse(a.start_time.replace(' ', 'T')) -
						Date.parse(b.start_time.replace(' ', 'T'))
				)
				.map((b) => {
					const roomInfo = rooms.find((r) => r.id === b.field);
					const startTimeTH = formatToBangkokTime(b.start_time);
					const endTimeTH = formatToBangkokTime(b.end_time);

					const bookingStartDateOnly = formatToBangkokDate(b.start_time);
					const bookingEndDateOnly = formatToBangkokDate(b.end_time);

					let displayTime = `${startTimeTH} - ${endTimeTH}`;
					if (bookingStartDateOnly !== dateStrKey && bookingEndDateOnly === dateStrKey) {
						displayTime = `จนถึง ${endTimeTH}`;
					} else if (bookingStartDateOnly === dateStrKey && bookingEndDateOnly !== dateStrKey) {
						displayTime = `${startTimeTH} ➔ ข้ามวัน`;
					} else if (bookingStartDateOnly !== dateStrKey && bookingEndDateOnly !== dateStrKey) {
						displayTime = `จองทั้งวัน ➔`;
					}

					return {
						title: b.title || 'Untitled',
						time: displayTime,
						roomName: roomInfo ? roomInfo.name : 'Unknown Room'
					};
				});

			daysArray.push({
				dateKey: dateStrKey,
				dayNumber: currentLoopDate.getDate(),
				isCurrentMonth,
				isToday: dateStrKey === todayStr,
				bookings: matchedBookings
			});
		}
		return daysArray;
	}

	onMount(() => {
		function updateClock() {
			const now = new Date();
			clockText = now.toLocaleTimeString('th-TH', { hour12: false, hourCycle: 'h23' });
			dateText = now.toLocaleDateString('th-TH', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
			currentMonthName = now.toLocaleDateString('th-TH', { month: 'long' });
		}

		updateClock();
		const clockTimer = window.setInterval(updateClock, 1000);

		return () => {
			window.clearInterval(clockTimer);
		};
	});

	// ✨ Reactive data fetching - re-run เมื่อ currentRoomId เปลี่ยน
	$effect(() => {
		const roomId = currentRoomId;
		if (!roomId || !pocketbaseUrl) return;

		let cancelled = false;
		calendarDays = [];

		(async () => {
			if (!pb) pb = new PocketBase(pocketbaseUrl);

			try {
				const existingRooms = untrack(() => rawRooms);
				let rooms = existingRooms;
				if (rooms.length === 0) {
					rooms = await pb!.collection('rooms').getFullList({ sort: 'name' });
					if (cancelled) return;
					rawRooms = rooms;
				}

				if (!isValidRoomId(roomId)) {
					console.warn(`Invalid roomId format: ${roomId}`);
					return;
				}
				const safeRoomId = escapeFilterValue(roomId);

				// ✅ ใช้ public endpoint + polling แทน PB direct (Dashboard ไม่ต้อง login)
				const POLL_INTERVAL_MS = 30_000;
				let pollTimer: number | null = null;

				async function fetchAndRender() {
					if (cancelled) return;
					try {
						const res = await fetch(`/api/rooms/${safeRoomId}/bookings`);
						if (!res.ok) throw new Error(`HTTP ${res.status}`);
						const data = await res.json();
						if (cancelled) return;
						calendarDays = generateMonthGridStructure(rooms, data.bookings ?? []);
					} catch (err) {
						console.error('[dashboard] fetch bookings failed:', err);
					}
				}

				await fetchAndRender();
				pollTimer = window.setInterval(fetchAndRender, POLL_INTERVAL_MS);
				(window as any).__dashPollTimer = pollTimer;
			} catch (err) {
				console.error(err);
			}
		})();

		return () => {
			cancelled = true;
			const t = (window as any).__dashPollTimer;
			if (t) {
				window.clearInterval(t);
				(window as any).__dashPollTimer = null;
			}
		};
	});

	function handleRoomChange(value: string | undefined) {
		if (value) goto(`/Dashboard/${value}`);
	}
</script>

<svelte:head>
	<title>ตาราง {currentRoomName} | Booking</title>
</svelte:head>

<div
	class="bg-background text-foreground min-h-screen w-screen font-['Inter','Prompt',sans-serif] antialiased"
>
	<div
		class="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-10 px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10"
	>
		<!-- ============ HEADER ============ -->
		<header
			class="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between"
		>
			<div class="flex flex-col gap-1.5">
				<div
					class="text-muted-foreground flex items-center gap-3 text-[14px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="bg-foreground inline-block h-1.5 w-1.5 rounded-full"></span>
					Room Schedule · {currentMonthName}
				</div>
				<h1 class="text-4xl font-bold tracking-tight md:text-5xl">
					{currentRoomName}
				</h1>
			</div>

			<div class="flex flex-col items-start gap-1 md:items-end">
				<div
					class="font-mono text-3xl font-medium tabular-nums md:text-4xl"
				>
					{clockText}
				</div>
				<div class="text-muted-foreground text-xs font-medium md:text-sm">
					{dateText}
				</div>
			</div>
		</header>

		<!-- ============ CONTROLS ============ -->
		<div
			class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<!-- Room selector + Book button -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-3">
					<label
						for="room-select"
						class="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase"
					>
						Room
					</label>

					<Select.Root bind:value={selectedRoomId} onValueChange={handleRoomChange}>
						<Select.Trigger id="room-select" class="w-[200px]">
							<Select.Value placeholder="กำลังโหลด..." />
						</Select.Trigger>
						<Select.Content>
							{#each rawRooms as room (room.id)}
								<Select.Item value={room.id} label={room.name}>
									{room.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button href="/book" class="gap-1.5">
					<CalendarPlus class="h-4 w-4" />
					จองห้อง
				</Button>
			</div>

			<ThemeToggle />
		</div>

		<Separator />

		<!-- ============ CALENDAR ============ -->
		<main class="flex-1">
			<MonthlyStatusCalendar {calendarDays} />
		</main>
	</div>
</div>