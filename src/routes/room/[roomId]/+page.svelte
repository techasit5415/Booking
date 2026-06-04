<script lang="ts">
    import { onMount } from "svelte";
    import PocketBase from "pocketbase";
    import QRCode from "qrcode";
    import { env } from "$env/dynamic/public";
    import RoomHeader from '$lib/components/RoomHeader.svelte';
    import ActiveBookingCard from '$lib/components/ActiveBookingCard.svelte';
    import UpcomingBookingsList from '$lib/components/UpcomingBookingsList.svelte';
    import QrBookingCard from '$lib/components/QrBookingCard.svelte';
    import { page } from '$app/state';

    type ThemeMode = 'light' | 'dark';
    const THEME_KEY = 'theme-mode';

    type BookingItem = {
        id: string;
        title: string;
        detailLabel: string;
        startTime: string;
        startEpoch?: number | null;
        endTime: string;
        endEpoch?: number | null;
        status: "confirmed" | "pending" | "cancelled";
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

    type BookingViewState = "active" | "idle";

    // === Security: ป้องกัน filter injection ===
    const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
    function isValidRoomId(id: string | undefined): id is string {
        return typeof id === 'string' && SAFE_ID_PATTERN.test(id);
    }
    function escapeFilterValue(value: string): string {
        return value.replace(/[\\"'\n\r\t]/g, '\\$&');
    }

    const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
    const currentRoomId = page.params.roomId;
    const defaultRoomName = "CONFERENCE ROOM 01";
    const defaultRoomLocation = "อาคารอเนกประสงค์ ชั้น 3";
    const defaultBookingUrl = "https://example.com/book-room";

    const sampleBookings: BookingItem[] = [
        {
            id: "1",
            title: "Marketing Team Meeting",
            detailLabel: "ห้องประชุม A",
            startTime: "13:00",
            endTime: "15:00",
            status: "confirmed",
            bookerName: "คุณสมชาย",
        },
    ];

    let themeMode = $state<ThemeMode>('dark');
    let clockText = $state("");
    let dateText = $state("");
    let qrCodeDataUrl = $state("");
    let bookings = $state<BookingItem[]>(sampleBookings);
    let roomName = $state(defaultRoomName);
    let roomLocation = $state(defaultRoomLocation);
    let currentBooking = $state<BookingItem>(sampleBookings[0]);
    let upcomingBookings = $state<BookingItem[]>([]);
    let progressPercent = $state(0);
    let progressNote = $state("");
    let bookingViewState = $state<BookingViewState>("idle");
    let statusLabel = $state("DEMO MODE");

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
    function setTheme(mode: ThemeMode) {
        themeMode = mode;
        applyTheme(mode);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(THEME_KEY, mode);
        }
    }

    function updateClock() {
        const now = new Date();
        clockText = now.toLocaleTimeString("th-TH", { hour12: false });
        dateText = now.toLocaleDateString("th-TH", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        updateDerivedState();
    }

    function updateDerivedState() {
        const now = Date.now();

        const activeBooking = bookings.find((booking) => {
            const startEpoch = booking.startEpoch ?? null;
            const endEpoch = booking.endEpoch ?? null;

            if (startEpoch === null || endEpoch === null) return false;
            if (booking.status === "cancelled" || booking.status === "pending")
                return false;

            return now >= startEpoch && now < endEpoch;
        });

        const nextBookings = bookings.filter((booking) => {
            const startEpoch = booking.startEpoch ?? null;

            if (startEpoch === null) return false;
            if (booking.status === "cancelled" || booking.status === "pending")
                return false;

            const oneDayInMs = 24 * 60 * 60 * 1000;
            return startEpoch > now && startEpoch - now < oneDayInMs;
        });

        bookingViewState = activeBooking ? "active" : "idle";

        currentBooking = activeBooking ?? {
            id: "empty",
            title: "ว่าง",
            detailLabel: "-",
            startTime: "",
            endTime: "",
            status: "cancelled",
            bookerName: "-",
        };

        upcomingBookings = nextBookings;

        if (currentBooking.id === "empty") {
            progressPercent = 0;
            progressNote = "ห้องว่าง";
        } else {
            const start = currentBooking.startEpoch ?? now;
            const end = currentBooking.endEpoch ?? now;

            if (end > start) {
                const pct = ((now - start) / (end - start)) * 100;
                progressPercent = Math.max(0, Math.min(100, Math.round(pct)));
                const minsLeft = Math.ceil((end - now) / 60000);

                if (minsLeft > 60) {
                    const hoursLeft = Math.floor(minsLeft / 60);
                    const remMins = minsLeft % 60;
                    progressNote = `เหลืออีก ${hoursLeft} ชม. ${remMins} นาที`;
                } else {
                    progressNote = `เหลืออีก ${minsLeft} นาที`;
                }
            } else {
                progressPercent = 0;
                progressNote = "กำลังใช้งาน";
            }
        }
    }

    function getBangkokDateKey(date = new Date()) {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(date);

        const year = parts.find((part) => part.type === "year")?.value ?? "1970";
        const month = parts.find((part) => part.type === "month")?.value ?? "01";
        const day = parts.find((part) => part.type === "day")?.value ?? "01";

        return `${year}-${month}-${day}`;
    }

    function parseBangkokTimeToEpoch(value: string) {
        const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
        if (!hhmm) return null;

        const hours = Number(hhmm[1]);
        const minutes = Number(hhmm[2]);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

        const dateKey = getBangkokDateKey();
        const isoLike = `${dateKey}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+07:00`;
        const parsed = Date.parse(isoLike);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function parseTimeToEpoch(value: string): number | null {
        if (!value) return null;

        const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
        if (hhmm) {
            return parseBangkokTimeToEpoch(value);
        }

        const normalized = String(value).replace(" ", "T");
        const parsed = Date.parse(normalized);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function formatDisplayTime(value: unknown): string {
        if (typeof value !== "string" || !value.trim()) return "--:--";
        const trimmed = value.trim();
        if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

        const normalized = trimmed.replace(" ", "T");
        const parsed = Date.parse(normalized);
        if (Number.isNaN(parsed)) return trimmed;

        return new Date(parsed).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    function mapRecord(record: BookingRecord): BookingItem {
        const rawStatus = String(record.status ?? "pending");
        const status: BookingItem["status"] =
            rawStatus === "pending" || rawStatus === "cancelled"
                ? rawStatus
                : "confirmed";
        const bookingDetail = String(record.detailLabel ?? "").trim();
        const expandedFieldName = String(
            record.expand?.field?.name ?? "",
        ).trim();
        const detailLabel =
            bookingDetail ||
            expandedFieldName ||
            String(record.field ?? "Unknown room");
        const bookerName = String(record.bookerName ?? "").trim();
        const startRaw = String(record.start_time ?? "");
        const endRaw = String(record.end_time ?? "");

        return {
            id: String(record.id ?? crypto.randomUUID()),
            title: String(record.title ?? "Untitled booking"),
            detailLabel,
            bookerName,
            startTime: formatDisplayTime(startRaw),
            startEpoch: parseTimeToEpoch(startRaw),
            endTime: formatDisplayTime(endRaw),
            endEpoch: parseTimeToEpoch(endRaw),
            status,
        };
    }

    function mapRoom(record: Record<string, unknown>): RoomItem {
        return {
            name: String(record.name ?? defaultRoomName),
            location: String(record.location ?? defaultRoomLocation),
            booking_url: String(record.booking_url ?? defaultBookingUrl),
        };
    }

    onMount(() => {
        // 1. Init theme (sync กับ Dashboard ผ่าน localStorage)
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

        // 2. Clock
        updateClock();
        const clockTimer = window.setInterval(updateClock, 1000);
        let destroyed = false;
        let pb: PocketBase | null = null;

        async function generateQrCode() {
            try {
                // QR ชี้ไปหน้า /book ภายในแอป (absolute URL เพื่อให้สแกนจากมือถือได้)
                const bookUrl = `${window.location.origin}/book`;
                qrCodeDataUrl = await QRCode.toDataURL(bookUrl, {
                    width: 280,
                    margin: 1,
                    color: { dark: "#0f172a", light: "#ffffff" },
                });
            } catch (err) {
                console.error("Failed to generate QR Code", err);
            }
        }

        async function initRealtimeSystem() {
            if (!pocketbaseUrl) {
                statusLabel = "DEMO MODE";
                await generateQrCode();
                return;
            }

            // === Security: validate roomId ก่อน ===
            if (!isValidRoomId(currentRoomId)) {
                console.warn(`Invalid roomId: ${currentRoomId}`);
                statusLabel = "INVALID ROOM";
                return;
            }
            const safeRoomId = escapeFilterValue(currentRoomId);

            try {
                pb = new PocketBase(pocketbaseUrl);

                // 1. โหลดข้อมูลห้อง
                try {
                    const room = await pb.collection("rooms").getOne(safeRoomId);
                    if (!destroyed) {
                        const mappedRoom = mapRoom(room);
                        roomName = mappedRoom.name;
                        roomLocation = mappedRoom.location;
                    }
                } catch (err) {
                    console.error(
                        `หาห้องไอดี ${currentRoomId} ไม่เจอในระบบ`,
                        err,
                    );
                }

                // 2. ดึงตารางจอง (filter ใช้ safeRoomId)
                const records = await pb.collection("bookings").getFullList({
                    filter: `field = "${safeRoomId}"`,
                    sort: "start_time",
                    expand: "field",
                });

                if (!destroyed) {
                    bookings = records.map((rec) =>
                        mapRecord(rec as BookingRecord),
                    );
                    statusLabel = "LIVE";
                    await generateQrCode();
                }

                // 3. Subscribe room updates
                await pb.collection("rooms").subscribe(safeRoomId, async (e) => {
                    if (destroyed) return;
                    const mappedRoom = mapRoom(e.record);
                    roomName = mappedRoom.name;
                    roomLocation = mappedRoom.location;
                    await generateQrCode();
                });

                // 4. Subscribe bookings
                await pb.collection("bookings").subscribe("*", async () => {
                    if (destroyed || !pb) return;
                    const nextRecords = await pb
                        .collection("bookings")
                        .getFullList({
                            filter: `field = "${safeRoomId}"`,
                            sort: "start_time",
                            expand: "field",
                        });
                    bookings = nextRecords.map((rec) =>
                        mapRecord(rec as BookingRecord),
                    );
                    updateDerivedState();
                });
            } catch (error) {
                console.error("PocketBase connection error:", error);
                if (!destroyed) {
                    statusLabel = "OFFLINE";
                    bookings = sampleBookings;
                    await generateQrCode();
                }
            }
        }

        void initRealtimeSystem();

        return () => {
            destroyed = true;
            window.clearInterval(clockTimer);
            mql.removeEventListener('change', onSystemChange);
            if (pb) {
                if (isValidRoomId(currentRoomId)) {
                    pb.collection("rooms").unsubscribe(currentRoomId);
                }
                pb.collection("bookings").unsubscribe("*");
            }
        };
    });
</script>

<svelte:head>
    <title>{roomName} | Booking</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Prompt:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="min-h-screen w-screen bg-black text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-['Inter','Prompt',sans-serif] antialiased">
    <div class="mx-auto flex min-h-screen max-w-400 flex-col gap-2 px-6 py-6 md:px-10 md:py-8">

        <!-- 1. Header -->
        <RoomHeader
            {roomName}
            {roomLocation}
            {clockText}
            {dateText}
            {statusLabel}
        />

        <!-- 2. Main grid -->
        <main class="grid flex-1 min-h-0 gap-2 grid-cols-1 grid-cols-[1.6fr_0.7fr]">

            <!-- Left column -->
            <div class="flex flex-col gap-2 min-h-0">
                <ActiveBookingCard
                    {bookingViewState}
                    {currentBooking}
                    {progressNote}
                    {progressPercent}
                />
                <UpcomingBookingsList
                    {upcomingBookings}
                    {roomLocation}
                />
            </div>

            <!-- Right column -->
            <QrBookingCard {qrCodeDataUrl} />

        </main>
    </div>
</div>
