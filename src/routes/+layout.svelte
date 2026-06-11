<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Topbar from '$lib/components/Topbar.svelte';

	let { children } = $props();

</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<!-- <Topbar /> -->
{@render children()}
