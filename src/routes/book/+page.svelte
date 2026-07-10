<script lang="ts">
	import { onMount, untrack } from "svelte";
	import PocketBase from "pocketbase";
	import { env } from "$env/dynamic/public";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import Topbar from "$lib/components/Topbar.svelte";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import type { Room, Booking } from "$lib/types";
	import { fade, slide } from "svelte/transition";

	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import {
		Alert,
		AlertTitle,
		AlertDescription,
	} from "$lib/components/ui/alert";
	import { Separator } from "$lib/components/ui/separator";
	import { toast } from "svelte-sonner";
	import BookingConfirmDialog from "$lib/components/BookingConfirmDialog.svelte";

	import {
		CheckCircle2,
		Loader2,
		Users,
		FileText,
		CalendarPlus,
		AlertCircle,
		Lightbulb,
		MapPin,
		Calendar,
		Clock,
		Check,
	} from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import { authenticatePbFromCookie } from "$lib/pocketbase";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";

	// Hoisted formatters
	const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Bangkok",
	});

	// === Security: validate roomId before using in filter ===
	const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
	function isValidRoomId(id: string): boolean {
		return typeof id === "string" && SAFE_ID_PATTERN.test(id);
	}

	/** แปลง ISO datetime เป็น YYYY-MM-DD ใน Asia/Bangkok */
	function getBookingDateInBangkok(iso: string): string {
		try {
			return BANGKOK_DATE_FORMAT.format(new Date(iso.replace(" ", "T")));
		} catch {
			return "";
		}
	}

	let rooms = $state<Room[]>([]);
	let loadingRooms = $state(true);

	// Superadmin status check
	const user = $derived(page.data.user);
	const isAdmin = $derived(user?.isAdmin ?? false);

	// form fields
	let selectedRoomId = $state<string>("");
	let bookingDate = $state<string>(getTodayDate());
	let startTime = $state<string>("09:00");
	let endTime = $state<string>("10:00");
	let title = $state<string>("");
	let notes = $state<string>("");
	let isRecurring = $state(false);
	let recurringUntil = $state<string>("");
	let recurringDays = $state<number[]>([]);
	let customBookerName = $state("");
	let showConfirm = $state(false);

	const THAI_DAYS = [
		"อาทิตย์",
		"จันทร์",
		"อังคาร",
		"พุธ",
		"พฤหัสบดี",
		"ศุกร์",
		"เสาร์",
	];
	const recurringDaysText = $derived(
		recurringDays
			.map((d) => THAI_DAYS[d])
			.filter(Boolean)
			.join(", "),
	);

	function getDayOfWeek(dateStr: string): number {
		if (!dateStr) return 1;
		try {
			return new Date(`${dateStr}T00:00:00`).getDay();
		} catch {
			return 1;
		}
	}

	$effect(() => {
		const dateVal = bookingDate;
		untrack(() => {
			if (dateVal) {
				const day = getDayOfWeek(dateVal);
				if (!recurringDays.includes(day)) {
					recurringDays = [day];
				}
			}
		});
	});

	function toggleDay(day: number) {
		if (recurringDays.includes(day)) {
			if (recurringDays.length > 1) {
				recurringDays = recurringDays.filter((d) => d !== day);
			} else {
				toast.error("ต้องเลือกวันจองซ้ำอย่างน้อย 1 วัน");
			}
		} else {
			recurringDays = [...recurringDays, day].sort();
		}
	}

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
		return BANGKOK_DATE_FORMAT.format(new Date());
	}

	function toBangkokIso(dateStr: string, hhmm: string): string {
		return `${dateStr}T${hhmm}:00+07:00`;
	}

	/** format เวลาให้แสดงเป็น HH:MM (Bangkok) */
	function formatDisplayTime(value: string): string {
		try {
			return new Intl.DateTimeFormat("en-GB", {
				timeZone: "Asia/Bangkok",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				hourCycle: "h23",
			}).format(new Date(value.replace(" ", "T")));
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
			const data = await pb
				.collection("rooms")
				.getFullList<Room>({ sort: "name" });
			rooms = data;
		} catch (err) {
			console.error("Failed to load rooms", err);
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
			const data = await pb.collection("bookings").getFullList({
				filter: `field = "${safeId}"`,
				sort: "start_time",
			});
			const allBookings = data as unknown as Booking[];

			existingBookings = allBookings.filter((b) => {
				if (b.status === "cancelled") return false;
				return getBookingDateInBangkok(b.start_time) === bookingDate;
			});
		} catch (err) {
			console.error("Failed to load bookings", err);
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
		if (!selectedRoomId) return "กรุณาเลือกห้องประชุม";
		if (!isValidRoomId(selectedRoomId)) return "รหัสห้องไม่ถูกต้อง";
		if (!bookingDate) return "กรุณาเลือกวันที่ต้องการจอง";
		if (!startTime || !endTime) return "กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด";
		if (startTime >= endTime) return "เวลาเริ่มต้องน้อยกว่าเวลาจบ";
		if (!title.trim()) return "กรุณากรอกหัวข้อการจอง";
		if (isRecurring) {
			if (!recurringUntil) return "กรุณาระบุวันที่สิ้นสุดการจองซ้ำ";
			if (recurringUntil < bookingDate)
				return "วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น";
			if (recurringDays.length === 0)
				return "กรุณาเลือกวันในสัปดาห์ที่ต้องการจองซ้ำ";
		}
		return null;
	}

	function checkOverlap(bookings: Booking[]): Booking | null {
		const newStartMs = Date.parse(toBangkokIso(bookingDate, startTime));
		const newEndMs = Date.parse(toBangkokIso(bookingDate, endTime));

		for (const b of bookings) {
			if (b.status === "cancelled") continue;
			const bsMs = Date.parse(b.start_time.replace(" ", "T"));
			const beMs = Date.parse(b.end_time.replace(" ", "T"));
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
		const data = await pb.collection("bookings").getFullList({
			filter: `field = "${safeId}"`,
			sort: "start_time",
		});
		const all = data as unknown as Booking[];
		return all.filter((b) => {
			if (b.status === "cancelled") return false;
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
			submitError = "ระบบไม่พร้อมใช้งาน";
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

			// Open the confirmation dialog
			showConfirm = true;
		} catch (err: any) {
			console.error("Validation/Overlap check failed", err);
			submitError = err.message || "เกิดข้อผิดพลาดในการตรวจสอบห้อง";
			toast.error("ตรวจสอบข้อมูลไม่สำเร็จ", {
				description: submitError ?? "",
			});
		} finally {
			submitting = false;
		}
	}

	async function executeSubmit() {
		submitting = true;
		validationError = null;
		submitError = null;
		try {
			const response = await fetch("/api/bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					roomId: selectedRoomId,
					date: bookingDate,
					startTime,
					endTime,
					title: title.trim(),
					notes: notes.trim(),
					isRecurring,
					recurringUntil,
					recurringDays,
					customBookerName: customBookerName.trim() || undefined,
				}),
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ message: "ส่งคำขอไม่สำเร็จ" }));
				throw new Error(errorData.message || "เซิร์ฟเวอร์ปฏิเสธการจอง");
			}

			submitSuccess = true;
			title = "";
			notes = "";
			isRecurring = false;
			recurringUntil = "";
			recurringDays = [getDayOfWeek(bookingDate)];
			customBookerName = "";
			toast.success("ส่งคำขอจองเรียบร้อย", {
				description: "รอผู้ดูแลอนุมัติ",
			});

			showConfirm = false;
			await loadBookingsForSelected();
		} catch (err: any) {
			console.error("Submit failed", err);
			submitError =
				err.message || "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
			toast.error("ส่งคำขอไม่สำเร็จ", { description: submitError ?? "" });
			showConfirm = false;
		} finally {
			submitting = false;
		}
	}

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

	function getRoomName(id: string): string {
		return rooms.find((r) => r.id === id)?.name ?? "";
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

	<div class="mx-auto max-w-[1400px] px-6 py-6 md:px-10">
		<!-- Page Header: Simple & Professional -->
		<div
			class="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-8 md:flex-row md:items-end md:justify-between"
		>
			<div class="space-y-1">
				<h1
					class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
				>
					จองห้องประชุม
				</h1>
				<p class="text-zinc-500 dark:text-zinc-400 text-sm">
					เลือกห้องเรียน/ห้องประชุม ระบุวันเวลา
					และกรอกข้อมูลการจองใช้งาน
				</p>
			</div>
		</div>

		{#if submitSuccess}
			<!-- Clean Success State -->
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
							onclick={() => {
								submitSuccess = false;
							}}
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
		{:else}
			<form
				onsubmit={handleSubmit}
				class="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
			>
				<!-- LEFT COLUMN: Form Steps -->
				<div class="flex flex-col gap-6">
					<!-- 1. Room Selection Step -->
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
									<Loader2
										class="h-4 w-4 animate-spin text-indigo-600"
									/>
									กำลังโหลดรายการห้อง...
								</div>
							{:else if rooms.length === 0}
								<div
									class="text-zinc-400 dark:text-zinc-500 text-center py-6 text-xs italic"
								>
									ไม่พบห้องประชุมในขณะนี้
								</div>
							{:else}
								<div
									class="grid grid-cols-1 gap-3 sm:grid-cols-2"
								>
									{#each rooms as room (room.id)}
										<button
											type="button"
											onclick={() => selectRoom(room.id)}
											class={cn(
												"rounded-lg border p-4 text-left transition-colors duration-200 flex flex-col justify-between h-24",
												selectedRoomId === room.id
													? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20"
													: "border-zinc-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-850",
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
														<MapPin
															class="h-3 w-3 shrink-0"
														/>
														<span class="truncate"
															>{room.location}</span
														>
													</div>
												{/if}
											</div>

											<div
												class="flex justify-end w-full"
											>
												<div
													class={cn(
														"h-5 w-5 rounded-full flex items-center justify-center border text-[10px]",
														selectedRoomId ===
															room.id
															? "bg-indigo-600 border-indigo-600 text-white"
															: "border-zinc-300 dark:border-zinc-700 bg-background text-transparent",
													)}
												>
													<Check
														class="h-3 w-3 stroke-[2.5]"
													/>
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- 2. Date & Time Step -->
					<Card.Root
						class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xs"
					>
						<Card.Header
							class="border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex items-center"
						>
							<div class="flex items-center gap-2">
								<span
									class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
								>
									2
								</span>
								<Card.Title
									class="text-sm font-semibold tracking-wide uppercase text-zinc-700 dark:text-zinc-300"
								>
									วันและเวลาที่ต้องการใช้ห้อง
								</Card.Title>
							</div>
						</Card.Header>

						<Card.Content
							class="p-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
						>
							{#if !isRecurring}
								<div
									class="flex flex-col gap-1.5"
									transition:slide
								>
									<Label
										for="book-date"
										class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
									>
										<Calendar
											class="h-3.5 w-3.5 text-indigo-500"
										/>
										วันที่
									</Label>
									<Input
										id="book-date"
										type="date"
										bind:value={bookingDate}
										class="rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
									/>
								</div>

								<div
									class="flex flex-col gap-1.5"
									transition:slide
								>
									<Label
										for="book-start"
										class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
									>
										<Clock
											class="h-3.5 w-3.5 text-emerald-500"
										/>
										เวลาเริ่ม
									</Label>
									<Input
										id="book-start"
										type="time"
										bind:value={startTime}
										class="font-mono rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
									/>
								</div>

								<div
									class="flex flex-col gap-1.5"
									transition:slide
								>
									<Label
										for="book-end"
										class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
									>
										<Clock
											class="h-3.5 w-3.5 text-rose-500"
										/>
										เวลาสิ้นสุด
									</Label>
									<Input
										id="book-end"
										type="time"
										bind:value={endTime}
										class="font-mono rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
									/>
								</div>
							{/if}

							{#if isAdmin}
								<div
									class="col-span-full border-t border-zinc-100 dark:border-zinc-800/80 pt-5 mt-3"
								>
									<label
										class="flex items-start gap-3 cursor-pointer select-none"
									>
										<div
											class="relative flex items-center mt-1"
										>
											<input
												type="checkbox"
												bind:checked={isRecurring}
												class="sr-only peer"
											/>
											<div
												class="relative w-9 h-5 bg-zinc-200 peer-focus:outline-none dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"
											></div>
										</div>
										<div class="flex flex-col">
											<span
												class="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
											>
												จองซ้ำทุกสัปดาห์ (Recurring
												Weekly Booking)
											</span>
											<span
												class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5"
											>
												จองวันเดิมและช่วงเวลาเดิมซ้ำทุกสัปดาห์โดยอัตโนมัติ
												(เหมาะสำหรับการลงตารางเรียนสัมมนาของสัปดาห์การศึกษา)
											</span>
										</div>
									</label>

									{#if isRecurring}
										<div
											class="mt-4 flex flex-col gap-4"
											transition:slide
										>
											<!-- Dates Grid -->
											<div
												class="grid grid-cols-1 sm:grid-cols-2 gap-4"
											>
												<div
													class="flex flex-col gap-1.5"
												>
													<Label
														for="book-date-start"
														class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
													>
														<Calendar
															class="h-3.5 w-3.5 text-indigo-500"
														/>
														วันที่เริ่มต้น
													</Label>
													<Input
														id="book-date-start"
														type="date"
														bind:value={bookingDate}
														class="rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
													/>
												</div>

												<div
													class="flex flex-col gap-1.5"
												>
													<Label
														for="recurring-until"
														class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
													>
														<Calendar
															class="h-3.5 w-3.5 text-indigo-500"
														/>
														วันที่สิ้นสุด
													</Label>
													<Input
														id="recurring-until"
														type="date"
														bind:value={
															recurringUntil
														}
														min={bookingDate}
														class="rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
													/>
												</div>
											</div>

											<!-- Times Grid -->
											<div
												class="grid grid-cols-1 sm:grid-cols-2 gap-4"
											>
												<div
													class="flex flex-col gap-1.5"
												>
													<Label
														for="book-start-recurring"
														class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
													>
														<Clock
															class="h-3.5 w-3.5 text-emerald-500"
														/>
														เวลาเริ่ม
													</Label>
													<Input
														id="book-start-recurring"
														type="time"
														bind:value={startTime}
														class="font-mono rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
													/>
												</div>

												<div
													class="flex flex-col gap-1.5"
												>
													<Label
														for="book-end-recurring"
														class="text-xs font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400"
													>
														<Clock
															class="h-3.5 w-3.5 text-rose-500"
														/>
														เวลาสิ้นสุด
													</Label>
													<Input
														id="book-end-recurring"
														type="time"
														bind:value={endTime}
														class="font-mono rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
													/>
												</div>
											</div>

											<div class="flex flex-col gap-2.5">
												<span
													class="text-xs font-semibold text-zinc-600 dark:text-zinc-400"
												>
													เลือกวันในสัปดาห์ที่ต้องการจองซ้ำ
												</span>
												<div
													class="flex flex-wrap gap-2"
												>
													{#each [{ label: "จ", name: "จันทร์", val: 1 }, { label: "อ", name: "อังคาร", val: 2 }, { label: "พ", name: "พุธ", val: 3 }, { label: "พฤ", name: "พฤหัสบดี", val: 4 }, { label: "ศ", name: "ศุกร์", val: 5 }, { label: "ส", name: "เสาร์", val: 6 }, { label: "อา", name: "อาทิตย์", val: 0 }] as d}
														<button
															type="button"
															onclick={() =>
																toggleDay(
																	d.val,
																)}
															class={cn(
																"h-10 px-3.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer select-none",
																recurringDays.includes(
																	d.val,
																)
																	? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20"
																	: "bg-background border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-850",
															)}
															title={d.name}
														>
															{d.label}
														</button>
													{/each}
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- 3. Details Step -->
					<Card.Root
						class="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xs"
					>
						<Card.Header
							class="border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4 flex items-center"
						>
							<div class="flex items-center gap-2">
								<span
									class="bg-indigo-600 text-white font-mono text-[10px] font-bold flex h-4.5 w-4.5 items-center justify-center rounded-full"
								>
									3
								</span>
								<Card.Title
									class="text-sm font-semibold tracking-wide uppercase text-zinc-700 dark:text-zinc-300"
								>
									รายละเอียดการใช้งาน
								</Card.Title>
							</div>
						</Card.Header>

						<Card.Content class="p-6 flex flex-col gap-4">
							<div class="flex flex-col gap-1.5">
								<Label
									for="book-title"
									class="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
								>
									หัวข้อการจอง <span
										class="text-destructive font-bold"
										>*</span
									>
								</Label>
								<Input
									id="book-title"
									type="text"
									bind:value={title}
									placeholder="เช่น Marketing Team Sync-up, ประชุมปรึกษางาน"
									maxlength={200}
									class="rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>

							{#if isAdmin}
								<div
									class="flex flex-col gap-1.5"
									transition:slide
								>
									<Label
										for="booker-name-custom"
										class="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
									>
										ระบุชื่อผู้จอง (ในนามบุคคลอื่น -
										เฉพาะผู้ดูแลระบบ)
									</Label>
									<Input
										id="booker-name-custom"
										type="text"
										bind:value={customBookerName}
										placeholder="ดร. เรียนดี "
										maxlength={100}
										class="rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
									/>
								</div>
							{/if}

							<div class="flex flex-col gap-1.5">
								<Label
									for="book-notes"
									class="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
								>
									รายละเอียดอื่น ๆ <span
										class="text-zinc-400 font-normal"
										>(ไม่บังคับ)</span
									>
								</Label>
								<Textarea
									id="book-notes"
									bind:value={notes}
									placeholder="เช่น ระบุจำนวนผู้เข้าร่วม หรืออุปกรณ์เสริมที่ต้องการเพิ่มเติม"
									rows={3}
									maxlength={500}
									class="resize-none rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-600/10 focus-visible:border-indigo-600"
								/>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Notifications & Validation alerts -->
					{#if validationError}
						<Alert
							variant="destructive"
							class="border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg"
						>
							<AlertCircle class="h-4 w-4" />
							<AlertTitle class="font-semibold text-sm"
								>ระบุข้อมูลไม่ครบถ้วน</AlertTitle
							>
							<AlertDescription class="text-xs mt-0.5"
								>{validationError}</AlertDescription
							>
						</Alert>
					{/if}

					{#if submitError}
						<Alert
							variant="destructive"
							class="border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg"
						>
							<AlertCircle class="h-4 w-4" />
							<AlertTitle class="font-semibold text-sm"
								>การส่งคำขอจองล้มเหลว</AlertTitle
							>
							<AlertDescription class="text-xs mt-0.5"
								>{submitError}</AlertDescription
							>
						</Alert>
					{/if}

					<Button
						type="submit"
						disabled={submitting}
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg shadow-xs transition-colors duration-200"
					>
						{#if submitting}
							<Loader2 class="h-4 w-4 animate-spin mr-2" />
							กำลังส่งคำขอจองห้อง...
						{:else}
							<CalendarPlus class="h-4 w-4 mr-2" />
							ส่งคำขอจองห้องประชุม
						{/if}
					</Button>
				</div>

				<!-- RIGHT COLUMN: Interactive Queue -->
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
									<Loader2
										class="h-4 w-4 animate-spin text-indigo-600"
									/>
									กำลังดึงรายการคิวจอง...
								</div>
							{:else if existingBookings.length === 0}
								<div
									class="border-zinc-200 dark:border-zinc-800 border-dashed bg-zinc-50/50 dark:bg-zinc-950/10 rounded-lg border-2 px-4 py-10 text-center text-xs flex flex-col items-center justify-center space-y-1.5"
								>
									<CheckCircle2
										class="h-6 w-6 text-emerald-500"
									/>
									<p
										class="font-semibold text-zinc-700 dark:text-zinc-300"
									>
										ห้องว่างตลอดทั้งวัน
									</p>
									<p class="text-zinc-400 dark:text-zinc-500">
										สามารถเลือกเวลาใช้งานที่ต้องการได้ทันที
									</p>
								</div>
							{:else}
								<!-- Vertical Queue Timeline: simplified -->
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
														: "border-emerald-500 bg-emerald-500",
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
														<Clock
															class="h-3 w-3 text-zinc-400"
														/>
														{formatTime(
															b.start_time,
														)} - {formatTime(
															b.end_time,
														)}
													</span>

													<Badge
														variant={b.status ===
														"pending"
															? "warning"
															: "success"}
														class="text-[8px] font-semibold px-1 rounded"
													>
														{b.status === "pending"
															? "pending"
															: "approved"}
													</Badge>
												</div>

												<h4
													class="text-xs font-bold text-zinc-850 dark:text-zinc-200 line-clamp-1"
												>
													{b.title}
												</h4>

												<div
													class="mt-2 space-y-1 text-[10px]"
												>
													{#if b.bookerName || b.bookerEmail || b.booker_email}
														<div
															class="text-zinc-500 flex items-center gap-1.5 truncate"
														>
															<Users
																class="h-3 w-3 text-zinc-400"
															/>
															<span
																class="truncate"
															>
																{b.bookerName ||
																	b.bookerEmail ||
																	b.booker_email}
															</span>
														</div>
													{/if}

													{#if b.detailLabel}
														<div
															class="text-zinc-500 flex items-start gap-1.5 truncate"
														>
															<FileText
																class="h-3 w-3 text-zinc-400"
															/>
															<span
																class="truncate"
																>{b.detailLabel}</span
															>
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<Separator
								class="my-4 border-zinc-100 dark:border-zinc-800/60"
							/>

							<!-- Tips Section: simplified -->
						</Card.Content>
					</Card.Root>
				</aside>
			</form>
		{/if}
	</div>

	<BookingConfirmDialog
		bind:open={showConfirm}
		roomName={getRoomName(selectedRoomId)}
		date={bookingDate}
		{startTime}
		{endTime}
		{title}
		{notes}
		{isRecurring}
		{recurringUntil}
		{recurringDaysText}
		{customBookerName}
		{submitting}
		onConfirm={executeSubmit}
		onClose={() => (showConfirm = false)}
	/>
</div>
