<script lang="ts">
	import { page } from '$app/stores';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import RFCGraph from '$lib/components/RFCGraph.svelte';
	import RFCPanel from '$lib/components/RFCPanel.svelte';
	import { theme } from '$lib/theme.svelte';
	import wgsData from '$lib/data/wgs.json';
	import rfcsData from '$lib/data/rfcs.json';
	import areasData from '$lib/data/areas.json';
	import edgesData from '$lib/data/graph-edges.json';
	import type { WorkingGroup, RFC, GraphEdge, Area } from '$lib/data';

	const wgs = wgsData as WorkingGroup[];
	const allRfcs = rfcsData as RFC[];
	const areas = areasData as Area[];
	const allEdges = edgesData as GraphEdge[];

	const slug = $derived($page.params.slug);
	const wg = $derived(wgs.find(w => w.slug === slug));
	const area = $derived(areas.find(a => a.slug === wg?.area));
	const wgRfcs = $derived(allRfcs.filter(r => r.wg === slug));

	let selectedRfcNum = $state<number | null>(null);
	const selectedRfc = $derived(selectedRfcNum !== null ? allRfcs.find(r => r.number === selectedRfcNum) ?? null : null);

	function handleSelectRfc(num: number) {
		selectedRfcNum = num;
	}

	function handleClose() {
		selectedRfcNum = null;
	}
</script>

<svelte:head>
	<title>{wg?.fullName ?? 'Working Group'} — RFC Explorer</title>
</svelte:head>

{#if wg}
<div class="h-[calc(100vh-2.75rem)] flex flex-col overflow-hidden">
	<!-- Top bar -->
	<div class="flex-shrink-0 px-6 pt-6 pb-4 border-b border-black dark:border-neutral-800 bg-white dark:bg-neutral-950">
		<Breadcrumb crumbs={[
			{ label: area?.name ?? wg.area, href: `/area/${wg.area}` },
			{ label: wg.name }
		]} />

		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-1">{wg.name}</p>
				<h1 class="text-xl font-black text-black dark:text-white leading-tight">{wg.fullName}</h1>
				<p class="text-xs text-neutral-500 dark:text-neutral-500 mt-1 max-w-2xl leading-relaxed">{wg.description}</p>
			</div>
			<div class="flex-shrink-0 text-right">
				<p class="text-2xl font-black text-black dark:text-white">{wgRfcs.length}</p>
				<p class="text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600">RFCs</p>
			</div>
		</div>

		{#if wg.summary}
		<details class="mt-3">
			<summary class="text-[10px] tracking-[0.15em] uppercase font-bold text-blue-600 dark:text-blue-700 hover:text-blue-800 dark:hover:text-blue-500 cursor-pointer select-none transition-colors">
				About this group ↓
			</summary>
			<p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mt-2 max-w-3xl border-l-2 border-neutral-200 dark:border-neutral-800 pl-3">
				{wg.summary}
			</p>
		</details>
		{/if}
	</div>

	<!-- Graph area -->
	<div class="flex-1 relative overflow-hidden">
		{#if wgRfcs.length > 0}
			<RFCGraph rfcs={wgRfcs} edges={allEdges} dark={theme.dark} onSelectRfc={handleSelectRfc} />
		{:else}
			<div class="flex items-center justify-center h-full bg-white dark:bg-neutral-950">
				<div class="text-center">
					<p class="text-xs text-neutral-400 mb-1">No RFC data for this working group.</p>
					<p class="text-[10px] text-neutral-500 dark:text-neutral-600">Run the data fetch script to populate RFC data.</p>
				</div>
			</div>
		{/if}

		<!-- Tip -->
		{#if wgRfcs.length > 0 && !selectedRfcNum}
		<div class="absolute bottom-4 right-4 border border-black dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-[10px] tracking-[0.1em] uppercase text-neutral-400 dark:text-neutral-600">
			Click any node to explore
		</div>
		{/if}
	</div>
</div>

<!-- RFC detail panel -->
{#if selectedRfc}
	<RFCPanel
		rfc={selectedRfc}
		allRfcs={allRfcs}
		onClose={handleClose}
		onSelectRfc={handleSelectRfc}
	/>
{/if}
{:else}
<main class="min-h-screen flex items-center justify-center">
	<div class="text-center">
		<p class="text-sm text-neutral-400 mb-2">Working group not found.</p>
		<a href="/" class="text-[10px] tracking-[0.2em] uppercase underline hover:text-black dark:hover:text-white transition-colors">← Back</a>
	</div>
</main>
{/if}
