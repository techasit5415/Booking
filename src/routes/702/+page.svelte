<script lang="ts">
    import { onMount } from "svelte";
    import PocketBase from "pocketbase";
    import QRCode from "qrcode";
    import { env } from "$env/dynamic/public";

    const DEBUG = false;

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

    const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || "";
    const currentRoomId = env.PUBLIC_ROOM_ID701 || "";

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

    let clockText = $state("");
    let dateText = $state("");
    let qrCodeDataUrl = $state("");
    let bookings = $state<BookingItem[]>(sampleBookings);
    let connectionStatus = $state<"connecting" | "live" | "demo">(
        pocketbaseUrl ? "connecting" : "demo",
    );
    let roomName = $state(defaultRoomName);
    let roomLocation = $state(defaultRoomLocation);
    let bookingUrl = $state(defaultBookingUrl);
    let currentBooking = $state<BookingItem>(sampleBookings[0]);
    let upcomingBookings = $state<BookingItem[]>([]);
    let progressPercent = $state(0);
    let progressNote = $state("");
    let bookingViewState = $state<BookingViewState>("idle");
    let statusLabel = $state("DEMO MODE");

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

        // 1. ค้นหาคิวการจองในปัจจุบัน
        const activeBooking = bookings.find((booking) => {
            const startEpoch = booking.startEpoch ?? null;
            const endEpoch = booking.endEpoch ?? null;

            if (startEpoch === null || endEpoch === null) return false;
            // ดักจับ: สเตตัสต้องเป็นกลุ่มที่เปิดใช้งานอยู่เท่านั้น (ไม่เอา cancelled หรือ pending)
            if (booking.status === "cancelled" || booking.status === "pending")
                return false;

            return now >= startEpoch && now < endEpoch;
        });

        // 2. ค้นหาคิวถัดไปในอนาคต (ห่างจากปัจจุบันไม่เกิน 24 ชั่วโมง)
        const nextBookings = bookings.filter((booking) => {
            const startEpoch = booking.startEpoch ?? null;

            if (startEpoch === null) return false;
            if (booking.status === "cancelled" || booking.status === "pending")
                return false;

            const oneDayInMs = 24 * 60 * 60 * 1000;
            return startEpoch > now && startEpoch - now < oneDayInMs;
        });

        // 3. ปรับเปลี่ยน State
        bookingViewState = activeBooking ? "active" : "idle";

        currentBooking = activeBooking ?? {
            id: "empty",
            title: "ไม่มีการจองในตอนนี้",
            detailLabel: "-",
            startTime: "--:--",
            endTime: "--:--",
            status: "cancelled",
            bookerName: "-",
        };

        upcomingBookings = nextBookings;

        // 4. คำนวณ Progress Bar ด้วยเวลา Epoch มิลลิวินาทีโดยตรงจากโมเดลข้อมูล
        if (currentBooking.id === "empty") {
            progressPercent = 0;
            progressNote = "ห้องกำลังว่าง";
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

        const year =
            parts.find((part) => part.type === "year")?.value ?? "1970";
        const month =
            parts.find((part) => part.type === "month")?.value ?? "01";
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
        updateClock();
        const clockTimer = window.setInterval(updateClock, 1000);
        let destroyed = false;
        let pb: PocketBase | null = null;

        // มูฟฟังก์ชันสร้าง QR Code เข้ามาไว้ข้างใน onMount เพื่อแชร์ Scope ร่วมกัน
        async function generateQrCode() {
            try {
                qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
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
                connectionStatus = "demo";
                statusLabel = "DEMO MODE";
                await generateQrCode();
                return;
            }

            try {
                pb = new PocketBase(pocketbaseUrl);
                const todayKey = getBangkokDateKey();

                // 1. ดึงข้อมูลตัวห้องจาก env ตัวแปรใหม่
                if (currentRoomId) {
                    try {
                        const room = await pb
                            .collection("rooms")
                            .getOne(currentRoomId);
                        if (!destroyed) {
                            const mappedRoom = mapRoom(room);
                            roomName = mappedRoom.name;
                            roomLocation = mappedRoom.location;
                            bookingUrl = mappedRoom.booking_url || bookingUrl;
                        }
                    } catch (err) {
                        console.error(
                            `หาห้องไอดี ${currentRoomId} ไม่เจอในระบบ`,
                            err,
                        );
                    }
                }

                // 2. ดึงตารางจองทั้งหมดที่ผูกกับห้องนี้
                const records = await pb.collection("bookings").getFullList({
                    filter: `field = "${currentRoomId}"`,
                    sort: "start_time",
                    expand: "field",
                });

                if (!destroyed) {
                    bookings = records.map((rec) =>
                        mapRecord(rec as BookingRecord),
                    );
                    connectionStatus = "live";
                    statusLabel = "REALTIME";
                    await generateQrCode(); // เรียกใช้ได้ฉลุยแล้ว
                }

                // 3. เปิดระบบ Realtime ดักฟิลเตอร์ข้อมูลเฉพาะไอดีห้องที่กำหนด
                if (currentRoomId) {
                    await pb
                        .collection("rooms")
                        .subscribe(currentRoomId, async (e) => {
                            if (destroyed) return;
                            const mappedRoom = mapRoom(e.record);
                            roomName = mappedRoom.name;
                            roomLocation = mappedRoom.location;
                            bookingUrl = mappedRoom.booking_url || bookingUrl;
                            await generateQrCode();
                        });
                }

                await pb.collection("bookings").subscribe("*", async () => {
                    if (destroyed || !pb) return;
                    const nextRecords = await pb
                        .collection("bookings")
                        .getFullList({
                            filter: `field = "${currentRoomId}"`,
                            sort: "start_time",
                            expand: "field",
                        });
                    bookings = nextRecords.map((rec) =>
                        mapRecord(rec as BookingRecord),
                    );
                });
            } catch (error) {
                console.error("PocketBase connection error:", error);
                if (!destroyed) {
                    connectionStatus = "demo";
                    statusLabel = "OFFLINE MODE";
                    bookings = sampleBookings;
                    await generateQrCode();
                }
            }
        }

        void initRealtimeSystem();

        return () => {
            destroyed = true;
            window.clearInterval(clockTimer);
            if (pb) {
                if (currentRoomId)
                    pb.collection("rooms").unsubscribe(currentRoomId);
                pb.collection("bookings").unsubscribe("*");
            }
        };
    });
</script>

<svelte:head>
    <title>{roomName} | Booking Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
    />
    <link
        href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700;800&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div
    class="min-h-screen w-screen overflow-hidden bg-black p-1 text-slate-100 md:p-2 font-['Prompt',sans-serif]"
>
    <div class="flex min-h-screen flex-col gap-4 md:gap-6">
        <header
            class="flex flex-col gap-4 border-b border-slate-700/40 pb-1 md:flex-row md:items-center md:justify-between md:pb-2"
        >
            <div class="flex items-center gap-4">
                <div
                    class="rounded-2xl bg-indigo-600 px-[1.5vw] py-[1vw] text-[1.2vw] font-extrabold tracking-[0.16em] text-white shadow-lg shadow-indigo-950/30"
                >
                    ROOM
                </div>
                <div>
                    <h1
                        class="text-[4.5vw] font-bold text-white md:text-[3.5vw]"
                    >
                        {roomName}
                    </h1>
                    <p
                        class="mt-[0.5vw] text-[2vw] text-slate-400 md:text-[2vw]"
                    >
                        ห้อง: {roomLocation}
                    </p>
                </div>
            </div>

            <div class="text-left md:text-right pr-[1.5vw] mt-2">
                <div
                    class="text-[5vw] font-extrabold leading-none text-indigo-300 md:text-[5vw]"
                >
                    {clockText}
                </div>
                <div
                    class="mt-[0.5vw] text-[1.2vw] text-slate-400 md:text-[1.2vw]"
                >
                    {dateText}
                </div>
                <div
                    class="mt-[1vw] inline-flex rounded-full border border-indigo-400/20 bg-slate-950/80 px-3 py-1 text-[1vw] font-bold tracking-[0.14em] text-indigo-300"
                >
                    {statusLabel}
                </div>
            </div>
        </header>

        <main class="grid flex-1 min-h-1 gap-[1vw] grid-cols-[1fr_0.5fr] ">
            
            <div class="flex flex-col gap-[1vw] min-h-0 max-h-[42vw] ">
                
                <article class={`relative flex min-h-[20vw] flex-col justify-between overflow-hidden rounded-[2vw] border p-[2.5vw] shadow-2xl shadow-black/40 ${bookingViewState === "idle" ? "border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-black to-black" : "border-red-500/15 bg-gradient-to-br from-red-950/40 via-black to-black"}`}>
                    <div class={`absolute inset-y-0 left-0 w-[0.8vw] bg-gradient-to-b ${bookingViewState === "idle" ? "from-emerald-400 via-lime-500 to-black" : "from-red-500 via-orange-500 to-black"}`}></div>
                    
                    <div>
                        <div class={`inline-flex items-center gap-[0.5vw] rounded-full border px-[1.2vw] py-[0.4vw] text-[1.1vw] font-bold tracking-[0.12em] ${bookingViewState === "idle" ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300" : "border-red-400/20 bg-red-500/15 text-red-300"}`}>
                            <span class={`h-[0.6vw] w-[0.6vw] min-h-[6px] min-w-[6px] animate-pulse rounded-full ${bookingViewState === "idle" ? "bg-emerald-400" : "bg-red-500"}`}></span>
                            {bookingViewState === "idle" ? "ว่าง" : currentBooking.status === "pending" ? "รออนุมัติ" : "กำลังใช้งาน"}
                        </div>
                        
                        <h2 class="mt-[1.5vw] text-[clamp(24px,3.8vw,52px)] font-extrabold leading-tight text-white">
                            {currentBooking.title}
                        </h2>
                        <p class="mt-[0.5vw] text-[clamp(18px,2.4vw,32px)] font-medium text-slate-300">
                            {currentBooking.startTime} - {currentBooking.endTime}
                        </p>
                        <p class="mt-[0.8vw] text-[clamp(13px,1.3vw,18px)] text-slate-400">
                            {bookingViewState === "idle" ? "ตอนนี้ไม่มีการจอง" : `รายละเอียด: ${currentBooking.detailLabel}`}
                        </p>
                        <p class="mt-[0.4vw] text-[clamp(13px,1.3vw,18px)] text-slate-400">
                            ผู้จอง: {currentBooking.bookerName}
                        </p>
                    </div>

                    <div class="mt-[0.5vw]">
                        <div class="mb-[0.5vw] flex items-center justify-between text-[1.2vw] text-slate-400">
                            <span>{progressNote}</span>
                            <span class="font-semibold text-orange-400">{progressPercent}%</span>
                        </div>
                        <div class="h-[0.6vw] min-h-[6px] w-full overflow-hidden rounded-full bg-slate-900">
                            <div
                                class="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000 ease-out"
                                style={`width: ${progressPercent}%`}
                            ></div>
                        </div>
                    </div>
                </article>

                <article class="flex flex-col rounded-[2vw] border border-slate-800/80 bg-black p-[2vw] shadow-xl shadow-black/20 mb-[1vw]">
                    <h3 class=" mb-[1vw] text-[1.2vw] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                        คิวถัดไปวันนี้
                    </h3>
                    
                    <div class="space-y-[1vw] overflow-auto pr-[0.5vw] min-h-0">
                        {#if upcomingBookings.length > 0}
                            {#each upcomingBookings as booking}
                                <div class="flex items-center justify-between gap-[1.5vw] rounded-[1.5vw] border border-slate-800 bg-slate-950 px-[1.5vw] py-[1.2vw]">
                                    <div>
                                        <p class="text-[clamp(14px,1.5vw,22px)] font-semibold text-white">
                                            {booking.title}
                                        </p>
                                        <p class="mt-[0.2vw] text-[clamp(11px,1.1vw,16px)] text-slate-400">
                                            ห้อง: {roomLocation}
                                        </p>
                                    </div>
                                    <span class="shrink-0 rounded-[0.8vw] bg-slate-900 border border-slate-800 px-[1.2vw] py-[0.4vw] text-[clamp(11px,1.1vw,16px)] font-medium text-slate-300">
                                        {booking.startTime} - {booking.endTime}
                                    </span>
                                </div>
                            {/each}
                        {:else}
                            <div class="rounded-[1.5vw] border border-dashed border-slate-800 px-[1.5vw] py-[3vw] text-center text-[clamp(12px,1.3vw,18px)] text-slate-500">
                                ไม่มีรายการจองถัดไป
                            </div>
                        {/if}
                    </div>
                </article>
            </div>

            <div class="flex flex-col gap-[1vw] ">
                
                <article class=" min-h-0 max-h-[32vw] flex flex-1 flex-col items-center justify-center rounded-[2vw] border border-slate-800/80 bg-black p-[2.5vw] text-center shadow-2xl shadow-black/40">
                    <h3 class="text-[clamp(16px,2vw,28px)] font-bold text-white tracking-wide">
                        ต้องการจองห้องนี้?
                    </h3>
                    <p class="mt-[0.5vw] text-[clamp(12px,1.3vw,18px)] text-slate-400">
                        สแกน QR code เพื่อเปิดหน้าจอง
                    </p>

                    <div class="mt-[1.0vw] rounded-[1.5vw] bg-white p-[1.5vw] shadow-xl shadow-black/30">
                        {#if qrCodeDataUrl}
                            <img
                                class="h-[15vw] w-[15vw] min-h-[140px] min-w-[140px] max-h-[240px] max-w-[240px] object-contain"
                                src={qrCodeDataUrl}
                                alt="QR code สำหรับจองห้อง"
                            />
                        {:else}
                            <div class="grid h-[15vw] w-[15vw] min-h-[140px] min-w-[140px] max-h-[240px] max-w-[240px] place-items-center text-[1.2vw] font-semibold text-slate-950 animate-pulse">
                                Loading QR...
                            </div>
                        {/if}
                    </div>

                    <div class="mt-[1.5vw] inline-flex rounded-full border border-indigo-500/10 bg-indigo-950/30 px-[1.2vw] py-[0.4vw] text-[clamp(10px,1.1vw,14px)] font-bold tracking-[0.14em] text-indigo-400 uppercase">
                        SCAN TO BOOK NOW
                    </div>
                </article>

                <article class="flex items-start gap-[0.5vw] rounded-[2vw] border border-indigo-500/10 bg-gradient-to-br from-indigo-950/20 to-black p-[0.5vw]  shadow-lg">
                    <div class="text-[clamp(18px,2vw,28px)] leading-none select-none">💡</div>
                    <div>
                        <h4 class="text-[clamp(13px,1.3vw,18px)] font-semibold text-indigo-300">
                            ข้อแนะนำการใช้งาน
                        </h4>
                        <p class="mt-[0.4vw] text-[clamp(11px,1.1vw,16px)] leading-relaxed text-slate-400">
                            ถ้าประชุมเสร็จก่อนกำหนด ให้กดคืนห้องในระบบ เพื่อให้คนอื่นใช้งานต่อได้ทันที
                        </p>
                    </div>
                </article>
            </div>

        </main>
    </div>
</div>
