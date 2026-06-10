<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import {
		eventLogs,
		tasks,
		settings,
		storageStatus,
		initializeFromStorage,
		clearAllData,
		purgeDeletedEventLogs
	} from '$lib/intelligence/store.svelte.js';
	import { computeUnreadCount, computePendingTaskCount } from '$lib/intelligence/store-logic.js';

	const unreadCount = $derived(computeUnreadCount(eventLogs));
	const pendingTaskCount = $derived(computePendingTaskCount(tasks));
	const deletedLogCount = $derived(eventLogs.filter((l) => l.isDeleted).length);

	let { children } = $props();

	onMount(() => initializeFromStorage());

	function handleClearAll() {
		if (confirm('全てのデータを削除して初期状態に戻します。よろしいですか？')) {
			clearAllData();
		}
	}

	function handlePurgeDeleted() {
		const n = purgeDeletedEventLogs();
		if (n > 0) {
			alert(`${n}件の削除済みデータを完全に消去しました。`);
		} else {
			alert('削除候補のデータはありません。');
		}
	}
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
		<div class="sidebar-footer">
			<button class="data-action" onclick={handleClearAll}>全データをクリア</button>
		</div>
	</nav>
	<main class="main-content">
		{#if storageStatus.warning === 'unavailable'}
			<div class="storage-banner warning" role="alert">
				⚠️ localStorage
				が利用できないため、データはこのセッション中のみメモリ上で保持されます（再読み込みで失われます）。
			</div>
		{:else if storageStatus.warning === 'quota'}
			<div class="storage-banner warning" role="alert">
				<span>
					⚠️ 保存容量が上限に達しました。一部の変更が保存されていません。
					{#if deletedLogCount > 0}
						削除済みデータ（{deletedLogCount}件）を消去すると容量を確保できます。
					{/if}
				</span>
				{#if deletedLogCount > 0}
					<button class="banner-action" onclick={handlePurgeDeleted}>削除済みデータを消去</button>
				{/if}
			</div>
		{/if}
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

	.sidebar-footer {
		margin-top: auto;
		padding: var(--space-md);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.data-action {
		width: 100%;
		font-size: var(--font-size-xs);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		color: rgba(255, 255, 255, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.data-action:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.main-content {
		flex: 1;
		overflow: auto;
		padding: var(--space-lg);
	}

	.storage-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-md);
	}

	.storage-banner.warning {
		background: #fff4e5;
		color: #8a5a00;
		border: 1px solid #ffd591;
	}

	.banner-action {
		flex-shrink: 0;
		font-size: var(--font-size-xs);
		padding: var(--space-xs) var(--space-sm);
		background: #8a5a00;
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
</style>
