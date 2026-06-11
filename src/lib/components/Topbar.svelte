<script lang="ts">
    import { page } from '$app/state';

    // page.data.user มาจาก +layout.server.ts (อ่านจาก pb_auth cookie)
    const user = $derived(page.data.user);

    /** fallback ลำดับ: ชื่อจริง → ส่วนหน้า @ ของ email → "ผู้ใช้" */
    function displayName(name: string, email: string): string {
        const trimmed = (name ?? '').trim();
        if (trimmed) return trimmed;
        const prefix = email?.split('@')[0];
        return prefix || 'ผู้ใช้';
    }

    function avatarChar(name: string, email: string): string {
        const source = (name && name.trim()) || email || '?';
        // รองรับชื่อภาษาไทย เช่น "นายเตชสิทธิ์" → เอาตัวอักษรแรก
        return source.charAt(0).toUpperCase();
    }
</script>

{#if user}
    <header
        class="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
    >
        <div
            class="mx-auto flex max-w-400 items-center justify-between gap-4 px-6 py-3 md:px-10"
        >
            <!-- Left: brand -->
            <a
                href="/book"
                class="flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Booking</span>
                <span class="hidden text-xs font-normal text-zinc-500 sm:inline dark:text-zinc-400">
                    · ระบบจองห้อง
                </span>
            </a>

            <!-- Right: user info + logout -->
            <div class="flex items-center gap-3">
                <div class="hidden text-right sm:block">
                    <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {displayName(user.name, user.email)}
                    </div>
                    <div class="text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email}
                    </div>
                </div>

                <div
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                    aria-hidden="true"
                >
                    {avatarChar(user.name, user.email)}
                </div>

                <form method="POST" action="/auth/logout">
                    <button
                        type="submit"
                        class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                        Logout
                    </button>
                </form>
            </div>
        </div>
    </header>
{/if}
