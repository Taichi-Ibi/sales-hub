<script lang="ts">
	import { resolve } from '$app/paths';
	import { activities, deals, getCompany, getDeal, getUser, TODAY } from '$lib/data/mock';
	import { PIPELINE_STAGES } from '$lib/data/types';
	import {
		activityTypeLabel,
		formatCurrency,
		formatDate,
		getDashboardMetrics,
		relativeDate,
		stageColor
	} from '$lib/data/utils';

	const m = getDashboardMetrics();

	const recentActivity = [...activities]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 8);

	const pipelineStages = PIPELINE_STAGES.map((stage) => ({
		stage,
		count: deals.filter((d) => d.stage === stage).length
	}));

	const activityIcons: Record<string, string> = {
		note: '✎',
		email: '✉',
		call: '☎',
		meeting: '◉',
		stage_change: '→',
		task: '☐'
	};
</script>

<div class="page-header">
	<div class="page-header-row">
		<div>
			<h1>Home</h1>
			<p>{formatDate(TODAY)} — Sales pipeline overview</p>
		</div>
	</div>
</div>

<div class="metrics-grid">
	<div class="metric-card">
		<div class="metric-label">Total Revenue</div>
		<div class="metric-value">{formatCurrency(m.totalRevenue)}</div>
		<div class="metric-sub">{m.dealsWon} deals closed</div>
	</div>
	<div class="metric-card">
		<div class="metric-label">Open Pipeline</div>
		<div class="metric-value">{formatCurrency(m.openPipeline)}</div>
		<div class="metric-sub">4 active deals</div>
	</div>
	<div class="metric-card">
		<div class="metric-label">Win Rate</div>
		<div class="metric-value">{m.winRate}%</div>
		<div class="metric-sub">{m.dealsWon}W / {m.dealsLost}L</div>
	</div>
	<div class="metric-card">
		<div class="metric-label">Avg Deal Size</div>
		<div class="metric-value">{formatCurrency(m.avgDealSize)}</div>
		<div class="metric-sub">across won deals</div>
	</div>
</div>

<div class="home-grid">
	<section class="card">
		<div class="card-header">
			<h3>Recent Activity</h3>
			<span class="text-tertiary" style="font-size:12px">All workspaces</span>
		</div>
		<div class="activity-feed" style="padding:0 20px">
			{#each recentActivity as act (act.id)}
				{@const company = act.companyId ? getCompany(act.companyId) : undefined}
				{@const deal = act.dealId ? getDeal(act.dealId) : undefined}
				{@const user = getUser(act.userId)}
				<div class="activity-item">
					<div class="activity-icon {act.type}">
						{activityIcons[act.type] ?? '•'}
					</div>
					<div class="activity-content">
						<div class="activity-header">
							<span class="activity-title">{act.title}</span>
							<span class="activity-date">{relativeDate(act.date)}</span>
						</div>
						<div class="activity-body">{act.body}</div>
						<div class="activity-meta">
							{#if company}
								<a href={resolve('/companies/[id]', { id: company.id })} class="badge neutral">{company.name}</a>
							{/if}
							{#if deal}
								<a href={resolve('/deals/[id]', { id: deal.id })} class="badge accent">{deal.name}</a>
							{/if}
							{#if user}
								<span>{user.name}</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<div class="home-side">
		<div class="card">
			<div class="card-header">
				<h3>Quick Stats</h3>
			</div>
			<div class="card-body">
				<div class="quick-stats">
					<div class="qs-row">
						<span class="qs-label">Active Companies</span>
						<span class="qs-value">{m.activeCompanies}</span>
					</div>
					<div class="qs-row">
						<span class="qs-label">Total Contacts</span>
						<span class="qs-value">{m.totalContacts}</span>
					</div>
					<div class="qs-row">
						<span class="qs-label">Deals Won</span>
						<span class="qs-value">{m.dealsWon}</span>
					</div>
					<div class="qs-row">
						<span class="qs-label">Deals Lost</span>
						<span class="qs-value">{m.dealsLost}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-header">
				<h3>Pipeline by Stage</h3>
			</div>
			<div class="card-body" style="padding:16px 20px">
				{#each pipelineStages as ps}
					<div class="pipeline-row">
						<div class="pipeline-label">
							<span class="stage-dot" style="background:{stageColor[ps.stage]}"></span>
							<span>{ps.stage}</span>
						</div>
						<span class="pipeline-count">{ps.count}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.home-grid {
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		gap: 24px;
		align-items: start;
	}
	.home-side {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.quick-stats {
		display: flex;
		flex-direction: column;
	}
	.qs-row {
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
		font-size: 13px;
	}
	.qs-row:last-child {
		border-bottom: none;
	}
	.qs-label {
		color: var(--text-secondary);
	}
	.qs-value {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.pipeline-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 0;
	}
	.pipeline-label {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 500;
	}
	.pipeline-count {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	@media (max-width: 1024px) {
		.home-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
