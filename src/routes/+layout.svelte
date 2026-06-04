<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Sales Hub</title>
</svelte:head>

<div class="app-layout">
	<Sidebar />
	<main class="main-content">
		{@render children()}
	</main>
</div>
