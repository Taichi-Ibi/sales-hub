<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Sales Hub — 顧客中心CRM</title>
</svelte:head>

<div class="app">
	<Sidebar />
	<main class="main">
		{@render children()}
	</main>
</div>
