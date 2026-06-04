<script lang="ts">
	import { store } from '$lib/store.svelte';
	import Header from '$lib/components/Header.svelte';
	import DealList from '$lib/components/DealList.svelte';
	import DealDetail from '$lib/components/DealDetail.svelte';
	import NotificationPanel from '$lib/components/NotificationPanel.svelte';
	import NewDealModal from '$lib/components/NewDealModal.svelte';

	// 単一ページSPA: 選択中の案件IDでビューを切り替える
	let selectedId = $state<string | null>(null);
	let showNotifications = $state(false);
	let showNewDeal = $state(false);

	const selectedDeal = $derived(
		selectedId ? (store.deals.find((d) => d.id === selectedId) ?? null) : null
	);

	function openDeal(id: string) {
		selectedId = id;
		showNotifications = false;
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
			selectedId = null;
		}
	}
</script>

<Header
	unread={store.notifications.length}
	onToggleNotifications={() => (showNotifications = !showNotifications)}
/>

<main>
	{#if selectedDeal}
		<DealDetail deal={selectedDeal} onBack={() => (selectedId = null)} />
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
</style>
