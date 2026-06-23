<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/Topbar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher defaultMode="light" />
<Toaster />

<!-- <Topbar /> -->
{@render children()}
