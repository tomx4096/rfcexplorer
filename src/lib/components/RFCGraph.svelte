<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { RFC, GraphEdge } from '$lib/data';

	let {
		rfcs,
		edges,
		dark = true,
		onSelectRfc
	}: {
		rfcs: RFC[];
		edges: GraphEdge[];
		dark?: boolean;
		onSelectRfc: (num: number) => void;
	} = $props();

	let container: HTMLDivElement;
	let cy: any = $state(null);
	let maxDeg = $state(1);

	function buildStyle(isDark: boolean, maxDegree: number): any[] {
		const nodeBg     = isDark ? '#0a0a0a' : '#ffffff';
		const nodeBorder = isDark ? '#3a3a3a' : '#aaaaaa';
		const nodeText   = isDark ? '#cccccc' : '#333333';
		const nodeBorderHover   = isDark ? '#aaaaaa' : '#111111';
		const nodeSelectedBg    = isDark ? '#ffffff' : '#000000';
		const nodeSelectedText  = isDark ? '#000000' : '#ffffff';

		// Size range: low-degree nodes are small rectangles, high-degree are larger
		const minW = 60; const maxW = 120;
		const minH = 28; const maxH = 52;

		return [
			{
				selector: 'node',
				style: {
					'shape': 'rectangle',
					'background-color': nodeBg,
					'label': 'data(label)',
					'color': nodeText,
					'font-size': `mapData(degree, 0, ${maxDegree}, 9, 12)`,
					'font-family': '"IBM Plex Mono", ui-monospace, monospace',
					'font-weight': '600',
					'text-valign': 'center',
					'text-halign': 'center',
					'width':  `mapData(degree, 0, ${maxDegree}, ${minW}, ${maxW})`,
					'height': `mapData(degree, 0, ${maxDegree}, ${minH}, ${maxH})`,
					'border-width': 1,
					'border-color': nodeBorder,
				}
			},
			{
				selector: 'node[status = "historic"]',
				style: {
					'border-style': 'dashed',
					'color': isDark ? '#666666' : '#999999',
				}
			},
			{
				selector: 'node[status = "experimental"]',
				style: {
					'border-style': 'dotted',
				}
			},
			{
				selector: 'node:hover',
				style: {
					'border-width': 2,
					'border-color': nodeBorderHover,
					'border-style': 'solid',
					'z-index': 10
				}
			},
			{
				selector: 'node.selected',
				style: {
					'background-color': nodeSelectedBg,
					'color': nodeSelectedText,
					'border-width': 2,
					'border-color': nodeSelectedBg,
					'border-style': 'solid',
					'z-index': 20
				}
			},
			{
				selector: 'edge',
				style: {
					'width': 1,
					'line-color': isDark ? '#3a3a3a' : '#cccccc',
					'target-arrow-color': isDark ? '#555555' : '#aaaaaa',
					'target-arrow-shape': 'triangle',
					'curve-style': 'bezier',
					'opacity': 0.8,
					'arrow-scale': 0.7
				}
			},
			{
				selector: 'edge[type = "obsoletes"]',
				style: {
					'line-color': isDark ? '#663333' : '#cc8888',
					'target-arrow-color': isDark ? '#663333' : '#cc8888',
					'line-style': 'dashed',
				}
			},
			{
				selector: 'edge[type = "updates"]',
				style: {
					'line-color': isDark ? '#555522' : '#aaaa44',
					'target-arrow-color': isDark ? '#555522' : '#aaaa44',
				}
			},
			{
				selector: 'edge:hover',
				style: {
					'width': 2,
					'opacity': 1
				}
			}
		];
	}

	$effect(() => {
		if (!cy) return;
		cy.style(buildStyle(dark, maxDeg));
		container.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';
	});

	onMount(async () => {
		const cytoscape = (await import('cytoscape')).default;

		const rfcNumbers = new Set(rfcs.map(r => r.number));
		const filteredEdges = edges.filter(
			e => rfcNumbers.has(e.source) && rfcNumbers.has(e.target)
		);

		// Compute degree (undirected: each edge counts for both endpoints)
		const degreeMap = new Map<string, number>();
		rfcs.forEach(r => degreeMap.set(String(r.number), 0));
		filteredEdges.forEach(e => {
			const s = String(e.source), t = String(e.target);
			degreeMap.set(s, (degreeMap.get(s) ?? 0) + 1);
			degreeMap.set(t, (degreeMap.get(t) ?? 0) + 1);
		});
		const computedMax = Math.max(1, ...Array.from(degreeMap.values()));
		maxDeg = computedMax;

		const nodes = rfcs.map(rfc => ({
			data: {
				id: String(rfc.number),
				label: `RFC ${rfc.number}`,
				title: rfc.title,
				status: rfc.status,
				degree: degreeMap.get(String(rfc.number)) ?? 0,
			}
		}));

		const cytoscapeEdges = filteredEdges.map(e => ({
			data: {
				id: `${e.source}-${e.target}-${e.type}`,
				source: String(e.source),
				target: String(e.target),
				type: e.type,
			}
		}));

		cy = cytoscape({
			container,
			elements: { nodes, edges: cytoscapeEdges },
			style: buildStyle(dark, computedMax),
			layout: {
				name: rfcs.length <= 4 ? 'circle' : 'cose',
				animate: true,
				animationDuration: 400,
				padding: 40,
				...(rfcs.length > 4 ? {
					idealEdgeLength: 120,
					nodeOverlap: 20,
					refresh: 20,
					fit: true,
					randomize: false,
					componentSpacing: 80,
					nodeRepulsion: 8000,
					edgeElasticity: 90,
					nestingFactor: 5,
					gravity: 80,
					numIter: 1000
				} : {})
			},
			userZoomingEnabled: true,
			userPanningEnabled: true,
			boxSelectionEnabled: false
		});

		container.style.backgroundColor = dark ? '#0a0a0a' : '#ffffff';

		cy.on('tap', 'node', (evt: any) => {
			cy.$('.selected').removeClass('selected');
			evt.target.addClass('selected');
			onSelectRfc(Number(evt.target.data('id')));
		});

		cy.on('tap', (evt: any) => {
			if (evt.target === cy) {
				cy.$('.selected').removeClass('selected');
			}
		});
	});

	onDestroy(() => {
		cy?.destroy();
	});
</script>

<div class="relative w-full h-full">
	<div bind:this={container} class="w-full h-full"></div>

	<!-- Legend -->
	<div class="absolute bottom-4 left-4 border border-black dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 text-[10px] space-y-2.5">
		<p class="tracking-[0.2em] uppercase font-bold text-neutral-400 dark:text-neutral-600">Node Status</p>
		<div class="space-y-1.5">
			<div class="flex items-center gap-2">
				<div class="w-5 h-3 border border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
				<span class="text-neutral-500 dark:text-neutral-500">Standard / Proposed</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-5 h-3 border border-dashed border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
				<span class="text-neutral-500 dark:text-neutral-500">Historic</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-5 h-3 border border-dotted border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
				<span class="text-neutral-500 dark:text-neutral-500">Experimental</span>
			</div>
		</div>

		<p class="tracking-[0.2em] uppercase font-bold text-neutral-400 dark:text-neutral-600 pt-1">Edge Types</p>
		<div class="space-y-1.5">
			<div class="flex items-center gap-2">
				<div class="w-5 h-px bg-neutral-400 dark:bg-neutral-600 flex-shrink-0"></div>
				<span class="text-neutral-500 dark:text-neutral-500">Updates</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-5 h-px border-t border-dashed border-red-400 dark:border-red-800 flex-shrink-0"></div>
				<span class="text-neutral-500 dark:text-neutral-500">Obsoletes</span>
			</div>
		</div>

		<p class="tracking-[0.2em] uppercase font-bold text-neutral-400 dark:text-neutral-600 pt-1">Node Size</p>
		<div class="flex items-center gap-2">
			<div class="flex items-end gap-1">
				<div class="w-4 h-2 border border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
				<div class="w-5 h-3 border border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
				<div class="w-7 h-4 border border-neutral-400 dark:border-neutral-600 flex-shrink-0"></div>
			</div>
			<span class="text-neutral-500 dark:text-neutral-500">= degree</span>
		</div>
	</div>

	<!-- Zoom controls -->
	<div class="absolute top-4 right-4 flex flex-col gap-px border border-black dark:border-neutral-800">
		<button
			onclick={() => cy?.zoom({ level: cy.zoom() * 1.2, renderedPosition: { x: container.offsetWidth / 2, y: container.offsetHeight / 2 } })}
			class="w-8 h-8 bg-white dark:bg-neutral-950 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-neutral-400 flex items-center justify-center transition-colors duration-150 text-sm font-bold border-b border-black dark:border-neutral-800"
			aria-label="Zoom in"
		>+</button>
		<button
			onclick={() => cy?.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: container.offsetWidth / 2, y: container.offsetHeight / 2 } })}
			class="w-8 h-8 bg-white dark:bg-neutral-950 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-neutral-400 flex items-center justify-center transition-colors duration-150 text-sm font-bold border-b border-black dark:border-neutral-800"
			aria-label="Zoom out"
		>−</button>
		<button
			onclick={() => cy?.fit(undefined, 40)}
			class="w-8 h-8 bg-white dark:bg-neutral-950 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-neutral-400 flex items-center justify-center transition-colors duration-150"
			aria-label="Fit to view"
			title="Reset view"
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
			</svg>
		</button>
	</div>
</div>
