<script lang="ts">
	import { resolve } from '$app/paths';
	import { getUser } from '$lib/data/mock';
	import {
		activityTypeLabel,
		companyActivities,
		companyDeals,
		companyPeople,
		companyRevenue,
		formatCurrency,
		formatDate,
		relativeDate,
		stageColor
	} from '$lib/data/utils';

	let { data } = $props();
	const company = $derived(data.company);

	const ppl = $derived(companyPeople(company.id));
	const dls = $derived(companyDeals(company.id));
	const acts = $derived(companyActivities(company.id));
	const revenue = $derived(companyRevenue(company.id));
	const owner = $derived(getUser(company.ownerId));

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
	<a href={resolve('/')}>Home</a>
	<span class="breadcrumb-sep">/</span>
	<a href={resolve('/companies')}>Companies</a>
	<span class="breadcrumb-sep">/</span>
	<span>{company.name}</span>
</div>

<div class="company-header">
	<div class="company-header-left">
		<div class="company-icon-lg">{company.name[0]}</div>
		<div>
			<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em">{company.name}</h1>
			<div class="text-secondary" style="margin-top:2px">
				{company.domain} · {company.industry} · {company.employees.toLocaleString()} employees
			</div>
			<div style="display:flex;gap:6px;margin-top:8px">
				{#each company.tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		</div>
	</div>
	<div class="company-stats">
		<div class="cs">
			<span class="cs-label">Revenue</span>
			<span class="cs-value">{revenue ? formatCurrency(revenue) : '—'}</span>
		</div>
		<div class="cs">
			<span class="cs-label">Deals</span>
			<span class="cs-value">{dls.length}</span>
		</div>
		<div class="cs">
			<span class="cs-label">Contacts</span>
			<span class="cs-value">{ppl.length}</span>
		</div>
		<div class="cs">
			<span class="cs-label">Owner</span>
			<span class="cs-value">{owner?.name ?? '—'}</span>
		</div>
	</div>
</div>

<div class="detail-layout" style="margin-top:24px">
	<div class="detail-main">
		<section class="card">
			<div class="card-header">
				<h3>Activity</h3>
				<span class="text-tertiary" style="font-size:12px">{acts.length} events</span>
			</div>
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
		</section>
	</div>

	<aside class="detail-aside">
		<section class="card">
			<div class="card-header"><h3>About</h3></div>
			<div class="card-body">
				<div class="attr-list">
					<div class="attr-row">
						<span class="attr-label">Domain</span>
						<span class="attr-value">{company.domain}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">Industry</span>
						<span class="attr-value">{company.industry}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">Employees</span>
						<span class="attr-value">{company.employees.toLocaleString()}</span>
					</div>
					{#if company.annualRevenue}
						<div class="attr-row">
							<span class="attr-label">Annual Revenue</span>
							<span class="attr-value">{company.annualRevenue}</span>
						</div>
					{/if}
					<div class="attr-row">
						<span class="attr-label">Created</span>
						<span class="attr-value">{formatDate(company.createdAt)}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">Owner</span>
						<span class="attr-value">{owner?.name ?? '—'}</span>
					</div>
				</div>
			</div>
		</section>

		<section class="card">
			<div class="card-header">
				<h3>People</h3>
				<span class="text-tertiary" style="font-size:12px">{ppl.length}</span>
			</div>
			<div style="padding:0">
				{#each ppl as person (person.id)}
					<a
						href={resolve('/people/[id]', { id: person.id })}
						class="record-row"
					>
						<div
							class="avatar sm"
							style="background:{person.isPrimary ? '#6C5CE7' : '#9AA0A6'}"
						>
							{person.lastName[0]}
						</div>
						<div class="record-info">
							<div class="record-name">
								{person.lastName} {person.firstName}
								{#if person.isPrimary}
									<span class="badge accent" style="margin-left:4px;font-size:10px">Primary</span>
								{/if}
							</div>
							<div class="record-sub">{person.title}</div>
						</div>
					</a>
				{/each}
			</div>
		</section>

		<section class="card">
			<div class="card-header">
				<h3>Deals</h3>
				<span class="text-tertiary" style="font-size:12px">{dls.length}</span>
			</div>
			<div style="padding:0">
				{#each dls as deal (deal.id)}
					<a href={resolve('/deals/[id]', { id: deal.id })} class="record-row">
						<span class="stage-dot" style="background:{stageColor[deal.stage]}"></span>
						<div class="record-info">
							<div class="record-name">{deal.name}</div>
							<div class="record-sub">
								{deal.stage} · {formatCurrency(deal.value)}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	</aside>
</div>

<style>
	.company-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 24px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}
	.company-header-left {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}
	.company-icon-lg {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-lg);
		background: var(--accent-soft);
		color: var(--accent);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 20px;
		flex-shrink: 0;
	}
	.company-stats {
		display: grid;
		grid-template-columns: repeat(2, auto);
		gap: 8px 32px;
	}
	.cs {
		display: flex;
		flex-direction: column;
		text-align: right;
	}
	.cs-label {
		font-size: 11px;
		color: var(--text-tertiary);
		font-weight: 500;
	}
	.cs-value {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
