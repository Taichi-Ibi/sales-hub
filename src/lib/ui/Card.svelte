<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		children,
		class: extra = '',
		...rest
	}: {
		children: Snippet;
		class?: string;
	} & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class="bg-surface p-lg shadow-card rounded-md {extra}" {...rest}>
	{@render children()}
</div>
