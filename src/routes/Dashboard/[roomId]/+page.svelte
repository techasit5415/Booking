<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { page } from '$app/state';
    import PocketBase from 'pocketbase';
    import { env } from '$env/dynamic/public';
    import { goto } from '$app/navigation';
    import MonthlyStatusCalendar from '$lib/components/MonthlyStatusCalendar.svelte';

    const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';
    const CALENDAR_CELLS = 42; // 6 weeks × 7 days
    const THEME_KEY = 'theme-mode';

    type ThemeMode = 'light' | 'dark';

    // Hoisted formatters (สร้างครั้งเดียว reuse ได้)
    const BANGKOK_TIME_FORMAT = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
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

    // Theme state: เริ่มต้น 'dark' ป้องกัน FOUC ตอน SSR / hydration แล้วค่อย sync ใน onMount
    let themeMode = $state<ThemeMode>('dark');
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
                .filter(b => {
                    if (!b.start_time || !b.end_time) return false;

                    try {
                        const bookingStartEpoch = Date.parse(b.start_time.replace(' ', 'T'));
                        const bookingEndEpoch = Date.parse(b.end_time.replace(' ', 'T'));

                        const isOverlapping = bookingStartEpoch <= cellEndEpoch && bookingEndEpoch >= cellStartEpoch;
                        const isStatusValid = b.status === 'approved' || b.status === 'confirmed';
                        const isThisRoom = b.field === currentRoomId;

                        return isOverlapping && isStatusValid && isThisRoom;
                    } catch (e) {
                        return false;
                    }
                })
                .sort((a, b) => Date.parse(a.start_time.replace(' ', 'T')) - Date.parse(b.start_time.replace(' ', 'T')))
                .map(b => {
                    const roomInfo = rooms.find(r => r.id === b.field);
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

    function setTheme(mode: ThemeMode) {
        themeMode = mode;
        applyTheme(mode);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(THEME_KEY, mode);
        }
    }

    onMount(() => {
        // 1. Init theme จาก localStorage หรือ system
        const stored = readStoredTheme();
        const initial = stored ?? getSystemTheme();
        themeMode = initial;
        applyTheme(initial);

        // ฟังการเปลี่ยน theme จาก OS ตอนที่ user ยังไม่ได้เลือกเอง
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemChange = (e: MediaQueryListEvent) => {
            if (readStoredTheme() === null) {
                themeMode = e.matches ? 'dark' : 'light';
                applyTheme(themeMode);
            }
        };
        mql.addEventListener('change', onSystemChange);

        // 2. Clock
        function updateClock() {
            const now = new Date();
            clockText = now.toLocaleTimeString('th-TH', { hour12: false });
            dateText = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            currentMonthName = now.toLocaleDateString('th-TH', { month: 'long' });
        }

        updateClock();
        const clockTimer = window.setInterval(updateClock, 1000);

        return () => {
            window.clearInterval(clockTimer);
            mql.removeEventListener('change', onSystemChange);
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

                const now = new Date();
                const startRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const endRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

                if (!isValidRoomId(roomId)) {
                    console.warn(`Invalid roomId format: ${roomId}`);
                    return;
                }
                const safeRoomId = escapeFilterValue(roomId);
                const buildFilter = (rid: string) =>
                    `date >= "${startRange}" && date <= "${endRange}" && field = "${rid}" && (status = "approved" || status = "confirmed")`;

                const bookings = await pb!.collection('bookings').getFullList({
                    filter: buildFilter(safeRoomId)
                });

                if (cancelled) return;
                calendarDays = generateMonthGridStructure(rooms, bookings);

                pb!.collection('bookings').unsubscribe('*');
                await pb!.collection('bookings').subscribe('*', async () => {
                    if (cancelled || !pb) return;
                    const nextBookings = await pb.collection('bookings').getFullList({
                        filter: buildFilter(safeRoomId)
                    });
                    if (cancelled) return;
                    calendarDays = generateMonthGridStructure(rooms, nextBookings);
                });
            } catch (err) {
                console.error(err);
            }
        })();

        return () => {
            cancelled = true;
            if (pb) pb.collection('bookings').unsubscribe('*');
        };
    });
</script>

<svelte:head>
    <title>ตาราง {currentRoomName} | Booking</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Prompt:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="min-h-screen w-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-['Inter','Prompt',sans-serif] antialiased">
    <div class="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-10 px-6 py-8 md:px-10 md:py-10">

        <!-- ============ HEADER ============ -->
        <header class="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
            <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-3 text-[14px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                    <span class="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                    Room Schedule · {currentMonthName}
                </div>
                <h1 class="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
                    {currentRoomName}
                </h1>
            </div>

            <div class="flex flex-col items-start gap-1 md:items-end">
                <div class="font-['JetBrains_Mono',monospace] text-3xl font-medium tabular-nums text-zinc-900 dark:text-zinc-100 md:text-4xl">
                    {clockText}
                </div>
                <div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 md:text-sm">
                    {dateText}
                </div>
            </div>
        </header>

        <!-- ============ CONTROLS ============ -->
        <div class="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <!-- Room selector -->
            <div class="flex items-center gap-3">
                <label for="room-select" class="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                    Room
                </label>
                <div class="relative">
                    <select
                        id="room-select"
                        bind:value={selectedRoomId}
                        onchange={() => {
                            if (selectedRoomId) {
                                goto(`/Dashboard/${selectedRoomId}`);
                            }
                        }}
                        class="appearance-none rounded-md border border-zinc-200 bg-white py-1.5 pr-8 pl-3 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:border-zinc-100"
                    >
                        {#if rawRooms.length === 0}
                            <option value="">กำลังโหลด...</option>
                        {/if}
                        {#each rawRooms as room}
                            <option value={room.id}>{room.name}</option>
                        {/each}
                    </select>
                    <svg class="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            <!-- Segmented theme toggle -->
            <div class="inline-flex items-center self-start rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-semibold tracking-wider uppercase sm:self-auto dark:border-zinc-800 dark:bg-zinc-900">
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
        </div>

        <!-- ============ CALENDAR ============ -->
        <main class="flex-1">
            <MonthlyStatusCalendar {calendarDays} />
        </main>

    </div>
</div>
