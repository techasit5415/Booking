<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import {
		Calendar,
		Clock,
		MapPin,
		User,
		FileText,
		RefreshCw,
	} from "@lucide/svelte";

	let {
		open = $bindable(false),
		roomName,
		date,
		startTime,
		endTime,
		title,
		notes = "",
		isRecurring = false,
		recurringUntil = "",
		recurringDaysText = "",
		customBookerName = "",
		submitting = false,
		onConfirm,
		onClose,
	}: {
		open: boolean;
		roomName: string;
		date: string;
		startTime: string;
		endTime: string;
		title: string;
		notes?: string;
		isRecurring?: boolean;
		recurringUntil?: string;
		recurringDaysText?: string;
		customBookerName?: string;
		submitting?: boolean;
		onConfirm: () => void;
		onClose: () => void;
	} = $props();

	let accepted = $state(false);

	// Reset checkbox state when modal closes
	$effect(() => {
		if (!open) {
			accepted = false;
		}
	});

	function handleConfirm() {
		if (accepted && !submitting) {
			onConfirm();
		}
	}

	function handleClose() {
		onClose();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="sm:max-w-[480px] p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl"
	>
		<Dialog.Header class="space-y-2">
			<Dialog.Title
				class="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2"
			>
				<div
					class="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
				>
					<Calendar class="h-4.5 w-4.5" />
				</div>
				ยืนยันการส่งคำขอจองห้อง
			</Dialog.Title>
			<Dialog.Description
				class="text-xs text-zinc-500 dark:text-zinc-400"
			>
				โปรดตรวจสอบรายละเอียดและยอมรับข้อตกลงก่อนส่งคำขอจองห้องประชุม
			</Dialog.Description>
		</Dialog.Header>

		<div
			class="my-4 space-y-3.5 border-y border-zinc-100 dark:border-zinc-800 py-4 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin"
		>
			<!-- Room -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
				>
					<MapPin class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
					>
						ห้องเรียน / ห้องประชุม
					</p>
					<p
						class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate"
					>
						{roomName || "ยังไม่ได้เลือกห้อง"}
					</p>
				</div>
			</div>

			<!-- Date & Time -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
				>
					<Clock class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
					>
						วันและเวลา
					</p>
					<p
						class="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
					>
						{date} ({startTime} - {endTime} น.)
					</p>
				</div>
			</div>

			<!-- Title -->
			<div class="flex items-start gap-3">
				<div
					class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
				>
					<FileText class="h-4 w-4" />
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
					>
						หัวข้อการจอง
					</p>
					<p
						class="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words"
					>
						{title || "ไม่ระบุหัวข้อ"}
					</p>
				</div>
			</div>

			<!-- Booker Name (if custom) -->
			{#if customBookerName}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
					>
						<User class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
						>
							ผู้จอง (ในนามบุคคลอื่น)
						</p>
						<p
							class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate"
						>
							{customBookerName}
						</p>
					</div>
				</div>
			{/if}

			<!-- Recurring Info -->
			{#if isRecurring}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
					>
						<RefreshCw class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
						>
							การจองซ้ำ (Weekly)
						</p>
						<p
							class="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
						>
							จองซ้ำทุกวัน {recurringDaysText}
						</p>
						<p
							class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5"
						>
							จนถึงวันที่: {recurringUntil}
						</p>
					</div>
				</div>
			{/if}

			<!-- Notes -->
			{#if notes}
				<div class="flex items-start gap-3">
					<div
						class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5"
					>
						<FileText class="h-4 w-4" />
					</div>
					<div class="flex-1 min-w-0">
						<p
							class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
						>
							รายละเอียดเพิ่มเติม
						</p>
						<p
							class="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap"
						>
							{notes}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Guidelines / Agreements Section -->
		<div class="flex flex-col gap-3 my-4">
			<Card.Root class="p-3 bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-none">
				<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
					1. ขอให้ตรวจสอบข้อมูลรายละเอียดการจองให้เรียบร้อยก่อนกดยืนยัน
				</p>
			</Card.Root>

			<Card.Root class="p-3 bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-none">
				<p class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
					2. กรณีขออนุญาตใช้ห้องปฏิบัติการนอกเวลาราชการ
				</p>
				<p class="text-muted-foreground text-xs pl-4 leading-normal">
					หากวัสดุ อุปกรณ์ ครุภัณฑ์ที่อยู่ภายในห้องปฏิบัติการ เกิดการชำรุด เสียหาย หรือสูญหาย ให้นักศึกษาและอาจารย์ผู้ขออนุญาตเป็นผู้รับผิดชอบ ชดใช้ค่าเสียหายทั้งหมด
				</p>
			</Card.Root>
		</div>

		<!-- Acceptance Checkbox -->
		<label class="flex items-start gap-2.5 cursor-pointer mt-4 mb-2 select-none">
			<input
				type="checkbox"
				bind:checked={accepted}
				class="h-4.5 w-4.5 mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-900 cursor-pointer"
			/>
			<span class="text-xs text-zinc-650 dark:text-zinc-350 font-medium leading-tight">
				ฉันได้อ่านและยอมรับเงื่อนไขในการจองห้องปฏิบัติการข้างต้น
			</span>
		</label>

		<Dialog.Footer class="flex flex-col-reverse sm:flex-row gap-2 mt-4">
			<Button
				variant="outline"
				onclick={handleClose}
				disabled={submitting}
				class="w-full sm:w-auto rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800"
			>
				ยกเลิก
			</Button>
			<Button
				onclick={handleConfirm}
				disabled={submitting || !accepted}
				class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
			>
				{#if submitting}
					กำลังดำเนินการ...
				{:else}
					ยืนยันส่งคำขอ
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
