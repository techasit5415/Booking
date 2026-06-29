<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { page } from "$app/state";
	import PocketBase from "pocketbase";
	import { env } from "$env/dynamic/public";
	import { goto } from "$app/navigation";
	import MonthlyStatusCalendar from "$lib/components/MonthlyStatusCalendar.svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import * as Select from "$lib/components/ui/select";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import { CalendarPlus, Sparkles } from "@lucide/svelte";
	import type { Room, Booking } from "$lib/types";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
	const CALENDAR_CELLS = 42; // 6 weeks × 7 days

	// Hoisted formatters (สร้างครั้งเดียว reuse ได้)
	const BANGKOK_TIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
		timeZone: "Asia/Bangkok",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		hourCycle: "h23",
	});
	const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Bangkok",
	});

	// === Security: ป้องกัน PocketBase filter injection ===
	const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

	function isValidRoomId(id: string | undefined): id is string {
		return typeof id === "string" && SAFE_ID_PATTERN.test(id);
	}

	function escapeFilterValue(value: string): string {
		return value.replace(/[\\"'\n\r\t]/g, "\\$&");
	}

	function formatToBangkokTime(utcTimeString: string): string {
		if (!utcTimeString) return "--:--";
		try {
			return BANGKOK_TIME_FORMAT.format(
				new Date(utcTimeString.replace(" ", "T")),
			);
		} catch {
			return "--:--";
		}
	}

	function formatToBangkokDate(utcTimeString: string): string {
		if (!utcTimeString) return "";
		return BANGKOK_DATE_FORMAT.format(
			new Date(utcTimeString.replace(" ", "T")),
		);
	}

	let currentRoomId = $derived(page.params.roomId);
	let selectedRoomId = $state<string>("");
	let calendarDays = $state<any[]>([]);
	let clockText = $state("");
	let dateText = $state("");
	let currentMonthName = $state("");
	let rawRooms = $state<Room[]>([]);
	let pb: PocketBase | null = null;

	let currentRoomName = $derived(
		rawRooms.find((r) => r.id === currentRoomId)?.name ??
			"กำลังโหลดข้อมูลห้อง...",
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

	function generateMonthGridStructure(
		roomsList: Room[],
		bookingsList: Booking[],
	) {
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

			const dateStrKey = `${currentLoopDate.getFullYear()}-${String(currentLoopDate.getMonth() + 1).padStart(2, "0")}-${String(currentLoopDate.getDate()).padStart(2, "0")}`;
			const isCurrentMonth = currentLoopDate.getMonth() === month;

			const cellStartEpoch = Date.parse(`${dateStrKey}T00:00:00+07:00`);
			const cellEndEpoch = Date.parse(`${dateStrKey}T23:59:59+07:00`);

			const matchedBookings = bookingsList
				.filter((b) => {
					if (!b.start_time || !b.end_time) return false;

					try {
						const bookingStartEpoch = Date.parse(
							b.start_time.replace(" ", "T"),
						);
						const bookingEndEpoch = Date.parse(
							b.end_time.replace(" ", "T"),
						);

						const isOverlapping =
							bookingStartEpoch <= cellEndEpoch &&
							bookingEndEpoch >= cellStartEpoch;
						const isStatusValid =
							b.status === "approved" || b.status === "confirmed";
						const isThisRoom = b.field === currentRoomId;

						return isOverlapping && isStatusValid && isThisRoom;
					} catch (e) {
						return false;
					}
				})
				.sort(
					(a, b) =>
						Date.parse(a.start_time.replace(" ", "T")) -
						Date.parse(b.start_time.replace(" ", "T")),
				)
				.map((b) => {
					const roomInfo = roomsList.find((r) => r.id === b.field);
					const startTimeTH = formatToBangkokTime(b.start_time);
					const endTimeTH = formatToBangkokTime(b.end_time);

					const bookingStartDateOnly = formatToBangkokDate(
						b.start_time,
					);
					const bookingEndDateOnly = formatToBangkokDate(b.end_time);

					let displayTime = `${startTimeTH} - ${endTimeTH}`;
					if (
						bookingStartDateOnly !== dateStrKey &&
						bookingEndDateOnly === dateStrKey
					) {
						displayTime = `จนถึง ${endTimeTH}`;
					} else if (
						bookingStartDateOnly === dateStrKey &&
						bookingEndDateOnly !== dateStrKey
					) {
						displayTime = `${startTimeTH} ➔ ข้ามวัน`;
					} else if (
						bookingStartDateOnly !== dateStrKey &&
						bookingEndDateOnly !== dateStrKey
					) {
						displayTime = `จองทั้งวัน ➔`;
					}

					return {
						title: b.title || "Untitled",
						time: displayTime,
						roomName: roomInfo ? roomInfo.name : "Unknown Room",
					};
				});

			daysArray.push({
				dateKey: dateStrKey,
				dayNumber: currentLoopDate.getDate(),
				isCurrentMonth,
				isToday: dateStrKey === todayStr,
				bookings: matchedBookings,
			});
		}
		return daysArray;
	}

	onMount(() => {
		function updateClock() {
			const now = new Date();
			clockText = now.toLocaleTimeString("th-TH", {
				hour12: false,
				hourCycle: "h23",
			});
			dateText = now.toLocaleDateString("th-TH", {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			});
			currentMonthName = now.toLocaleDateString("th-TH", {
				month: "long",
			});
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
					rooms = await pb!
						.collection("rooms")
						.getFullList<Room>({ sort: "name" });
					if (cancelled) return;
					rawRooms = rooms;
				}

				if (!isValidRoomId(roomId)) {
					console.warn(`Invalid roomId format: ${roomId}`);
					return;
				}
				const safeRoomId = escapeFilterValue(roomId);

				const POLL_INTERVAL_MS = 30_000;
				let pollTimer: number | null = null;

				async function fetchAndRender() {
					if (cancelled) return;
					try {
						const res = await fetch(
							`/api/rooms/${safeRoomId}/bookings`,
						);
						if (!res.ok) throw new Error(`HTTP ${res.status}`);
						const data = await res.json();
						if (cancelled) return;
						calendarDays = generateMonthGridStructure(
							rooms,
							data.bookings ?? [],
						);
					} catch (err) {
						console.error(
							"[dashboard] fetch bookings failed:",
							err,
						);
					}
				}

				await fetchAndRender();
				pollTimer = window.setInterval(
					fetchAndRender,
					POLL_INTERVAL_MS,
				);
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
	<title>ตาราง {currentRoomName} | Dashboard</title>
</svelte:head>

<div
	class="bg-background text-foreground min-h-screen w-screen font-['Inter','Prompt',sans-serif] antialiased"
>
	<div
		class="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-6 py-6 md:px-10 md:py-8"
	>
		<!-- ============ HEADER ============ -->
		<div
			class="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between"
		>
			<div class="space-y-1">
				<div
					class="text-zinc-500 dark:text-zinc-400 text-xs font-bold tracking-wider uppercase flex items-center gap-1"
				>
					Room Schedule · {currentMonthName}
				</div>
				<h1
					class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
				>
					{currentRoomName}
				</h1>
				<p class="text-zinc-500 dark:text-zinc-400 text-sm">
					ตารางเวลาการจองใช้งานห้องประชุมรายเดือน
				</p>
			</div>

			<div class="flex flex-col items-start gap-1 md:items-end">
				<div
					class="font-mono text-xl md:text-2xl font-bold text-zinc-800 dark:text-zinc-250 leading-none"
				>
					{clockText}
				</div>
				<div
					class="text-zinc-400 dark:text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-0.5"
				>
					{dateText}
				</div>
			</div>
		</div>

		<!-- ============ CONTROLS ============ -->
		<div
			class="border border-zinc-200 dark:border-zinc-850 bg-card rounded-xl p-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
		>
			<!-- Room selector -->
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-3">
					<label
						for="room-select"
						class="text-zinc-650 dark:text-zinc-400 text-xs font-bold tracking-wider uppercase font-['Prompt',sans-serif]"
					>
						เลือกห้อง:
					</label>

					<Select.Root
						bind:value={selectedRoomId}
						onValueChange={handleRoomChange}
					>
						<Select.Trigger
							id="room-select"
							class="w-[200px] rounded-lg border-zinc-200 dark:border-zinc-800"
						>
							<Select.Value placeholder="กำลังโหลด..." />
						</Select.Trigger>
						<Select.Content class="rounded-lg shadow-lg">
							{#each rawRooms as room (room.id)}
								<Select.Item
									value={room.id}
									label={room.name}
									class="rounded-md"
								>
									{room.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button
					href="/book"
					class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
				>
					<CalendarPlus class="h-4 w-4 mr-2" />
					จองห้องเรียนนี้
				</Button>
			</div>

			<div class="flex items-center gap-3">
				<ThemeToggle />
			</div>
		</div>

		<Separator class="border-zinc-200 dark:border-zinc-850" />

		<!-- ============ CALENDAR ============ -->
		<main class="flex-1">
			<MonthlyStatusCalendar {calendarDays} />
		</main>
	</div>
</div>

<style>
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap");
</style>
