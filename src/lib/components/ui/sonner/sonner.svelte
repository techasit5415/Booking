<script lang="ts">
	import { Toaster as Sonner } from 'svelte-sonner';
	import { mode } from 'mode-watcher';

	let { ...restProps } = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	toastOptions={{
		class:
			'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
		descriptionClass: 'group-[.toast]:text-muted-foreground',
	}}
	{...restProps}
/>
