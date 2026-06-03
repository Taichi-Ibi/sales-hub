<script lang="ts">
	import { resolve } from '$app/paths';
	import { customers, events, getCustomer, getProject, TODAY } from '$lib/data/mock';
	import {
		activeProjectCount,
		customerRevenue,
		dashboardMetrics,
		daysBetween,
		eventIcon,
		lastContact,
		relativeDays,
		yen
	} from '$lib/data/utils';

	const m = dashboardMetrics();

	// 全社の最新イベントフィード（新しい順）
	const feed = [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

	// 要フォロー顧客：最終接触から日数が空いていて、進行中案件がある顧客
	const followUp = customers
		.map((c) => {
			const last = lastContact(c.id);
			return {
				customer: c,
				last,
				days: last ? daysBetween(last) : 9999,
				active: activeProjectCount(c.id)
			};
		})
		.filter((x) => x.active > 0)
		.sort((a, b) => b.days - a.days)
		.slice(0, 4);

	// LTV上位顧客
	const topCustomers = [...customers]
		.map((c) => ({ customer: c, revenue: customerRevenue(c.id) }))
		.filter((x) => x.revenue > 0)
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 4);
</script>

<div class="page-head">
	<div class="title">
		<h1>ダッシュボード</h1>
		<p>本日 {TODAY}・今期（2026年度）の営業活動サマリ</p>
	</div>
	<a href={resolve('/customers')} class="btn primary">顧客一覧へ →</a>
</div>

<!-- KGI -->
<div class="section-label">KGI（重要目標達成指標）</div>
<div class="kgis">
	<div class="card kgi">
		<div class="klabel">売上（今期受注）</div>
		<div class="kval stat-amount">{yen(m.revenue)}</div>
		<div class="ksub">確定した受注金額の合計</div>
	</div>
	<div class="card kgi">
		<div class="klabel">粗利率（今期）</div>
		<div class="kval">{m.margin}<span class="unit">%</span></div>
		<div class="ksub">受注金額で加重平均</div>
	</div>
</div>

<!-- KPI -->
<div class="section-label">KPI（重要業績評価指標）</div>
<div class="kpis">
	<div class="card kpi">
		<div class="klabel">商談数</div>
		<div class="kval">{m.dealCount}<span class="unit">件</span></div>
		<div class="ksub">今期に動いた案件</div>
	</div>
	<div class="card kpi">
		<div class="klabel">提案数</div>
		<div class="kval">{m.proposalCount}<span class="unit">件</span></div>
		<div class="ksub">提案提出イベント</div>
	</div>
	<div class="card kpi">
		<div class="klabel">受注率</div>
		<div class="kval">{m.winRate}<span class="unit">%</span></div>
		<div class="ksub">今期決着案件の勝率</div>
	</div>
	<div class="card kpi">
		<div class="klabel">平均案件単価</div>
		<div class="kval stat-amount">{yen(m.avgDealSize)}</div>
		<div class="ksub">今期受注の平均金額</div>
	</div>
</div>

<!-- 補助指標 -->
<div class="section-label">補助指標</div>
<div class="subs">
	<div class="card sub">
		<span class="slabel">新規顧客数</span>
		<span class="sval">{m.newCustomers}<span class="unit">社</span></span>
	</div>
	<div class="card sub">
		<span class="slabel">アクティブ顧客数</span>
		<span class="sval">{m.activeCustomers}<span class="unit">社</span></span>
	</div>
	<div class="card sub">
		<span class="slabel">パイプライン金額</span>
		<span class="sval stat-amount">{yen(m.pipeline)}</span>
	</div>
</div>

<div class="grid cols">
	<!-- 全社イベントフィード -->
	<section class="card">
		<div class="card-head">
			<h3>🕒 最新の活動</h3>
			<span class="muted" style="font-size:12px">全顧客のイベント</span>
		</div>
		<div class="card-body" style="padding:0">
			{#each feed as ev (ev.id)}
				{@const c = getCustomer(ev.customerId)}
				{@const proj = ev.projectId ? getProject(ev.projectId) : undefined}
				<a href={resolve('/customers/[id]', { id: ev.customerId })} class="frow">
					<span class="ficon">{eventIcon[ev.type]}</span>
					<div class="fbody">
						<div class="row between">
							<strong>{c?.name}</strong>
							<span class="muted small">{relativeDays(ev.date)}</span>
						</div>
						<div class="small">
							<span class="badge {ev.category === 'project' ? 'primary' : 'neutral'}"
								>{ev.type}</span
							>
							{#if proj}<span class="muted">{proj.name}</span>{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<div class="side">
		<!-- 要フォロー顧客 -->
		<section class="card">
			<div class="card-head"><h3>📌 要フォロー顧客</h3></div>
			<div class="card-body" style="padding:0">
				{#each followUp as f (f.customer.id)}
					{@const stale = f.days >= 14}
					<a href={resolve('/customers/[id]', { id: f.customer.id })} class="frow">
						<span class="rank {f.customer.rank.toLowerCase()}">{f.customer.rank}</span>
						<div class="fbody">
							<div class="row between">
								<strong>{f.customer.name}</strong>
								<span class="badge {stale ? 'bad' : 'neutral'}">最終接触 {f.days}日前</span>
							</div>
							<div class="muted small">進行中案件 {f.active}件</div>
						</div>
					</a>
				{/each}
			</div>
		</section>

		<!-- LTV上位 -->
		<section class="card">
			<div class="card-head"><h3>💎 売上累計 上位顧客</h3></div>
			<div class="card-body" style="padding:0">
				{#each topCustomers as t (t.customer.id)}
					<a href={resolve('/customers/[id]', { id: t.customer.id })} class="frow">
						<span class="rank {t.customer.rank.toLowerCase()}">{t.customer.rank}</span>
						<div class="fbody">
							<div class="row between">
								<strong>{t.customer.name}</strong>
								<span class="stat-amount">{yen(t.revenue)}</span>
							</div>
							<div class="muted small">{t.customer.industry}</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.section-label {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--ink-3);
		margin: 18px 0 10px;
	}
	.section-label:first-of-type {
		margin-top: 0;
	}
	.kgis {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
	.kpis {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}
	.kgi,
	.kpi {
		padding: 16px 18px;
	}
	.kgi {
		background: linear-gradient(180deg, var(--primary-soft), #fff);
		border-color: #d8defc;
	}
	.klabel {
		font-size: 12px;
		color: var(--ink-2);
		font-weight: 600;
	}
	.kval {
		font-size: 28px;
		font-weight: 800;
		margin: 4px 0 2px;
		color: var(--ink);
	}
	.kgi .kval {
		color: var(--primary-strong);
	}
	.unit {
		font-size: 14px;
		font-weight: 700;
		margin-left: 2px;
		color: var(--ink-2);
	}
	.ksub {
		font-size: 11px;
		color: var(--ink-3);
	}
	.subs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.sub {
		padding: 14px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.slabel {
		font-size: 13px;
		color: var(--ink-2);
		font-weight: 600;
	}
	.sval {
		font-size: 20px;
		font-weight: 800;
	}
	.cols {
		grid-template-columns: 1.4fr 1fr;
		align-items: start;
		margin-top: 20px;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.frow {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 12px 18px;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}
	.frow:last-child {
		border-bottom: none;
	}
	.frow:hover {
		background: var(--surface-2);
	}
	.ficon {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		display: grid;
		place-items: center;
		font-size: 15px;
		flex-shrink: 0;
	}
	.fbody {
		flex: 1;
		min-width: 0;
	}
	.fbody strong {
		font-size: 13px;
	}
	.small {
		font-size: 11px;
		margin-top: 2px;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	@media (max-width: 980px) {
		.kpis {
			grid-template-columns: repeat(2, 1fr);
		}
		.subs {
			grid-template-columns: 1fr;
		}
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
