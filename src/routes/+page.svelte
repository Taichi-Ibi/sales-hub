<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { store } from '$lib/store.svelte';
	import Header from '$lib/components/Header.svelte';
	import DealList from '$lib/components/DealList.svelte';
	import DealDetail from '$lib/components/DealDetail.svelte';
	import NotificationPanel from '$lib/components/NotificationPanel.svelte';
	import NewDealModal from '$lib/components/NewDealModal.svelte';

	// 単一ページSPA: 選択中の案件IDはURL（?deal=...）に持たせる。
	// こうすることで、ブラウザの戻る/進む・リロード・URL共有でも案件詳細へ
	// 遷移できる（状態をコンポーネント内に閉じ込めるSPAの弊害を回避）。
	let showNotifications = $state(false);
	let showNewDeal = $state(false);

	// 静的プリレンダリング時はクエリを参照できない（HTMLはクエリ非依存）。
	// 一覧をプリレンダリングし、案件の選択はブラウザ側でURLから解決する。
	const selectedId = $derived(browser ? page.url.searchParams.get('deal') : null);
	const selectedDeal = $derived(
		selectedId ? (store.deals.find((d) => d.id === selectedId) ?? null) : null
	);

	function openDeal(id: string) {
		showNotifications = false;
		// ベースパスは resolve('/') で付与済み。クエリ文字列は resolve() の対象外なので連結する。
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('/')}?deal=${encodeURIComponent(id)}`, { keepFocus: true, noScroll: true });
	}
	function backToList() {
		goto(resolve('/'), { keepFocus: true, noScroll: true });
	}
	function onCreated(id: string) {
		showNewDeal = false;
		openDeal(id);
	}
	function resetData() {
		if (
			confirm('サンプルデータで初期化します（CSV初回インポートの模擬）。現在のデータは消えます。')
		) {
			store.reset();
			backToList();
		}
	}
</script>

<Header
	unread={store.notifications.length}
	onToggleNotifications={() => (showNotifications = !showNotifications)}
/>

<main>
	{#if selectedDeal}
		<DealDetail deal={selectedDeal} onBack={backToList} />
	{:else}
		<div class="toolbar">
			<div>
				<h1>案件一覧</h1>
				<p class="faint sub">
					案件＝チケットを職能横断でリレーする軽量ワークフロー。メインフロー（リード〜クローズ）と、法務・リソースのサブフローが並行します。
				</p>
			</div>
			<div class="row">
				<button class="subtle" onclick={resetData} title="案件マスタCSVの初回インポートを模擬">
					⟳ サンプル初期化
				</button>
				<button class="primary" onclick={() => (showNewDeal = true)}>＋ 新規案件</button>
			</div>
		</div>
		<DealList onOpenDeal={openDeal} />
	{/if}
</main>

<NotificationPanel
	open={showNotifications}
	onClose={() => (showNotifications = false)}
	onOpenDeal={openDeal}
/>

{#if showNewDeal}
	<NewDealModal onClose={() => (showNewDeal = false)} {onCreated} />
{/if}

<style>
	main {
		max-width: 1280px;
		margin: 0 auto;
		padding: 20px;
	}
	.toolbar {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 16px;
	}
	h1 {
		font-size: 20px;
	}
	.sub {
		font-size: 13px;
		margin: 4px 0 0;
		max-width: 720px;
	}
	@media (max-width: 640px) {
		main {
			padding: 14px;
		}
		.toolbar {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}
		/* 操作ボタンは横いっぱいに広げて押しやすく */
		.toolbar .row {
			justify-content: flex-end;
		}
	}
</style>
