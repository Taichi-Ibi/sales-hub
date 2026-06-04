<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { PEOPLE } from '$lib/seed';
	import { canEditDeal, canSetConfidential, canView } from '$lib/permissions';
	import { statusColor, MAIN_FLOW_PROGRESS } from '$lib/ui';
	import { MAIN_FLOW } from '$lib/types';
	import type { Deal, MainStatus } from '$lib/types';
	import Timeline from './Timeline.svelte';
	import InteractionLog from './InteractionLog.svelte';
	import LegalFlow from './LegalFlow.svelte';
	import ResourceFlow from './ResourceFlow.svelte';

	let { deal, onBack }: { deal: Deal; onBack: () => void } = $props();

	const mayEdit = $derived(canEditDeal(store.role));
	const mayConfidential = $derived(canSetConfidential(store.role));

	const stepIndex = $derived(MAIN_FLOW.indexOf(deal.status as MainStatus));
	const isClosed = $derived(deal.status === '受注' || deal.status === '失注');

	function advance() {
		const next = MAIN_FLOW[stepIndex + 1];
		if (next) store.append(deal.id, 'status_changed', { from: deal.status, to: next });
	}

	// 失注
	let losing = $state(false);
	let lossReason = $state('');
	function confirmLoss() {
		if (!lossReason.trim()) return;
		store.append(deal.id, 'deal_closed', { result: '失注', reason: lossReason.trim() });
		losing = false;
	}

	// 受注 → PMハンドオフ
	function win() {
		store.append(deal.id, 'deal_closed', { result: '受注' });
	}
	function handoff() {
		store.append(deal.id, 'pm_handoff', { to: PEOPLE.PM.name });
	}

	// 機密フラグ
	function toggleConfidential() {
		if (deal.confidential) {
			store.append(deal.id, 'confidential_set', { confidential: false, allowedMembers: [] });
		} else {
			store.append(deal.id, 'confidential_set', {
				confidential: true,
				allowedMembers: [deal.owner, PEOPLE.PM.name, PEOPLE.法務.name]
			});
		}
	}

	const canSeeDeal = $derived(canView(deal, store.user));
</script>

{#if !canSeeDeal}
	<div class="card pad locked">
		<h3>🔒 この案件は機密です</h3>
		<p class="faint">指定されたメンバーのみ閲覧できます。</p>
		<button onclick={onBack}>← 一覧へ戻る</button>
	</div>
{:else}
	<div class="detail">
		<button class="subtle back" onclick={onBack}>← 案件一覧</button>

		<!-- ヘッダー -->
		<div class="card pad head">
			<div class="spread">
				<div>
					<div class="row">
						{#if deal.confidential}<span title="機密案件">🔒</span>{/if}
						<h2>{deal.name}</h2>
						<span class="badge {statusColor(deal.status as MainStatus)}">{deal.status}</span>
						{#if deal.handedOff}<span class="badge green">PM引継済</span>{/if}
					</div>
					<div class="meta faint">
						顧客: {deal.customer} / 担当営業: {deal.owner}
					</div>
				</div>
				{#if mayConfidential}
					<button class="subtle" onclick={toggleConfidential}>
						{deal.confidential ? '機密を解除' : '機密にする'}
					</button>
				{/if}
			</div>

			<!-- メインステータス ステッパー -->
			<div class="stepper">
				{#each MAIN_FLOW as s, i (s)}
					<div
						class="step"
						class:done={MAIN_FLOW_PROGRESS(deal.status, i)}
						class:cur={deal.status === s}
					>
						<span class="ring">{i + 1}</span>
						<span class="lbl">{s}</span>
					</div>
					{#if i < MAIN_FLOW.length - 1}
						<span class="bar" class:done={MAIN_FLOW_PROGRESS(deal.status, i + 1)}></span>
					{/if}
				{/each}
				<span class="bar" class:done={isClosed}></span>
				<div class="step" class:done={isClosed} class:cur={isClosed}>
					<span class="ring">{deal.status === '失注' ? '✕' : '✓'}</span>
					<span class="lbl">{deal.status === '失注' ? '失注' : 'クローズ'}</span>
				</div>
			</div>

			<!-- メイン操作 -->
			{#if mayEdit && !isClosed}
				<div class="actions">
					{#if deal.status !== '提案'}
						<button class="primary" onclick={advance}>
							「{MAIN_FLOW[stepIndex + 1]}」へ進める
						</button>
					{:else}
						<button class="primary" onclick={win}>受注（クローズ）</button>
					{/if}
					<button class="danger" onclick={() => (losing = true)}>失注</button>
				</div>
				{#if losing}
					<div class="loss">
						<label for="dd-loss">失注理由</label>
						<textarea id="dd-loss" bind:value={lossReason} placeholder="価格 / 競合 / 時期 など"
						></textarea>
						<div class="row" style="justify-content:flex-end">
							<button class="subtle" onclick={() => (losing = false)}>キャンセル</button>
							<button class="danger" disabled={!lossReason.trim()} onclick={confirmLoss}>
								失注で確定
							</button>
						</div>
					</div>
				{/if}
			{/if}

			<!-- 受注後のPMハンドオフ -->
			{#if deal.status === '受注' && !deal.handedOff && mayEdit}
				<div class="handoff">
					<div class="faint">受注しました。PMへハンドオフして営業側の進行を完了します。</div>
					<button class="primary" onclick={handoff}>PM（{PEOPLE.PM.name}）へハンドオフ</button>
				</div>
			{/if}
			{#if deal.handedOff}
				<div class="handoff done">
					🤝 PMへハンドオフ済み。受注後のプロジェクト進行は本ツールでは管理しません。
				</div>
			{/if}
			{#if deal.status === '失注' && deal.lossReason}
				<div class="loss-view">失注理由: {deal.lossReason}</div>
			{/if}
		</div>

		<!-- 本体: 2カラム -->
		<div class="grid">
			<div class="col">
				<InteractionLog {deal} />
				<LegalFlow {deal} />
				<ResourceFlow {deal} />
			</div>
			<div class="col">
				<div class="card pad">
					<Timeline dealId={deal.id} />
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.detail {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.back {
		align-self: flex-start;
	}
	.pad {
		padding: 16px;
	}
	.head h2 {
		font-size: 18px;
	}
	.meta {
		margin-top: 4px;
		font-size: 13px;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 18px 0 4px;
		flex-wrap: wrap;
	}
	.step {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.ring {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		background: var(--gray-weak);
		color: var(--text-faint);
		border: 2px solid var(--border-strong);
	}
	.step.done .ring {
		background: var(--green);
		color: #fff;
		border-color: var(--green);
	}
	.step.cur .ring {
		background: var(--accent);
		color: #fff;
		border-color: var(--accent);
	}
	.lbl {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
	}
	.step.cur .lbl {
		color: var(--accent);
	}
	.bar {
		flex: 1;
		min-width: 16px;
		height: 2px;
		background: var(--border-strong);
	}
	.bar.done {
		background: var(--green);
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
	.loss,
	.handoff {
		margin-top: 12px;
		padding: 12px;
		border-radius: 8px;
		background: var(--gray-weak);
	}
	.loss label {
		margin-bottom: 6px;
	}
	.handoff {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		background: var(--green-weak);
	}
	.handoff.done {
		display: block;
		font-size: 13px;
		color: var(--green);
	}
	.loss-view {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: 8px;
		background: var(--red-weak);
		color: var(--red);
		font-size: 13px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		align-items: start;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.locked {
		text-align: center;
		padding: 40px;
	}
	.locked button {
		margin-top: 12px;
	}
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
