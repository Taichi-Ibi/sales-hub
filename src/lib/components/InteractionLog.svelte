<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { canEditBriefing, canLogInteraction } from '$lib/permissions';
	import { formatDateTime } from '$lib/ui';
	import type { Deal } from '$lib/types';

	let { deal }: { deal: Deal } = $props();

	const mayBrief = $derived(canEditBriefing(store.role));
	const mayLog = $derived(canLogInteraction(store.role));

	// 申し送り（構造化）の編集
	let editingBrief = $state(false);
	let special = $state<'unknown' | 'yes' | 'no'>('unknown');
	let briefing = $state('');

	function startBrief() {
		special = deal.hasSpecialTerms === null ? 'unknown' : deal.hasSpecialTerms ? 'yes' : 'no';
		briefing = deal.briefing;
		editingBrief = true;
	}
	function saveBrief() {
		if (special === 'unknown') return;
		store.append(deal.id, 'briefing_updated', {
			hasSpecialTerms: special === 'yes',
			briefing: briefing.trim()
		});
		editingBrief = false;
	}

	// やり取りの追記
	let channel = $state('電話');
	let summary = $state('');
	function addInteraction() {
		if (!summary.trim()) return;
		store.append(deal.id, 'interaction_logged', { channel, summary: summary.trim() });
		summary = '';
	}
</script>

<section class="card pad">
	<h4>やり取り履歴・特殊事情</h4>

	<!-- 構造化された申し送り。法務依頼のゲートに直結する（第4.3 / 4.4） -->
	<div class="brief">
		<div class="spread">
			<strong class="sub">申し送り（構造化）</strong>
			{#if mayBrief && !editingBrief}
				<button class="subtle" onclick={startBrief}>編集</button>
			{/if}
		</div>

		{#if editingBrief}
			<div class="field">
				<label for="il-special">特殊条項の有無（必須）</label>
				<select id="il-special" bind:value={special}>
					<option value="unknown" disabled>選択してください</option>
					<option value="yes">あり</option>
					<option value="no">なし</option>
				</select>
			</div>
			<div class="field">
				<label for="il-brief">申し送り事項</label>
				<textarea
					id="il-brief"
					bind:value={briefing}
					placeholder="職能をまたぐ引き継ぎで伝えるべき特記事項（特殊条項の内容など）"
				></textarea>
			</div>
			<div class="row" style="justify-content:flex-end">
				<button class="subtle" onclick={() => (editingBrief = false)}>キャンセル</button>
				<button class="primary" disabled={special === 'unknown'} onclick={saveBrief}>保存</button>
			</div>
		{:else}
			<div class="brief-view">
				<div class="row">
					<span class="label-inline">特殊条項:</span>
					{#if deal.hasSpecialTerms === null}
						<span class="badge gray">未入力</span>
					{:else if deal.hasSpecialTerms}
						<span class="badge red">あり</span>
					{:else}
						<span class="badge green">なし</span>
					{/if}
				</div>
				<div class="brief-text">
					{deal.briefing || '（申し送り未記入）'}
				</div>
			</div>
		{/if}
	</div>

	<!-- やり取りの記録 -->
	<div class="log">
		<strong class="sub">記録</strong>
		{#if mayLog}
			<div class="add">
				<select bind:value={channel} aria-label="チャネル" style="width:auto">
					<option>電話</option>
					<option>議事録</option>
					<option>メール</option>
					<option>訪問</option>
					<option>メモ</option>
				</select>
				<input bind:value={summary} placeholder="やり取りの要点を記録（軽量入力）" />
				<button class="primary" disabled={!summary.trim()} onclick={addInteraction}>追加</button>
			</div>
		{/if}
		<ul class="items">
			{#each [...deal.interactions].reverse() as it (it.at + it.summary)}
				<li>
					<div class="line">
						<span class="badge blue">{it.channel}</span>
						<span class="faint">{it.by}</span>
						<span class="faint mono when">{formatDateTime(it.at)}</span>
					</div>
					<div class="txt">{it.summary}</div>
				</li>
			{:else}
				<li class="faint empty">記録はまだありません。</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.pad {
		padding: 16px;
	}
	.sub {
		font-size: 13px;
	}
	h4 {
		margin-bottom: 12px;
	}
	.brief {
		background: var(--gray-weak);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 16px;
	}
	.field {
		margin: 8px 0;
	}
	.brief-view {
		margin-top: 8px;
	}
	.label-inline {
		font-size: 12px;
		color: var(--text-muted);
	}
	.brief-text {
		margin-top: 6px;
		font-size: 13px;
		white-space: pre-wrap;
	}
	.add {
		display: flex;
		gap: 8px;
		margin: 8px 0 12px;
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.items li {
		border-left: 2px solid var(--border);
		padding-left: 10px;
	}
	.line {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.when {
		margin-left: auto;
		font-size: 11px;
	}
	.txt {
		font-size: 13px;
		margin-top: 3px;
	}
	.empty {
		border: none;
		padding: 8px 0;
		font-size: 12px;
	}
</style>
