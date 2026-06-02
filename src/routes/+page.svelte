<script lang="ts">
	import { resolve } from '$app/paths';
	import { deals, getAccount, TODAY } from '$lib/data/mock';
	import {
		yen,
		relativeDays,
		triageLabel,
		triageOrder,
		vitalStatus,
		daysBetween
	} from '$lib/data/utils';
	import VitalMonitor from '$lib/components/VitalMonitor.svelte';

	// KPI
	const open = deals.filter((d) => d.stage !== '受注' && d.stage !== '失注');
	const pipeline = open.reduce((s, d) => s + d.amount, 0);
	const weighted = open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0);
	const criticalCount = deals.filter((d) => d.triage === 'critical').length;

	// トリアージ順に並べた診療待ち（=対応待ち）リスト
	const board = [...deals]
		.filter((d) => d.stage !== '受注' && d.stage !== '失注')
		.sort(
			(a, b) =>
				triageOrder[a.triage] - triageOrder[b.triage] ||
				Date.parse(a.closeDate) - Date.parse(b.closeDate)
		);

	// 異常値アラート（バイタルが alert の項目を抽出）
	const alerts = deals
		.flatMap((d) =>
			d.vitals.filter((v) => vitalStatus(v) === 'alert').map((v) => ({ deal: d, vital: v }))
		)
		.sort((a, b) => triageOrder[a.deal.triage] - triageOrder[b.deal.triage]);
</script>

<div class="page-head">
	<div class="title">
		<h1>ダッシュボード</h1>
		<p>本日 {TODAY}・対応が必要な商談を緊急度順に表示しています（ナースステーション）</p>
	</div>
	<a href={resolve('/deals')} class="btn">商談一覧へ →</a>
</div>

<!-- KPI -->
<div class="kpis">
	<div class="card kpi">
		<div class="klabel">パイプライン総額</div>
		<div class="kval stat-amount">{yen(pipeline)}</div>
		<div class="ksub">進行中 {open.length} 件</div>
	</div>
	<div class="card kpi">
		<div class="klabel">加重見込み額</div>
		<div class="kval stat-amount">{yen(weighted)}</div>
		<div class="ksub">確度で加重した期待値</div>
	</div>
	<div class="card kpi">
		<div class="klabel">要対応（トリアージ赤）</div>
		<div class="kval" style="color:var(--triage-critical)">{criticalCount} 件</div>
		<div class="ksub">即時フォローが必要</div>
	</div>
	<div class="card kpi">
		<div class="klabel">リスクアラート</div>
		<div class="kval" style="color:var(--triage-warning)">{alerts.length} 件</div>
		<div class="ksub">バイタル異常を検知</div>
	</div>
</div>

<div class="grid cols">
	<!-- トリアージボード -->
	<section class="card">
		<div class="card-head">
			<h3>🩺 トリアージボード</h3>
			<span class="muted" style="font-size:12px">緊急度 → 期日順</span>
		</div>
		<div class="card-body" style="padding:0">
			{#each board as d (d.id)}
				{@const acc = getAccount(d.accountId)}
				{@const overdue = d.nextAction && daysBetween(d.nextAction.due) > 0}
				<a href={resolve('/deals/[id]', { id: d.id })} class="brow triage-bar {d.triage}">
					<div class="brow-main">
						<div class="row between">
							<div class="row">
								<span class="badge {d.triage}"
									><span class="dot {d.triage}"></span>{triageLabel[d.triage]}</span
								>
								<strong>{d.title}</strong>
							</div>
							<span class="stat-amount">{yen(d.amount)}</span>
						</div>
						<div class="row wrap meta">
							<span>{acc?.name}</span>
							<span class="badge neutral">{d.stage}</span>
							<span>確度 {d.probability}%</span>
							<span>最終接触 {relativeDays(d.lastContact)}</span>
						</div>
						{#if d.nextAction}
							<div class="next" class:overdue>
								▶ 次アクション: {d.nextAction.label}
								<span class="due">期日 {d.nextAction.due}{overdue ? '（超過）' : ''}</span>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- リスクアラート -->
	<section class="card">
		<div class="card-head">
			<h3>⚠️ リスクアラート</h3>
		</div>
		<div class="card-body" style="display:flex;flex-direction:column;gap:10px">
			{#if alerts.length === 0}
				<p class="muted">異常値はありません。</p>
			{:else}
				{#each alerts as a (a.deal.id + a.vital.key)}
					<a href={resolve('/deals/[id]', { id: a.deal.id })} class="alert">
						<div class="row between">
							<strong>{a.vital.label} 低下</strong>
							<span class="mono" style="color:var(--triage-critical)">{a.vital.value}/100</span>
						</div>
						<div class="aname">{a.deal.title}</div>
						<p class="ahint">{a.vital.hint}</p>
					</a>
				{/each}
			{/if}
		</div>
	</section>
</div>

<!-- 全体バイタル傾向（要対応上位） -->
<section class="card" style="margin-top:16px">
	<div class="card-head"><h3>📈 要対応商談のバイタル</h3></div>
	<div class="card-body" style="display:flex;flex-direction:column;gap:14px">
		{#each board.slice(0, 2) as d (d.id)}
			<div>
				<div class="row between" style="margin-bottom:8px">
					<a href={resolve('/deals/[id]', { id: d.id })} style="font-weight:700">{d.title}</a>
					<span class="badge {d.triage}">{triageLabel[d.triage]}</span>
				</div>
				<VitalMonitor vitals={d.vitals} compact />
			</div>
		{/each}
	</div>
</section>

<style>
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 16px;
	}
	.kpi {
		padding: 16px 18px;
	}
	.klabel {
		font-size: 12px;
		color: var(--ink-2);
		font-weight: 600;
	}
	.kval {
		font-size: 26px;
		font-weight: 800;
		margin: 4px 0 2px;
	}
	.ksub {
		font-size: 11px;
		color: var(--ink-3);
	}
	.cols {
		grid-template-columns: 1.6fr 1fr;
		align-items: start;
	}
	.brow {
		display: block;
		padding: 14px 18px;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}
	.brow:hover {
		background: var(--surface-2);
	}
	.brow:last-child {
		border-bottom: none;
	}
	.brow strong {
		font-size: 14px;
	}
	.meta {
		font-size: 12px;
		color: var(--ink-2);
		margin-top: 6px;
		gap: 12px;
	}
	.next {
		margin-top: 8px;
		font-size: 12px;
		color: var(--primary-strong);
		background: var(--primary-soft);
		padding: 5px 10px;
		border-radius: 6px;
		display: inline-flex;
		gap: 10px;
		align-items: center;
	}
	.next.overdue {
		color: var(--triage-critical);
		background: var(--triage-critical-soft);
	}
	.next .due {
		opacity: 0.85;
		font-size: 11px;
	}
	.alert {
		display: block;
		border: 1px solid var(--triage-critical-soft);
		border-left: 3px solid var(--triage-critical);
		border-radius: var(--radius-sm);
		padding: 10px 12px;
		background: #fff;
		transition: background 0.12s;
	}
	.alert:hover {
		background: var(--triage-critical-soft);
	}
	.aname {
		font-size: 12px;
		color: var(--ink-2);
		margin-top: 2px;
	}
	.ahint {
		font-size: 11px;
		color: var(--ink-3);
		margin: 4px 0 0;
	}
	@media (max-width: 980px) {
		.kpis {
			grid-template-columns: repeat(2, 1fr);
		}
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
