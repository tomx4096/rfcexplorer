<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import areasData from '$lib/data/areas.json';
	import wgsData from '$lib/data/wgs.json';
	import type { Area, WorkingGroup } from '$lib/data';

	const areas = areasData as Area[];
	const wgs = wgsData as WorkingGroup[];

	const slug = $derived($page.params.slug);
	const area = $derived(areas.find(a => a.slug === slug));
	const areaWgs = $derived(wgs.filter(w => w.area === slug));

	let visible = $state(false);
	onMount(() => { visible = true; });
</script>

<svelte:head>
	<title>{area?.name ?? 'Area'} — RFC Explorer</title>
</svelte:head>

{#if area}
<main class="max-w-5xl mx-auto px-6 py-10">
	<Breadcrumb crumbs={[{ label: area.name }]} />

	<!-- Area header -->
	<div class="mb-8 pb-8 border-b border-black dark:border-neutral-800">
		<p class="text-[10px] tracking-[0.35em] uppercase text-neutral-400 dark:text-neutral-600 mb-2">
			{area.slug}
		</p>
		<h1 class="text-4xl sm:text-5xl font-black text-black dark:text-white leading-none tracking-tight mb-4">
			{area.name}
		</h1>
		<p class="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed mb-6">
			{area.description}
		</p>

		<!-- Fun fact: BIOS note box -->
		<div class="relative border border-neutral-300 dark:border-blue-900/50 p-4 max-w-2xl">
			<span class="absolute -top-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
			<span class="absolute -top-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
			<span class="absolute -bottom-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
			<span class="absolute -bottom-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
			<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-blue-600 dark:text-blue-600 mb-2">Note</p>
			<p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{area.funFact}</p>
		</div>
	</div>

	<!-- Working groups -->
	<div class="flex items-baseline justify-between mb-3">
		<p class="text-[10px] tracking-[0.35em] uppercase text-blue-600 dark:text-blue-600 font-bold">
			Working Groups
		</p>
		<p class="text-[10px] text-neutral-400 dark:text-neutral-600">{areaWgs.length} groups</p>
	</div>

	<div class="relative border border-neutral-300 dark:border-neutral-800 p-2">
		<span class="absolute -top-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -top-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -bottom-[7px] -left-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>
		<span class="absolute -bottom-[7px] -right-[7px] text-xs leading-none text-neutral-300 dark:text-blue-900 select-none" aria-hidden="true">┼</span>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
			{#each areaWgs as wg, i}
				<a
					href="/wg/{wg.slug}"
					class="group border border-black dark:border-neutral-700 p-5 transition-colors duration-150 hover:bg-black hover:border-black dark:hover:bg-blue-950 dark:hover:border-blue-700"
					style="opacity: {visible ? 1 : 0}; transition: opacity 0.3s {i * 40}ms, background-color 0.15s, border-color 0.15s"
				>
					<div class="flex items-start justify-between mb-3">
						<span class="text-[10px] tracking-[0.2em] uppercase font-bold text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-blue-600 transition-colors duration-150">
							{wg.name}
						</span>
						<span class="text-[10px] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-blue-600 transition-colors duration-150 ml-4 flex-shrink-0">
							{wg.rfcCount} RFC
						</span>
					</div>

					<h3 class="text-sm font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-blue-100 leading-tight mb-2 transition-colors duration-150">
						{wg.fullName}
					</h3>

					<p class="text-xs text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-400 dark:group-hover:text-blue-300/60 leading-relaxed transition-colors duration-150">
						{wg.description}
					</p>

					<div class="mt-4 text-[10px] font-bold tracking-[0.2em] uppercase text-blue-600 dark:text-blue-500 group-hover:text-blue-300 dark:group-hover:text-blue-400 transition-colors duration-150">
						VIEW GRAPH →
					</div>
				</a>
			{/each}
		</div>
	</div>
</main>
{:else}
<main class="min-h-screen flex items-center justify-center">
	<div class="text-center">
		<p class="text-neutral-400 text-xs mb-2">Area not found.</p>
		<a href="/" class="text-[10px] tracking-[0.2em] uppercase underline hover:text-black dark:hover:text-white transition-colors">← Back</a>
	</div>
</main>
{/if}
