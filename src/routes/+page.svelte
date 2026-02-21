<script lang="ts">
	import { onMount } from 'svelte';
	import AreaCard from '$lib/components/AreaCard.svelte';
	import areasData from '$lib/data/areas.json';
	import type { Area } from '$lib/data';

	const areas = areasData as Area[];
	let visible = $state(false);
	onMount(() => { visible = true; });
</script>

<svelte:head>
	<title>RFC Explorer</title>
	<meta name="description" content="Explore IETF RFCs — the documents that define how the internet works — through an interactive graph explorer." />
</svelte:head>

<main class="max-w-5xl mx-auto px-6 py-8">
	<!-- Hero -->
	<div class="mb-8 pb-6 border-b border-black dark:border-neutral-800">
		<p class="text-[10px] tracking-[0.35em] uppercase text-neutral-400 dark:text-neutral-600 mb-3">
			Internet Engineering Task Force · Est. 1986
		</p>
		<h1 class="text-4xl sm:text-5xl font-black text-black dark:text-white leading-none tracking-tight mb-4">
			RFC EXPLORER
		</h1>
		<p class="text-xs text-neutral-600 dark:text-neutral-400 max-w-lg leading-relaxed">
			Request for Comments — the documents that define how the internet works.
			~9,000 specifications spanning 50+ years of history.
		</p>
	</div>

	<!-- Section label -->
	<div class="flex items-baseline justify-between mb-3">
		<p class="text-[10px] tracking-[0.35em] uppercase text-blue-600 dark:text-blue-600 font-bold">
			Areas of Work
		</p>
		<p class="text-[10px] text-neutral-400 dark:text-neutral-600">{areas.length} areas</p>
	</div>

	<!-- BIOS frame: outer border with corner crosshair marks -->
	<div class="relative border border-neutral-300 dark:border-neutral-800 p-2">
		<!-- Corner marks -->
		<span class="absolute -top-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -top-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -bottom-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -bottom-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>

		<!-- Card grid with gaps -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
			{#each areas as area, i}
				<div
					class="transition-opacity duration-300"
					style="opacity: {visible ? 1 : 0}; transition-delay: {i * 60}ms"
				>
					<AreaCard {area} />
				</div>
			{/each}
		</div>
	</div>

	<!-- Footer -->
	<p class="text-[10px] text-neutral-400 dark:text-neutral-600 mt-8">
		Data from <a href="https://www.rfc-editor.org" class="underline hover:text-black dark:hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">IETF RFC Editor</a>.
		Summaries pre-generated for educational purposes.
	</p>
</main>
