<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { deals, getCompany } from '$lib/data/mock';
	import type { DealStage } from '$lib/data/types';
	import { PIPELINE_STAGES } from '$lib/data/types';
	import { formatCurrency, formatDate, relativeDate, stageColor, stageLabel } from '$lib/data/utils';

	let view = $state<'board' | 'list'>('board');

	const pipelineDeals = $derived(
		PIPELINE_STAGES.map((stage) => ({
			stage,
			deals: deals.filter((d) => d.stage === stage),
			total: deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.value, 0)
		}))
	);

	const allDeals = $derived(
		deals
			.map((d) => ({ deal: d, company: getCompany(d.companyId) }))
			.sort((a, b) => b.deal.value - a.deal.value)
	);

	function stageBadgeClass(stage: DealStage): string {
		if (stage === 'Closed Won') return 'success';
		if (stage === 'Closed Lost') return 'neutral';
		return 'accent';
	}
</script>

<div class="page-header">
	<div class="page-header-row">
		<div>
			<h1>案件</h1>
			<p>全ステージの{deals.length}件</p>
		</div>
		<div class="view-toggle">
			<button
				class="btn sm"
				class:active={view === 'board'}
				onclick={() => (view = 'board')}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
				ボード
			</button>
			<button
				class="btn sm"
				class:active={view === 'list'}
				onclick={() => (view = 'list')}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
				リスト
			</button>
		</div>
	</div>
</div>

{#if view === 'board'}
	<div class="kanban">
		{#each pipelineDeals as col (col.stage)}
			<div class="kanban-column">
				<div class="kanban-column-header">
					<div style="display:flex;align-items:center">
						<span class="column-dot" style="background:{stageColor[col.stage]}"></span>
						{stageLabel[col.stage]}
					</div>
					<span class="column-count">{col.deals.length} · {formatCurrency(col.total)}</span>
				</div>
				<div class="kanban-cards">
					{#each col.deals as deal (deal.id)}
						{@const company = getCompany(deal.companyId)}
						<a href={resolve('/deals/[id]', { id: deal.id })} class="kanban-card">
							<div class="kanban-card-title">{deal.name}</div>
							<div class="kanban-card-company">{company?.name ?? ''}</div>
							<div class="kanban-card-footer">
								<span class="kanban-card-amount">{formatCurrency(deal.value)}</span>
								<span class="kanban-card-date">{relativeDate(deal.createdAt)}</span>
							</div>
						</a>
					{/each}
					{#if col.deals.length === 0}
						<div class="kanban-empty">案件なし</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="card">
		<table class="data-table">
			<thead>
				<tr>
					<th>案件名</th>
					<th>企業</th>
					<th>ステージ</th>
					<th class="num">金額</th>
					<th class="num">確度</th>
					<th>クローズ予定日</th>
				</tr>
			</thead>
			<tbody>
				{#each allDeals as r (r.deal.id)}
					<tr onclick={() => goto(resolve('/deals/[id]', { id: r.deal.id }))}>
						<td>
							<a href={resolve('/deals/[id]', { id: r.deal.id })} class="record-name">{r.deal.name}</a>
						</td>
						<td class="text-secondary">{r.company?.name ?? ''}</td>
						<td>
							<span class="badge {stageBadgeClass(r.deal.stage)}">
								<span class="stage-dot" style="background:{stageColor[r.deal.stage]};width:6px;height:6px"></span>
								{stageLabel[r.deal.stage]}
							</span>
						</td>
						<td class="num" style="font-weight:600">{formatCurrency(r.deal.value)}</td>
						<td class="num text-secondary">{r.deal.probability}%</td>
						<td class="text-secondary">{formatDate(r.deal.expectedCloseDate)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.view-toggle {
		display: flex;
		gap: 4px;
		background: var(--surface-active);
		padding: 3px;
		border-radius: var(--radius);
	}
	.view-toggle .btn {
		border: none;
		background: transparent;
		color: var(--text-tertiary);
	}
	.view-toggle .btn.active {
		background: var(--surface);
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
	}
	.kanban-empty {
		text-align: center;
		padding: 24px;
		font-size: 13px;
		color: var(--text-tertiary);
	}
</style>
