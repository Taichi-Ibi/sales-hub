<script lang="ts">
	import { onMount } from 'svelte';
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
	import Nav, { type NavItem } from '$lib/ui/Nav.svelte';

	const unreadCount = $derived(computeUnreadCount(eventLogs));
	const pendingTaskCount = $derived(computePendingTaskCount(tasks));
	const deletedLogCount = $derived(eventLogs.filter((l) => l.isDeleted).length);

	const navItems = $derived<NavItem[]>([
		{
			href: resolve('/intelligence'),
			label: 'ダッシュボード',
			icon: '📊',
			match: (p) => p === '/intelligence'
		},
		{
			href: resolve('/intelligence/inbox'),
			label: 'インボックス',
			icon: '📥',
			match: (p) => p.startsWith('/intelligence/inbox'),
			badge: unreadCount
		},
		{
			href: resolve('/intelligence/tasks'),
			label: 'タスク',
			icon: '✅',
			match: (p) => p.startsWith('/intelligence/tasks'),
			badge: pendingTaskCount
		},
		{
			href: resolve('/intelligence/deals'),
			label: '案件',
			icon: '💼',
			match: (p) => p.startsWith('/intelligence/deals')
		},
		...(settings.isAdmin
			? [
					{
						href: resolve('/intelligence/admin'),
						label: 'Admin',
						icon: '⚙️',
						match: (p: string) => p.startsWith('/intelligence/admin')
					}
				]
			: [])
	]);

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

<div class="flex min-h-screen">
	<!-- Desktop sidebar (md+) -->
	<nav
		class="bg-brand-dark hidden w-[200px] flex-shrink-0 flex-col text-white md:flex"
		aria-label="メインナビゲーション"
	>
		<div class="px-md py-md flex items-center gap-2 border-b border-white/10">
			<span
				class="bg-accent text-brand-dark flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
				>S</span
			>
			<div class="flex flex-col leading-tight">
				<span class="text-md font-bold text-white">Sales Brain</span>
				<span class="text-[10px] text-white/50">営業インテリジェンス</span>
			</div>
		</div>
		<div class="px-md pt-md pb-1 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
			メニュー
		</div>
		<Nav items={navItems} variant="sidebar" />
		<div class="p-md mt-auto border-t border-white/10">
			<button
				class="px-sm py-xs w-full cursor-pointer rounded-sm border border-white/20 bg-transparent text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
				onclick={handleClearAll}
			>
				全データをクリア
			</button>
		</div>
	</nav>

	<main class="p-lg md:pb-lg flex-1 overflow-auto pb-[calc(64px+env(safe-area-inset-bottom))]">
		{#if storageStatus.warning === 'unavailable'}
			<div
				class="mb-md gap-md px-md py-sm flex items-center justify-between rounded-sm border border-[#ffd591] bg-[#fff4e5] text-sm text-[#8a5a00]"
				role="alert"
			>
				⚠️ localStorage
				が利用できないため、データはこのセッション中のみメモリ上で保持されます（再読み込みで失われます）。
			</div>
		{:else if storageStatus.warning === 'quota'}
			<div
				class="mb-md gap-md px-md py-sm flex items-center justify-between rounded-sm border border-[#ffd591] bg-[#fff4e5] text-sm text-[#8a5a00]"
				role="alert"
			>
				<span>
					⚠️ 保存容量が上限に達しました。一部の変更が保存されていません。
					{#if deletedLogCount > 0}
						削除済みデータ（{deletedLogCount}件）を消去すると容量を確保できます。
					{/if}
				</span>
				{#if deletedLogCount > 0}
					<button
						class="px-sm py-xs flex-shrink-0 cursor-pointer rounded-sm border-none bg-[#8a5a00] text-xs text-white"
						onclick={handlePurgeDeleted}
					>
						削除済みデータを消去
					</button>
				{/if}
			</div>
		{/if}
		{@render children()}
	</main>

	<!-- Mobile bottom tab bar (< md) -->
	<nav
		class="bg-brand-dark fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden"
		aria-label="メインナビゲーション"
	>
		<Nav items={navItems} variant="tabbar" />
	</nav>
</div>
