<script lang="ts">
	import { page } from '$app/state';
	import { CalendarPlus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ThemeToggle from './ThemeToggle.svelte';

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
		class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur"
	>
		<div
			class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3 md:px-10"
		>
			<!-- Left: brand -->
			<a href="/book" class="flex items-center gap-2 font-semibold tracking-tight">
				<span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
				<span>Booking</span>
				<span class="text-muted-foreground hidden text-xs font-normal sm:inline">
					· ระบบจองห้อง
				</span>
			</a>

			<!-- Right: actions + user info + logout -->
			<div class="flex items-center gap-3">
				<Button href="/book" variant="default" size="sm" class="gap-1.5">
					<CalendarPlus class="h-4 w-4" />
					จองห้อง
				</Button>

				<ThemeToggle />

				<Separator orientation="vertical" class="h-6" />

				<div class="hidden text-right sm:block">
					<div class="text-sm font-semibold">
						{displayName(user.name, user.email)}
					</div>
					<div class="text-muted-foreground text-xs">
						{user.email}
					</div>
				</div>

				<div
					class="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
					aria-hidden="true"
				>
					{avatarChar(user.name, user.email)}
				</div>

				<form method="POST" action="/auth/logout">
					<Button type="submit" variant="outline" size="sm">
						Logout
					</Button>
				</form>
			</div>
		</div>
	</header>
{/if}