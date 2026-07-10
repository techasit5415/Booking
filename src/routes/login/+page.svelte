<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_KMITL_CLIENT_ID, PUBLIC_KMITL_REDIRECT_URI } from '$env/static/public';
	import { AlertCircle, LogIn, CalendarRange, LayoutDashboard } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	const errorMessage = page.url.searchParams.get('error');

	function redirectToKmitl() {
		const url = new URL('https://portal.science.kmitl.ac.th/o/oauth2/auth');
		url.searchParams.set('client_id', PUBLIC_KMITL_CLIENT_ID);
		url.searchParams.set('redirect_uri', PUBLIC_KMITL_REDIRECT_URI);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', 'read:userinfo,read:profile');
		url.searchParams.set('state', 'any-random-string-123');
		window.location.href = url.toString();
	}
</script>

<svelte:head>
	<title>เข้าสู่ระบบ | Booking KMITL</title>
</svelte:head>

<div
	class="flex min-h-screen w-screen items-center justify-center bg-background font-['Inter','Prompt',sans-serif] antialiased transition-colors duration-300"
>
	<!-- Simple Clean Card Container -->
	<div
		class="w-full max-w-md p-4"
		in:fade={{ duration: 250 }}
	>
		<div
			class="border border-border bg-card rounded-xl p-8 shadow-sm"
		>
			<!-- Simple Header -->
			<div class="flex flex-col items-center space-y-4 text-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
				>
					<CalendarRange class="h-6 w-6" />
				</div>

				<div class="space-y-1">
					<h1 class="text-2xl font-bold tracking-tight text-foreground">
						เข้าสู่ระบบจองห้องเรียน
					</h1>
					<p class="text-muted-foreground text-sm">
						คณะวิทยาศาสตร์ สจล.
					</p>
				</div>
			</div>

			<!-- Error State -->
			{#if errorMessage}
				<div
					class="border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 mt-6 flex items-start gap-3 rounded-lg border p-4 text-sm"
					in:fade={{ duration: 150 }}
				>
					<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
					<div>
						<div class="font-semibold">ข้อผิดพลาดในการเข้าสู่ระบบ</div>
						<div class="text-xs mt-0.5 opacity-90">{errorMessage}</div>
					</div>
				</div>
			{/if}

			<!-- Actions -->
			<div class="mt-8 space-y-4">
				<button
					onclick={redirectToKmitl}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-semibold transition-colors duration-200 shadow-sm cursor-pointer"
				>
					<LogIn class="h-4 w-4" />
					ลงชื่อเข้าใช้งานด้วย KMITL Account
				</button>

				<a
					href="/"
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-accent text-foreground/80 py-3 text-sm font-semibold transition-colors duration-200 shadow-xs text-center"
				>
					<LayoutDashboard class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
					ดูตารางการใช้งานห้อง (Dashboard)
				</a>

				<div class="relative flex py-1 items-center">
					<div class="flex-grow border-t border-border"></div>
					<span class="mx-4 flex-shrink text-muted-foreground text-[10px] tracking-wider uppercase font-medium">
						บัญชีผู้ใช้งาน
					</span>
					<div class="flex-grow border-t border-border"></div>
				</div>

				<p class="text-muted-foreground text-center text-xs leading-relaxed">
					สำหรับบุคลากรและนักศึกษา คณะวิทยาศาสตร์ สจล. <br />
					โปรดใช้บัญชีอีเมล <span class="font-mono text-muted-foreground">@kmitl.ac.th</span> ในการเข้าใช้ระบบ
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap');
</style>
