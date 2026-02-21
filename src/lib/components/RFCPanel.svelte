<script lang="ts">
	import type { RFC } from '$lib/data';
	import { STATUS_LABELS } from '$lib/data';

	let {
		rfc,
		allRfcs,
		onClose,
		onSelectRfc
	}: {
		rfc: RFC;
		allRfcs: RFC[];
		onClose: () => void;
		onSelectRfc: (num: number) => void;
	} = $props();

	let mode = $state<'plain' | 'technical'>('plain');

	function getRfc(num: number) {
		return allRfcs.find(r => r.number === num);
	}

	const statusLabel = $derived((STATUS_LABELS[rfc.status] ?? rfc.status).toUpperCase());

	const relatedNumbers = $derived([
		...rfc.obsoletes,
		...rfc.updatedBy,
		...rfc.updates,
		...rfc.obsoletedBy
	].filter((v, i, a) => a.indexOf(v) === i));
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/40 dark:bg-black/60 z-40"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="button"
	tabindex="0"
	aria-label="Close panel"
></div>

<!-- Panel -->
<aside class="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-neutral-950 border-l border-black dark:border-neutral-800 z-50 flex flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex-shrink-0 border-b border-black dark:border-neutral-800 p-6">
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-3 mb-3">
					<span class="text-[10px] tracking-[0.2em] uppercase font-bold border border-current px-1.5 py-0.5 text-neutral-500 dark:text-neutral-500">
						{statusLabel}
					</span>
					<span class="text-[10px] text-neutral-400 dark:text-neutral-600 tracking-wider">{rfc.date}</span>
				</div>
				<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-1">RFC {rfc.number}</p>
				<h2 class="text-sm font-bold text-black dark:text-white leading-snug">
					{rfc.title}
				</h2>
			</div>
			<button
				onclick={onClose}
				class="text-[10px] font-bold tracking-[0.2em] uppercase border border-current px-2 py-1 text-neutral-400 dark:text-neutral-600 hover:text-black hover:border-black dark:hover:text-white dark:hover:border-white transition-colors flex-shrink-0"
				aria-label="Close"
			>
				ESC
			</button>
		</div>

		<!-- Mode toggle -->
		<div class="flex gap-0 mt-4 border border-black dark:border-blue-900 w-fit">
			<button
				onclick={() => mode = 'plain'}
				class="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 transition-colors duration-150 {mode === 'plain' ? 'bg-blue-700 dark:bg-blue-900 text-white' : 'text-neutral-500 dark:text-neutral-500 hover:text-black dark:hover:text-blue-300'}"
			>
				Plain English
			</button>
			<button
				onclick={() => mode = 'technical'}
				class="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 transition-colors duration-150 {mode === 'technical' ? 'bg-blue-700 dark:bg-blue-900 text-white' : 'text-neutral-500 dark:text-neutral-500 hover:text-black dark:hover:text-blue-300'}"
			>
				Technical
			</button>
		</div>
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto">
		<!-- Summary -->
		<div class="p-6 border-b border-neutral-200 dark:border-neutral-900">
			<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-3">
				{mode === 'plain' ? 'What is this?' : 'Summary'}
			</p>
			<p class="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
				{mode === 'plain' ? (rfc.beginner || rfc.summary) : rfc.summary}
			</p>
		</div>

		<!-- Impact (technical only) -->
		{#if mode === 'technical' && rfc.impact}
		<div class="p-6 border-b border-neutral-200 dark:border-neutral-900">
			<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-3">Real-World Impact</p>
			<p class="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{rfc.impact}</p>
		</div>
		{/if}

		<!-- Authors -->
		{#if rfc.authors.length > 0}
		<div class="p-6 border-b border-neutral-200 dark:border-neutral-900">
			<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-3">Authors</p>
			<p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
				{rfc.authors.join(' · ')}
			</p>
		</div>
		{/if}

		<!-- Relationships -->
		{#if relatedNumbers.length > 0}
		<div class="p-6 border-b border-neutral-200 dark:border-neutral-900">
			<p class="text-[10px] tracking-[0.25em] uppercase font-bold text-neutral-400 dark:text-neutral-600 mb-4">Relationships</p>
			<div class="space-y-4">
				{#if rfc.obsoletedBy.length > 0}
				<div>
					<p class="text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600 mb-2">Obsoleted by</p>
					<div class="flex flex-wrap gap-1.5">
						{#each rfc.obsoletedBy as num}
							<button
								onclick={() => onSelectRfc(num)}
								class="text-[10px] font-bold tracking-wider border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-colors duration-150"
								title={getRfc(num)?.title}
							>
								RFC {num}
							</button>
						{/each}
					</div>
				</div>
				{/if}

				{#if rfc.obsoletes.length > 0}
				<div>
					<p class="text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600 mb-2">Obsoletes</p>
					<div class="flex flex-wrap gap-1.5">
						{#each rfc.obsoletes as num}
							<button
								onclick={() => onSelectRfc(num)}
								class="text-[10px] font-bold tracking-wider border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-colors duration-150"
								title={getRfc(num)?.title}
							>
								RFC {num}
							</button>
						{/each}
					</div>
				</div>
				{/if}

				{#if rfc.updatedBy.length > 0}
				<div>
					<p class="text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600 mb-2">Updated by</p>
					<div class="flex flex-wrap gap-1.5">
						{#each rfc.updatedBy as num}
							<button
								onclick={() => onSelectRfc(num)}
								class="text-[10px] font-bold tracking-wider border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-colors duration-150"
							>
								RFC {num}
							</button>
						{/each}
					</div>
				</div>
				{/if}

				{#if rfc.updates.length > 0}
				<div>
					<p class="text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600 mb-2">Updates</p>
					<div class="flex flex-wrap gap-1.5">
						{#each rfc.updates as num}
							<button
								onclick={() => onSelectRfc(num)}
								class="text-[10px] font-bold tracking-wider border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-colors duration-150"
								title={getRfc(num)?.title}
							>
								RFC {num}
							</button>
						{/each}
					</div>
				</div>
				{/if}
			</div>
		</div>
		{/if}

		<!-- External link -->
		<div class="p-6">
			<a
				href="https://www.rfc-editor.org/rfc/rfc{rfc.number}"
				target="_blank"
				rel="noopener noreferrer"
				class="text-[10px] font-bold tracking-[0.2em] uppercase border border-blue-700 dark:border-blue-800 text-blue-700 dark:text-blue-500 px-3 py-2 inline-block hover:bg-blue-700 hover:text-white dark:hover:bg-blue-900 dark:hover:text-blue-100 transition-colors duration-150"
			>
				→ READ FULL RFC {rfc.number}
			</a>
		</div>
	</div>
</aside>
