<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import {
		eventLogs,
		tasks,
		settings,
		initializeFromStorage
	} from '$lib/intelligence/store.svelte.js';
	import { computeUnreadCount, computePendingTaskCount } from '$lib/intelligence/store-logic.js';

	const unreadCount = $derived(computeUnreadCount(eventLogs));
	const pendingTaskCount = $derived(computePendingTaskCount(tasks));

	let { children } = $props();

	onMount(() => initializeFromStorage());
</script>

<div class="app-layout">
	<nav class="sidebar">
		<div class="sidebar-logo">
			<span class="logo-text">Sales Brain</span>
		</div>
		<ul class="nav-list">
			<li>
				<a
					href={resolve('/intelligence')}
					class="nav-link"
					aria-current={$page.url.pathname === '/intelligence' ? 'page' : undefined}
				>
					<span class="nav-icon">📊</span>
					<span class="nav-label">ダッシュボード</span>
				</a>
			</li>
			<li>
				<a
					href={resolve('/intelligence/inbox')}
					class="nav-link"
					aria-current={$page.url.pathname.startsWith('/intelligence/inbox') ? 'page' : undefined}
				>
					<span class="nav-icon">📥</span>
					<span class="nav-label">インボックス</span>
					{#if unreadCount > 0}
						<span class="badge">{unreadCount}</span>
					{/if}
				</a>
			</li>
			<li>
				<a
					href={resolve('/intelligence/tasks')}
					class="nav-link"
					aria-current={$page.url.pathname.startsWith('/intelligence/tasks') ? 'page' : undefined}
				>
					<span class="nav-icon">✅</span>
					<span class="nav-label">タスク</span>
					{#if pendingTaskCount > 0}
						<span class="badge">{pendingTaskCount}</span>
					{/if}
				</a>
			</li>
			<li>
				<a
					href={resolve('/intelligence/deals')}
					class="nav-link"
					aria-current={$page.url.pathname.startsWith('/intelligence/deals') ? 'page' : undefined}
				>
					<span class="nav-icon">💼</span>
					<span class="nav-label">案件</span>
				</a>
			</li>
			{#if settings.isAdmin}
				<li>
					<a
						href={resolve('/intelligence/admin')}
						class="nav-link"
						aria-current={$page.url.pathname.startsWith('/intelligence/admin') ? 'page' : undefined}
					>
						<span class="nav-icon">⚙️</span>
						<span class="nav-label">Admin Panel</span>
					</a>
				</li>
			{/if}
		</ul>
	</nav>
	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 200px;
		background: var(--color-brand-dark);
		color: white;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
	}

	.sidebar-logo {
		padding: var(--space-lg) var(--space-md);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.logo-text {
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: white;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: var(--space-sm) 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		color: rgba(255, 255, 255, 0.8);
		text-decoration: none;
		font-size: var(--font-size-md);
		border-left: 3px solid transparent;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.nav-link:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.nav-link[aria-current='page'] {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-left-color: var(--color-brand);
	}

	.nav-icon {
		font-size: 16px;
		width: 20px;
		text-align: center;
		flex-shrink: 0;
	}

	.nav-label {
		flex: 1;
	}

	.badge {
		background: var(--color-accent);
		color: var(--color-brand-dark);
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.main-content {
		flex: 1;
		overflow: auto;
		padding: var(--space-lg);
	}
</style>
