<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCompany, getPerson, getUser } from '$lib/data/mock';
	import { PIPELINE_STAGES } from '$lib/data/types';
	import {
		activityTypeLabel,
		dealActivities,
		formatCurrency,
		formatDate,
		relativeDate,
		stageColor,
		stageLabel
	} from '$lib/data/utils';

	let { data } = $props();
	const deal = $derived(data.deal);

	const company = $derived(getCompany(deal.companyId));
	const contact = $derived(getPerson(deal.contactId));
	const owner = $derived(getUser(deal.ownerId));
	const acts = $derived(dealActivities(deal.id));

	const stageIdx = $derived(PIPELINE_STAGES.indexOf(deal.stage as (typeof PIPELINE_STAGES)[number]));
	const isWon = $derived(deal.stage === 'Closed Won');
	const isLost = $derived(deal.stage === 'Closed Lost');

	const activityIcons: Record<string, string> = {
		note: '✎',
		email: '✉',
		call: '☎',
		meeting: '◉',
		stage_change: '→',
		task: '☐'
	};
</script>

<div class="breadcrumb">
	<a href={resolve('/')}>ホーム</a>
	<span class="breadcrumb-sep">/</span>
	<a href={resolve('/deals')}>案件</a>
	<span class="breadcrumb-sep">/</span>
	<span>{deal.name}</span>
</div>

<div class="deal-header">
	<div class="deal-header-left">
		<div>
			<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
				<span
					class="badge"
					class:success={isWon}
					class:neutral={isLost}
					class:accent={!isWon && !isLost}
					style="font-size:13px;padding:4px 12px"
				>
					<span class="stage-dot" style="background:{stageColor[deal.stage]};width:8px;height:8px"></span>
					{stageLabel[deal.stage]}
				</span>
			</div>
			<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em">{deal.name}</h1>
			<div class="text-secondary" style="margin-top:4px">
				{#if company}
					<a href={resolve('/companies/[id]', { id: company.id })} class="company-link">{company.name}</a>
				{/if}
			</div>
		</div>
	</div>
	<div class="deal-value-block">
		<div class="dv-label">案件金額</div>
		<div class="dv-amount">{formatCurrency(deal.value)}</div>
		<div class="dv-sub">確度 {deal.probability}%</div>
	</div>
</div>

{#if !isWon && !isLost}
	<div class="stage-progress" style="margin-top:16px">
		<div class="card" style="padding:20px">
			<div class="stage-steps">
				{#each PIPELINE_STAGES as stage, i}
					{@const active = i <= stageIdx}
					{@const current = i === stageIdx}
					<div class="stage-step" class:active class:current>
						<div class="stage-step-dot" style={active ? `background:${stageColor[stage]};border-color:${stageColor[stage]}` : ''}>
							{#if active && !current}
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
							{/if}
						</div>
						{#if i < PIPELINE_STAGES.length - 1}
							<div class="stage-step-line" class:filled={i < stageIdx}></div>
						{/if}
						<div class="stage-step-label">{stageLabel[stage]}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<div class="detail-layout" style="margin-top:20px">
	<aside class="detail-aside">
		<section class="card">
			<div class="card-header"><h3>案件詳細</h3></div>
			<div class="card-body">
				<div class="attr-list">
					<div class="attr-row">
						<span class="attr-label">金額</span>
						<span class="attr-value" style="font-weight:700">{formatCurrency(deal.value)}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">確度</span>
						<span class="attr-value">{deal.probability}%</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">クローズ予定</span>
						<span class="attr-value">{formatDate(deal.expectedCloseDate)}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">作成日</span>
						<span class="attr-value">{formatDate(deal.createdAt)}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">担当営業</span>
						<span class="attr-value">{owner?.name ?? '—'}</span>
					</div>
				</div>
			</div>
		</section>

		{#if company}
			<section class="card">
				<div class="card-header"><h3>企業</h3></div>
				<div style="padding:0">
					<a href={resolve('/companies/[id]', { id: company.id })} class="record-row">
						<div class="company-mini-icon">{company.name[0]}</div>
						<div class="record-info">
							<div class="record-name">{company.name}</div>
							<div class="record-sub">{company.industry} · {company.employees.toLocaleString()}名</div>
						</div>
					</a>
				</div>
			</section>
		{/if}

		{#if contact}
			<section class="card">
				<div class="card-header"><h3>担当者</h3></div>
				<div style="padding:0">
					<a href={resolve('/people/[id]', { id: contact.id })} class="record-row">
						<div class="avatar sm" style="background:#4f46e5">{contact.lastName[0]}</div>
						<div class="record-info">
							<div class="record-name">{contact.lastName} {contact.firstName}</div>
							<div class="record-sub">{contact.title}</div>
						</div>
					</a>
				</div>
			</section>
		{/if}

		{#if deal.description}
			<section class="card">
				<div class="card-header"><h3>メモ</h3></div>
				<div class="card-body">
					<p style="margin:0;font-size:13px;color:var(--text-secondary);line-height:1.6">
						{deal.description}
					</p>
				</div>
			</section>
		{/if}
	</aside>

	<div class="detail-main">
		<section class="card">
			<div class="card-header">
				<h3>アクティビティ</h3>
				<span class="text-tertiary" style="font-size:12px">{acts.length}件</span>
			</div>
			{#if acts.length === 0}
				<div class="card-body">
					<p class="text-tertiary" style="margin:0">アクティビティはまだありません。</p>
				</div>
			{:else}
				<div class="activity-feed" style="padding:0 20px">
					{#each acts as act (act.id)}
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
								{#if user}
									<div class="activity-meta">
										<span class="badge neutral">{activityTypeLabel[act.type]}</span>
										<span>{user.name}</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.deal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 24px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius);
	}
	.deal-header-left {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}
	.deal-value-block {
		text-align: right;
	}
	.dv-label {
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.dv-amount {
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}
	.dv-sub {
		font-size: 12px;
		color: var(--text-tertiary);
	}
	.company-link {
		color: var(--accent);
		font-weight: 500;
	}
	.company-link:hover {
		text-decoration: underline;
	}
	.company-mini-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius);
		background: var(--accent-soft);
		color: var(--accent);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 14px;
		flex-shrink: 0;
	}

	/* Stage progress */
	.stage-steps {
		display: flex;
		align-items: flex-start;
	}
	.stage-step {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.stage-step-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--surface);
		border: 2px solid var(--border-strong);
		z-index: 1;
		transition: all 0.2s;
	}
	.stage-step.current .stage-step-dot {
		box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--accent);
	}
	.stage-step-line {
		position: absolute;
		top: 13px;
		left: 50%;
		width: 100%;
		height: 2px;
		background: var(--border);
	}
	.stage-step-line.filled {
		background: var(--accent);
	}
	.stage-step-label {
		font-size: 11px;
		margin-top: 8px;
		color: var(--text-tertiary);
		font-weight: 500;
	}
	.stage-step.active .stage-step-label {
		color: var(--text-secondary);
	}
	.stage-step.current .stage-step-label {
		color: var(--accent);
		font-weight: 600;
	}
</style>
