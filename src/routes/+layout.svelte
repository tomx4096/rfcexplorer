<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { theme, toggleTheme, initTheme } from '$lib/theme.svelte';

	let { children } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<div class="min-h-screen bg-white dark:bg-neutral-950 text-black dark:text-neutral-100">
	<!-- Header -->
	<header class="sticky top-0 z-30 flex items-center justify-between px-6 h-11 border-b-2 border-black dark:border-blue-950 bg-white dark:bg-neutral-950">
		<a href="/" class="text-xs font-bold tracking-[0.3em] uppercase hover:opacity-60 transition-opacity">
			RFC EXPLORER
		</a>
		<button
			onclick={toggleTheme}
			class="text-[10px] font-bold tracking-[0.2em] uppercase border border-current px-2.5 py-1 hover:bg-black hover:text-white dark:hover:bg-blue-950 dark:hover:text-blue-200 dark:hover:border-blue-700 transition-colors duration-150"
			aria-label="Toggle theme"
		>
			{theme.dark ? '○ LIGHT' : '● DARK'}
		</button>
	</header>

	{@render children()}
</div>
