<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type Size = 'sm' | 'md';

	let {
		variant = 'primary',
		size = 'md',
		children,
		class: extra = '',
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		children: Snippet;
		class?: string;
	} & HTMLButtonAttributes = $props();

	const variants: Record<Variant, string> = {
		primary: 'border-transparent bg-brand text-white hover:bg-brand-hover',
		secondary: 'border-border bg-surface text-text hover:bg-brand-light',
		danger: 'border-transparent bg-error text-white hover:opacity-90',
		ghost: 'border-brand bg-transparent text-brand hover:bg-brand-light'
	};

	const sizes: Record<Size, string> = {
		sm: 'px-sm py-xs text-xs',
		md: 'px-md py-xs text-sm'
	};
</script>

<button
	class="cursor-pointer rounded-sm border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 {variants[
		variant
	]} {sizes[size]} {extra}"
	{...rest}
>
	{@render children()}
</button>
