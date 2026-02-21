<script lang="ts">
	interface Crumb {
		label: string;
		href?: string;
	}

	let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav class="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-neutral-400 dark:text-neutral-600 mb-6">
	<a href="/" class="hover:text-black dark:hover:text-white transition-colors">RFC EXPLORER</a>
	{#each crumbs as crumb}
		<span class="text-neutral-300 dark:text-neutral-700">/</span>
		{#if crumb.href}
			<a href={crumb.href} class="hover:text-black dark:hover:text-white transition-colors">{crumb.label}</a>
		{:else}
			<span class="text-black dark:text-white">{crumb.label}</span>
		{/if}
	{/each}
</nav>
