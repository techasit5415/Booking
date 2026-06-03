<script lang="ts">
    import { onMount, untrack } from 'svelte';
    import { page } from '$app/state'; // 🚨 ดึงค่าพารามิเตอร์จาก URL ของ Svelte 5
    import PocketBase from 'pocketbase';
    import { env } from '$env/dynamic/public';
    import { goto } from '$app/navigation';
    import MonthlyStatusCalendar from '$lib/components/MonthlyStatusCalendar.svelte';

    const pocketbaseUrl = env.PUBLIC_POCKETBASE_URL || '';
    
    // 🚨 ดึงไอดีห้องมาจาก URL ตรงๆ (เช่น /room-calendar/701 ค่าที่ได้คือ "701")
    // const currentRoomId = page.params.roomId; 
    let currentRoomId = $derived(page.params.roomId);
    // ✨ local state สำหรับ bind:value ใน select (sync กับ URL ผ่าน $effect ด้านล่าง)
    let selectedRoomId = $state<string>('');
    let calendarDays = $state<any[]>([]);
    let clockText = $state('');
    let dateText = $state('');
    let currentMonthName = $state('');
    let currentRoomName = $state('กำลังโหลดข้อมูลห้อง...');
    let rawRooms = $state<any[]>([]);
    let pb: PocketBase | null = null;

    // ✨ sync URL → local state (เฉพาะกรณี URL เปลี่ยนจากภายนอก เช่น back/forward หรือเปิดลิงก์ตรง)
    // ⚠️ ใช้ untrack กับ selectedRoomId เพื่อไม่ให้ effect re-run ตอน user เปลี่ยน select
    $effect(() => {
        const urlId = currentRoomId; // track เฉพาะ currentRoomId
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
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);

        const formatToBangkokTime = (utcTimeString: string) => {
            if (!utcTimeString) return '--:--';
            try {
                return new Intl.DateTimeFormat('th-TH', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).format(new Date(utcTimeString.replace(' ', 'T')));
            } catch (e) {
                return '--:--';
            }
        };

        for (let i = 0; i < 42; i++) {
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
                        
                        // 🚨 ✨ ไฮไลท์สำคัญ: กรองเพิ่มว่าคิวการจองนี้ต้องเป็นของห้องไอดีนี้เท่านั้น
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

                    const getThaiDateString = (utcTimeString: string) => {
                        if (!utcTimeString) return '';
                        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(utcTimeString.replace(' ', 'T')));
                    };

                    const bookingStartDateOnly = getThaiDateString(b.start_time);
                    const bookingEndDateOnly = getThaiDateString(b.end_time);
                    
                    let displayTime = `${startTimeTH} - ${endTimeTH}`;
                    if (bookingStartDateOnly === dateStrKey && bookingEndDateOnly === dateStrKey) {
                        displayTime = `${startTimeTH} - ${endTimeTH}`;
                    } else if (bookingStartDateOnly !== dateStrKey && bookingEndDateOnly === dateStrKey) {
                        displayTime = `จนถึง ${endTimeTH}`;
                    } else if (bookingStartDateOnly === dateStrKey && bookingEndDateOnly !== dateStrKey) {
                        displayTime = `${startTimeTH} ➔ ข้ามวัน`;
                    } else {
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
            clockText = now.toLocaleTimeString('th-TH', { hour12: false });
            dateText = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            currentMonthName = now.toLocaleDateString('th-TH', { month: 'long' });
        }

        updateClock();
        const clockTimer = window.setInterval(updateClock, 1000);

        return () => {
            window.clearInterval(clockTimer);
        };
    });

    // ✨ Reactive data fetching - re-run เมื่อ currentRoomId เปลี่ยน (รวมถึงตอนเปิดลิงก์ตรง หรือกด back/forward)
    $effect(() => {
        const roomId = currentRoomId;
        if (!roomId || !pocketbaseUrl) return;

        let cancelled = false;
        // เคลียร์ข้อมูลเก่าทันที เพื่อป้องกัน flash ข้อมูลห้องเก่า
        calendarDays = [];

        (async () => {
            // ใช้ pb instance เดียวกันตลอดอายุ component
            if (!pb) pb = new PocketBase(pocketbaseUrl);

            try {
                // โหลด rawRooms แค่ครั้งเดียว (cache)
                const existingRooms = untrack(() => rawRooms);
                let rooms = existingRooms;
                if (rooms.length === 0) {
                    rooms = await pb!.collection('rooms').getFullList({ sort: 'name' });
                    if (cancelled) return;
                    rawRooms = rooms;
                }

                // อัปเดตชื่อห้องที่หัวเว็บ
                const room = rooms.find((r: any) => r.id === roomId);
                if (room) {
                    currentRoomName = room.name;
                } else {
                    currentRoomName = 'ไม่พบห้องนี้';
                }

                // คำนวณ date range ของเดือนปัจจุบัน
                const now = new Date();
                const startRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const endRange = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

                // 🚨 กรองดึงเฉพาะคิวของห้องนี้จากหลังบ้าน
                const bookings = await pb!.collection('bookings').getFullList({
                    filter: `date >= "${startRange}" && date <= "${endRange}" && field = "${roomId}" && (status = "approved" || status = "confirmed")`
                });

                if (cancelled) return;
                calendarDays = generateMonthGridStructure(rooms, bookings);

                // Subscribe live updates (unsubscribe ตัวเก่าก่อน subscribe ใหม่)
                pb!.collection('bookings').unsubscribe('*');
                await pb!.collection('bookings').subscribe('*', async () => {
                    if (cancelled || !pb) return;
                    const nextBookings = await pb.collection('bookings').getFullList({
                        filter: `date >= "${startRange}" && date <= "${endRange}" && field = "${currentRoomId}" && (status = "approved" || status = "confirmed")`
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

<div class="min-h-screen w-screen bg-black p-[1vw] text-slate-100 font-['Prompt',sans-serif]">
    <div class="flex flex-col gap-[1vw]">
        
        <header class="flex flex-col gap-[1vw] border-b border-slate-800/80 pb-[1vw] md:flex-row md:items-end md:justify-between pr-[4vw]">
            <div>
                <div class="inline-flex rounded-full border border-indigo-500/20 bg-indigo-950/40 px-[0.3vw] py-[0.1vw] text-[1vw] font-bold tracking-widest text-indigo-300 uppercase mb-[0.6vw]">
                    Room Schedule
                <select
                    bind:value={selectedRoomId}
                    onchange={() => {
                        if (selectedRoomId) {
                            goto(`/Dashboard/${selectedRoomId}`);
                        }
                    }}
                    class="bg-slate-900 border border-slate-800 text-slate-300 text-[clamp(12px,1vw,15px)] font-semibold rounded-[0.6vw] px-[0.8vw] py-[0.2vw] focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                >
                    {#each rawRooms as room}
                        <option value={room.id}>
                            {room.name}
                        </option>
                    {/each}
                </select>
                </div>
                <h1 class="text-[clamp(28px,4vw,40px)] font-black text-white leading-none tracking-tight">
                    ตารางปฏิทิน {currentRoomName} ประจำเดือน {currentMonthName}
                </h1>
                
            </div>
            
            <div class="text-left md:text-right font-mono">
                <div class="text-[clamp(32px,4.5vw,48px)] font-extrabold text-indigo-300 leading-none">{clockText}</div>
                <div class="text-[clamp(12px,1.2vw,16px)] text-slate-500 mt-[0.4vw] font-['Prompt']">{dateText}</div>
            </div>
        </header>

        <main>
            <MonthlyStatusCalendar {calendarDays} />
        </main>

    </div>
</div>