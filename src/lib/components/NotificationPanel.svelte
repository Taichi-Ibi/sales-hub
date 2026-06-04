<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { formatDateTime } from '$lib/ui';

	let {
		open,
		onClose,
		onOpenDeal
	}: {
		open: boolean;
		onClose: () => void;
		onOpenDeal: (id: string) => void;
	} = $props();
</script>

{#if open}
	<button class="scrim" aria-label="閉じる" onclick={onClose}></button>
	<aside class="panel card">
		<div class="head spread">
			<div class="row">
				<strong>Slack 通知</strong>
				<span class="badge gray">モック</span>
			</div>
			<button class="subtle" onclick={onClose}>✕</button>
		</div>
		<p class="note faint">
			「書く場所を増やさず、既に全員がいるSlackに届ける」方針の模擬。法務依頼/完了・リソース登録/対応・PMハンドオフで通知が流れます。
		</p>
		<div class="list">
			{#each store.notifications as n (n.id)}
				<button class="item" onclick={() => onOpenDeal(n.dealId)}>
					<div class="spread">
						<span class="ch">{n.channel}</span>
						<span class="faint mono">{formatDateTime(n.at)}</span>
					</div>
					<div class="text">{n.text}</div>
				</button>
			{:else}
				<div class="empty faint">通知はまだありません。</div>
			{/each}
		</div>
	</aside>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(20, 25, 40, 0.25);
		border: none;
		z-index: 30;
		cursor: default;
	}
	.panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 380px;
		max-width: 90vw;
		z-index: 31;
		border-radius: 0;
		display: flex;
		flex-direction: column;
		padding: 16px;
		overflow-y: auto;
	}
	.note {
		font-size: 12px;
		margin: 8px 0 12px;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.item {
		text-align: left;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 10px 12px;
		background: var(--surface);
		width: 100%;
	}
	.item:hover {
		background: var(--gray-weak);
	}
	.ch {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
	}
	.text {
		font-size: 13px;
		margin-top: 4px;
		line-height: 1.5;
	}
	.empty {
		padding: 24px;
		text-align: center;
	}
</style>
