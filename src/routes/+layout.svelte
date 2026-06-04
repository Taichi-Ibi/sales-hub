<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Sales Hub — 営業支援ツール（モックアップ）</title>
</svelte:head>

{@render children()}
