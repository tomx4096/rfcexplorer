<script lang="ts">
	import type { Area } from '$lib/data';

	let { area }: { area: Area } = $props();
</script>

<a
	href="/area/{area.slug}"
	class="group block p-6 h-full border border-black dark:border-neutral-700 transition-colors duration-150 hover:bg-black hover:border-black dark:hover:bg-blue-950 dark:hover:border-blue-700 cursor-pointer"
>
	<div class="flex items-baseline justify-between mb-5">
		<span class="text-[10px] tracking-[0.25em] uppercase font-semibold text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-blue-600 transition-colors duration-150">
			{area.wgCount} WG · {area.rfcCount} RFC
		</span>
	</div>

	<h2 class="text-xl font-black text-black dark:text-white group-hover:text-white dark:group-hover:text-blue-100 leading-tight mb-3 transition-colors duration-150">
		{area.name}
	</h2>

	<p class="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-400 dark:group-hover:text-blue-300/60 mb-6 transition-colors duration-150 ">
		{area.description}
	</p>

	<div class="text-[10px] font-bold tracking-[0.25em] uppercase text-blue-600 dark:text-blue-500 group-hover:text-blue-300 dark:group-hover:text-blue-400 transition-colors duration-150">
		EXPLORE →
	</div>
</a>
