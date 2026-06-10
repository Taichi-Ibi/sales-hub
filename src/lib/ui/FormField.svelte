<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		hint,
		error,
		children,
		class: extra = ''
	}: {
		label: string;
		hint?: string;
		error?: string;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<div class="gap-xs flex flex-col {extra}">
	<span class="text-muted text-xs font-semibold">{label}</span>
	{@render children()}
	{#if hint && !error}
		<span class="text-muted text-xs">{hint}</span>
	{/if}
	{#if error}
		<span class="text-error text-xs">{error}</span>
	{/if}
</div>
