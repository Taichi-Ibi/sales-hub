<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'pending' | 'approved' | 'rejected' | 'brand' | 'accent';

	let {
		tone = 'brand',
		children,
		class: extra = ''
	}: {
		tone?: Tone;
		children: Snippet;
		class?: string;
	} = $props();

	const tones: Record<Tone, string> = {
		pending: 'bg-accent-light text-warning',
		approved: 'bg-[#e6f4ea] text-success',
		rejected: 'bg-[#fdecea] text-error',
		brand: 'bg-brand-light text-brand',
		accent: 'bg-accent text-brand-dark'
	};
</script>

<span class="inline-block rounded-[10px] px-[6px] py-[2px] text-xs font-bold {tones[tone]} {extra}">
	{@render children()}
</span>
