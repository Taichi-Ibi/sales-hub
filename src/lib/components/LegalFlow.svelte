<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { canRequestLegal, canResolveLegal } from '$lib/permissions';
	import { legalColor, formatDateTime } from '$lib/ui';
	import type { Deal } from '$lib/types';

	let { deal }: { deal: Deal } = $props();

	const mayRequest = $derived(canRequestLegal(store.role));
	const mayResolve = $derived(canResolveLegal(store.role));

	// ゲート化（第4.4）: 「特殊条項の有無 / 申し送り事項」が未入力なら依頼を発行できない。
	const gateOpen = $derived(deal.hasSpecialTerms !== null && deal.briefing.trim().length > 0);

	let requesting = $state(false);
	let note = $state('');
	function startRequest() {
		// 申し送りを依頼ノートの初期値に引き継ぐ
		note = deal.briefing;
		requesting = true;
	}
	function submitRequest() {
		if (!gateOpen || !note.trim()) return;
		store.append(deal.id, 'legal_requested', { note: note.trim() });
		requesting = false;
		note = '';
	}

	let resolving = $state<null | '承認' | '差し戻し'>(null);
	let comment = $state('');
	function submitResolve() {
		if (!resolving) return;
		store.append(deal.id, 'legal_resolved', { result: resolving, comment: comment.trim() });
		resolving = null;
		comment = '';
	}
</script>

<section class="card pad">
	<div class="spread">
		<h4>法務サブフロー</h4>
		<span class="badge {legalColor(deal.legal.status)}">{deal.legal.status}</span>
	</div>
	<p class="faint hint">依頼 → 完了（承認 / 差し戻し）。メインフローと並行・独立。</p>

	{#if deal.legal.status === '未依頼' || deal.legal.status === '差し戻し'}
		<!-- ゲート: 申し送り未入力なら依頼不可 -->
		{#if !gateOpen}
			<div class="gate">
				🔒 <strong>申し送りが未入力のため依頼できません。</strong>
				<div class="faint">
					「やり取り履歴・特殊事情」で<b>特殊条項の有無</b>と<b>申し送り事項</b
					>を入力すると、法務レビューを依頼できます（申し送り漏れの構造的防止）。
				</div>
			</div>
		{/if}

		{#if mayRequest}
			{#if requesting}
				<div class="field">
					<label for="lf-note">申し送り事項（依頼に必須）</label>
					<textarea id="lf-note" bind:value={note}></textarea>
				</div>
				<div class="row" style="justify-content:flex-end">
					<button class="subtle" onclick={() => (requesting = false)}>キャンセル</button>
					<button class="primary" disabled={!note.trim()} onclick={submitRequest}>依頼を発行</button
					>
				</div>
			{:else}
				<button class="primary" disabled={!gateOpen} onclick={startRequest}>
					{deal.legal.status === '差し戻し' ? '再依頼する' : '法務レビューを依頼'}
				</button>
			{/if}
		{:else}
			<p class="faint role-note">法務レビュー依頼は 営業 / PM が発行します。</p>
		{/if}
	{/if}

	{#if deal.legal.requestNote && deal.legal.status !== '未依頼'}
		<div class="box">
			<div class="box-label">依頼時の申し送り</div>
			<div class="box-text">{deal.legal.requestNote}</div>
		</div>
	{/if}

	{#if deal.legal.status === '依頼中'}
		{#if mayResolve}
			{#if resolving}
				<div class="field">
					<label for="lf-comment">{resolving} コメント</label>
					<textarea id="lf-comment" bind:value={comment} placeholder="判断理由・条件など"
					></textarea>
				</div>
				<div class="row" style="justify-content:flex-end">
					<button class="subtle" onclick={() => (resolving = null)}>キャンセル</button>
					<button class="primary" onclick={submitResolve}>{resolving}を確定</button>
				</div>
			{:else}
				<div class="row">
					<button class="primary" onclick={() => (resolving = '承認')}>承認</button>
					<button class="danger" onclick={() => (resolving = '差し戻し')}>差し戻し</button>
				</div>
			{/if}
		{:else}
			<p class="faint role-note">法務の判断待ち（完了 / 差し戻しは法務のみ）。</p>
		{/if}
	{/if}

	{#if deal.legal.resolution}
		<div class="box" class:approved={deal.legal.resolution.result === '承認'}>
			<div class="box-label">
				{deal.legal.resolution.result}・{deal.legal.resolution.by}・{formatDateTime(
					deal.legal.resolution.at
				)}
			</div>
			<div class="box-text">{deal.legal.resolution.comment}</div>
		</div>
	{/if}
</section>

<style>
	.pad {
		padding: 16px;
	}
	.hint {
		font-size: 12px;
		margin: 4px 0 12px;
	}
	.gate {
		background: var(--amber-weak);
		border: 1px solid #f0d9a8;
		color: var(--amber);
		border-radius: 8px;
		padding: 12px;
		font-size: 13px;
		margin-bottom: 12px;
		line-height: 1.5;
	}
	.gate .faint {
		color: #9a6a12;
		margin-top: 4px;
	}
	.field {
		margin: 8px 0;
	}
	.role-note {
		font-size: 12px;
		margin: 4px 0 0;
	}
	.box {
		background: var(--gray-weak);
		border-radius: 8px;
		padding: 10px 12px;
		margin-top: 12px;
	}
	.box.approved {
		background: var(--green-weak);
	}
	.box-label {
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 600;
		margin-bottom: 4px;
	}
	.box-text {
		font-size: 13px;
		white-space: pre-wrap;
	}
</style>
