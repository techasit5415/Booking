<script lang="ts">
	import { onMount, untrack } from "svelte";
	import PocketBase from "pocketbase";
	import { env } from "$env/dynamic/public";
	import { page } from "$app/state";
	import Topbar from "$lib/components/Topbar.svelte";
	import type { Room, Booking } from "$lib/types";
	import { toast } from "svelte-sonner";
	import { authenticatePbFromCookie } from "$lib/pocketbase";

	// Import custom components
	import RoomSelection from "$lib/components/booking/RoomSelection.svelte";
	import DateTimeSelection from "$lib/components/booking/DateTimeSelection.svelte";
	import BookingDetailsForm from "$lib/components/booking/BookingDetailsForm.svelte";
	import QueueAside from "$lib/components/booking/QueueAside.svelte";
	import BookingSuccessState from "$lib/components/booking/BookingSuccessState.svelte";
	import BookingConfirmDialog from "$lib/components/BookingConfirmDialog.svelte";

	// Import UI components remaining in shell
	import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { AlertCircle, Loader2, CalendarPlus } from "@lucide/svelte";

	// Import utilities
	import {
		getBookingDateInBangkok,
		isValidRoomId,
		getTodayDate,
		formatDisplayTime,
		checkOverlap,
		validateForm
	} from "$lib/utils/booking-helpers";

	const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";

	let rooms = $state<Room[]>([]);
	let loadingRooms = $state(true);

	const user = $derived(page.data.user);
	const isAdmin = $derived(user?.isAdmin ?? false);

	// Form fields state
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

	let existingBookings = $state<Booking[]>([]);
	let loadingBookings = $state(false);

	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let submitSuccess = $state(false);
	let validationError = $state<string | null>(null);

	let pb: PocketBase | null = null;

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

	$effect(() => {
		const rid = selectedRoomId;
		const d = bookingDate;
		untrack(() => {
			if (rid && d) {
				void loadBookingsForSelected();
			}
		});
	});

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

		const err = validateForm({
			selectedRoomId,
			bookingDate,
			startTime,
			endTime,
			title,
			isRecurring,
			recurringUntil,
			recurringDays,
		});
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

			const conflict = checkOverlap(fresh, bookingDate, startTime, endTime);
			if (conflict) {
				const cStart = formatDisplayTime(conflict.start_time);
				const cEnd = formatDisplayTime(conflict.end_time);
				validationError = `เวลานี้ชนกับการจอง "${conflict.title}" (${cStart}-${cEnd})`;
				return;
			}

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
			<BookingSuccessState onReset={() => (submitSuccess = false)} />
		{:else}
			<form
				onsubmit={handleSubmit}
				class="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
			>
				<!-- LEFT COLUMN: Form Steps -->
				<div class="flex flex-col gap-6">
					<!-- 1. Room Selection Step -->
					<RoomSelection
						{rooms}
						{selectedRoomId}
						{loadingRooms}
						onSelectRoom={selectRoom}
						{getRoomName}
					/>

					<!-- 2. Date & Time Step -->
					<DateTimeSelection
						bind:bookingDate
						bind:startTime
						bind:endTime
						bind:isRecurring
						bind:recurringUntil
						bind:recurringDays
						{isAdmin}
						onToggleDay={toggleDay}
					/>

					<!-- 3. Details Step -->
					<BookingDetailsForm
						bind:title
						bind:notes
						bind:customBookerName
						{isAdmin}
					/>

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
						class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg shadow-xs transition-colors duration-200 cursor-pointer"
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
				<QueueAside
					{selectedRoomId}
					{bookingDate}
					{loadingBookings}
					{existingBookings}
				/>
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
