<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import PocketBase from 'pocketbase';
    import { env } from '$env/dynamic/public';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';

    const THEME_KEY = 'theme-mode';

    // Hoisted formatters
    const BANGKOK_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' });

    type ThemeMode = 'light' | 'dark';
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

    // === Theme system ===
    function getSystemTheme(): ThemeMode {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function readStoredTheme(): ThemeMode | null {
        if (typeof window === 'undefined') return null;
        const v = localStorage.getItem(THEME_KEY);
        return v === 'light' || v === 'dark' ? v : null;
    }
    function applyTheme(mode: ThemeMode) {
        if (typeof document === 'undefined') return;
        document.documentElement.classList.toggle('dark', mode === 'dark');
    }

    let themeMode = $state<ThemeMode>('dark');
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
            }).format(new Date(value.replace(' ', 'T')));
        } catch {
            return value;
        }
    }

    function setTheme(mode: ThemeMode) {
        themeMode = mode;
        applyTheme(mode);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(THEME_KEY, mode);
        }
    }

    function selectRoom(id: string) {
        selectedRoomId = id;
        validationError = null;
    }

    async function loadRooms() {
        if (!pb) return;
        try {
            const data = await pb.collection('rooms').getFullList({ sort: 'name' });
            rooms = data as Room[];
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
            // Query ทุก booking ของห้อง (ไม่กรองวันที่ด้วย filter — กรอง client-side แทน
            // เพราะ `date = "..."` ใน PocketBase filter ใช้กับ date field ไม่ได้)
            const data = await pb.collection('bookings').getFullList({
                filter: `field = "${safeId}"`,
                sort: 'start_time',
            });
            const allBookings = data as unknown as Booking[];

            // กรอง client-side: วันเดียวกัน + ไม่ใช่ cancelled
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
        // ⚠️ ต้องใช้ Date.parse เทียบ milliseconds ไม่ใช่ string compare
        // เพราะ PocketBase อาจคืนเวลาในรูปแบบ "2026-06-05 09:00:00.000Z" (UTC)
        // ขณะที่ form ส่ง "2026-06-05T09:00:00+07:00" (Bangkok)
        // string compare ให้ผลผิดเพราะ 'Z' > '+' ใน ASCII
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

    /** โหลด bookings ของห้อง+วันนี้ ใช้ซ้ำได้ทั้งตอน display และตอน submit */
    async function fetchBookingsForRoomDate(): Promise<Booking[]> {
        if (!pb || !selectedRoomId || !isValidRoomId(selectedRoomId)) {
            return [];
        }
        const safeId = selectedRoomId;
        const data = await pb.collection('bookings').getFullList({
            filter: `field = "${safeId}"`,
            sort: 'start_time',
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
            // 🔒 Fetch ข้อมูลสดจากหน้าบ้านมาเช็คการจองซ้อนก่อน
            const fresh = await fetchBookingsForRoomDate();
            existingBookings = fresh;

            const conflict = checkOverlap(fresh);
            if (conflict) {
                const cStart = formatDisplayTime(conflict.start_time);
                const cEnd = formatDisplayTime(conflict.end_time);
                validationError = `เวลานี้ชนกับการจอง "${conflict.title}" (${cStart}-${cEnd})`;
                return;
            }

            // ==========================================
            // 🔥 ปรับเปลี่ยนจุดนี้: ยิงผ่าน API Server Proxy แทนการใช้ PB SDK ตรงๆ
            // ==========================================
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: selectedRoomId,
                    date: bookingDate,
                    startTime: startTime, // ส่งค่า HH:MM ไปให้หลังบ้านย่อยต่อ
                    endTime: endTime,     // ส่งค่า HH:MM
                    title: title.trim(),
                    notes: notes.trim()
                })
            });

            // ตรวจสอบผลลัพธ์จากหลังบ้าน
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'ส่งคำขอไม่สำเร็จ' }));
                throw new Error(errorData.message || 'เซิร์ฟเวอร์ปฏิเสธการจอง');
            }

            // ถ้าหลังบ้านตอบกลับมาว่าสำเร็จ
            submitSuccess = true;
            
            // reset form
            title = '';
            notes = '';
            
            // refetch เพื่อแสดงใน preview รายการจองของวันนั้นบนหน้าจอ
            await loadBookingsForSelected();
            
        } catch (err: any) {
            console.error('Submit failed', err);
            submitError = err.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
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
            });
        } catch {
            return iso;
        }
    }

    function getRoomName(id: string): string {
        return rooms.find((r) => r.id === id)?.name ?? '';
    }

    onMount(() => {
        // init theme
        const stored = readStoredTheme();
        const initial = stored ?? getSystemTheme();
        themeMode = initial;
        applyTheme(initial);

        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemChange = (e: MediaQueryListEvent) => {
            if (readStoredTheme() === null) {
                themeMode = e.matches ? 'dark' : 'light';
                applyTheme(themeMode);
            }
        };
        mql.addEventListener('change', onSystemChange);

        // init pocketbase
        if (pocketbaseUrl) {
            pb = new PocketBase(pocketbaseUrl);
            void loadRooms();
        } else {
            loadingRooms = false;
        }

        return () => {
            mql.removeEventListener('change', onSystemChange);
        };
    });
</script>

<svelte:head>
    <title>จองห้องประชุม | Booking</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Prompt:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>
<header class="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
</header>
<div class="min-h-screen w-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-['Inter','Prompt',sans-serif] antialiased">
    <div class="mx-auto flex min-h-screen max-w-400 flex-col gap-8 px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10">

        <!-- ============ HEADER ============ -->
        <header class="flex flex-col gap-6 border-b border-zinc-200 pb-6 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                    <span class="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                    New Booking
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
                    จองห้องประชุม
                </h1>
            </div>

            <!-- Theme toggle (user info แสดงใน layout แล้ว) -->
            <div class="inline-flex items-center self-start rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-semibold tracking-wider uppercase md:self-auto dark:border-zinc-800 dark:bg-zinc-900">
                <button
                    type="button"
                    onclick={() => setTheme('light')}
                    class="rounded-[5px] px-3 py-1.5 transition-colors {themeMode === 'light' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
                    aria-label="Light mode"
                    aria-pressed={themeMode === 'light'}
                >
                    Light
                </button>
                <button
                    type="button"
                    onclick={() => setTheme('dark')}
                    class="rounded-[5px] px-3 py-1.5 transition-colors {themeMode === 'dark' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
                    aria-label="Dark mode"
                    aria-pressed={themeMode === 'dark'}
                >
                    Dark
                </button>
            </div>
        </header>

        {#if submitSuccess}
            <!-- Success state -->
            <div class="flex flex-col items-center gap-4 rounded-lg border border-emerald-500/20 bg-emerald-50 p-10 text-center dark:border-emerald-500/20 dark:bg-emerald-950/20">
                <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-50">ส่งคำขอจองแล้ว</h2>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">
                    รอผู้ดูแลอนุมัติ สถานะจะอัปเดตเป็น "approved" เมื่อได้รับการยืนยัน
                </p>
                <div class="flex gap-3">
                    <button
                        type="button"
                        onclick={() => { submitSuccess = false; }}
                        class="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                        จองอีกครั้ง
                    </button>
                    <button
                        type="button"
                        onclick={() => goto('/')}
                        class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        {:else}
            <form onsubmit={handleSubmit} class="grid flex-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                <!-- LEFT: form -->
                <div class="flex flex-col gap-6">

                    <!-- 1. Room selection -->
                    <section class="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <div class="flex items-center justify-between">
                            <h2 class="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase dark:text-zinc-400">
                                1 · เลือกห้อง
                            </h2>
                            {#if selectedRoomId}
                                <span class="text-xs text-zinc-500 dark:text-zinc-400">
                                    เลือก: <strong class="text-zinc-900 dark:text-zinc-100">{getRoomName(selectedRoomId)}</strong>
                                </span>
                            {/if}
                        </div>

                        {#if loadingRooms}
                            <p class="text-sm text-zinc-500 dark:text-zinc-400">กำลังโหลดห้อง...</p>
                        {:else if rooms.length === 0}
                            <p class="text-sm text-zinc-500 dark:text-zinc-400">ไม่พบห้องในระบบ</p>
                        {:else}
                            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {#each rooms as room (room.id)}
                                    <button
                                        type="button"
                                        onclick={() => selectRoom(room.id)}
                                        class="rounded-md border p-3 text-left transition-colors
                                            {selectedRoomId === room.id
                                                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                                : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600'}"
                                    >
                                        <div class="text-sm font-semibold">{room.name}</div>
                                        {#if room.location}
                                            <div class="mt-0.5 text-xs opacity-70">{room.location}</div>
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </section>

                    <!-- 2. Date & time -->
                    <section class="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 class="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase dark:text-zinc-400">
                            2 · วันและเวลา
                        </h2>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div class="flex flex-col gap-1.5">
                                <label for="book-date" class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    วันที่
                                </label>
                                <input
                                    id="book-date"
                                    type="date"
                                    bind:value={bookingDate}
                                    class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                                />
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label for="book-start" class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    เวลาเริ่ม
                                </label>
                                <input
                                    id="book-start"
                                    type="time"
                                    bind:value={startTime}
                                    class="rounded-md border border-zinc-200 bg-white px-3 py-2 font-['JetBrains_Mono',monospace] text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                                />
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label for="book-end" class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    เวลาจบ
                                </label>
                                <input
                                    id="book-end"
                                    type="time"
                                    bind:value={endTime}
                                    class="rounded-md border border-zinc-200 bg-white px-3 py-2 font-['JetBrains_Mono',monospace] text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                                />
                            </div>
                        </div>
                    </section>

                    <!-- 3. Details -->
                    <section class="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 class="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase dark:text-zinc-400">
                            3 · รายละเอียด
                        </h2>

                        <div class="flex flex-col gap-1.5">
                            <label for="book-title" class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                หัวข้อการจอง <span class="text-red-500">*</span>
                            </label>
                            <input
                                id="book-title"
                                type="text"
                                bind:value={title}
                                placeholder="เช่น Marketing Team Meeting"
                                maxlength="200"
                                class="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                            />
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <label for="book-notes" class="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                รายละเอียดเพิ่มเติม <span class="text-zinc-400">(ไม่บังคับ)</span>
                            </label>
                            <textarea
                                id="book-notes"
                                bind:value={notes}
                                placeholder="เช่น ต้องการ projector, นั่ง 10 คน"
                                rows="3"
                                maxlength="500"
                                class="resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                            ></textarea>
                        </div>
                    </section>

                    <!-- Validation + submit -->
                    {#if validationError}
                        <div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300">
                            {validationError}
                        </div>
                    {/if}
                    {#if submitError}
                        <div class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300">
                            {submitError}
                        </div>
                    {/if}

                    <button
                        type="submit"
                        disabled={submitting}
                        class="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {#if submitting}
                            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
                            </svg>
                            กำลังส่ง...
                        {:else}
                            ส่งคำขอจอง
                        {/if}
                    </button>
                </div>

                <!-- RIGHT: existing bookings preview -->
                <aside class="flex flex-col gap-4">
                    <div class="sticky top-6 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 class="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase dark:text-zinc-400">
                            คิวของวันนี้
                        </h2>

                        {#if !selectedRoomId}
                            <p class="text-sm text-zinc-500 dark:text-zinc-400">เลือกห้องเพื่อดูคิวที่มีอยู่</p>
                        {:else if loadingBookings}
                            <p class="text-sm text-zinc-500 dark:text-zinc-400">กำลังโหลด...</p>
                        {:else if existingBookings.length === 0}
                            <div class="rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                                ห้องว่างตลอดทั้งวัน
                            </div>
                        {:else}
                            <ul class="flex flex-col gap-2">
                                {#each existingBookings as b (b.id)}
                                    <li class="flex flex-col gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="font-['JetBrains_Mono',monospace] text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                {formatTime(b.start_time)} - {formatTime(b.end_time)}
                                            </span>
                                            <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                                                {b.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}">
                                                {b.status}
                                            </span>
                                        </div>
                                        <p class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{b.title}</p>
                                        {#if b.bookerName || b.bookerEmail || b.booker_email}
                                            <p class="flex items-center gap-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                <svg class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span class="truncate">{b.bookerName || b.bookerEmail || b.booker_email}</span>
                                            </p>
                                        {/if}
                                    </li>
                                {/each}
                            </ul>
                        {/if}

                        <div class="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                            💡 ระบบจะเช็คเวลาซ้อนทับให้อัตโนมัติ ถ้าเลือกเวลาที่ชนกับคิวเดิมจะแจ้งเตือน
                        </div>
                    </div>
                </aside>
            </form>
        {/if}

    </div>
</div>
