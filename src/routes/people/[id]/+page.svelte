<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCompany, getUser } from '$lib/data/mock';
	import {
		activityTypeLabel,
		formatCurrency,
		formatDate,
		personActivities,
		personDeals,
		relativeDate,
		stageColor,
		stageLabel
	} from '$lib/data/utils';

	let { data } = $props();
	const person = $derived(data.person);

	const company = $derived(getCompany(person.companyId));
	const owner = $derived(getUser(person.ownerId));
	const dls = $derived(personDeals(person.id));
	const acts = $derived(personActivities(person.id));

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
	<a href={resolve('/people')}>担当者</a>
	<span class="breadcrumb-sep">/</span>
	<span>{person.lastName} {person.firstName}</span>
</div>

<div class="person-header">
	<div class="person-header-left">
		<div
			class="avatar xl"
			style="background:{person.isPrimary ? '#6C5CE7' : '#9AA0A6'}"
		>
			{person.lastName[0]}
		</div>
		<div>
			<h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em">
				{person.lastName} {person.firstName}
			</h1>
			<div class="text-secondary" style="margin-top:2px">
				{person.title}
				{#if company}
					 · <a href={resolve('/companies/[id]', { id: company.id })} class="company-link">{company.name}</a>
				{/if}
			</div>
			{#if person.isPrimary}
				<span class="badge accent" style="margin-top:8px">主担当</span>
			{/if}
		</div>
	</div>
</div>

<div class="detail-layout" style="margin-top:24px">
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

	<aside class="detail-aside">
		<section class="card">
			<div class="card-header"><h3>連絡先情報</h3></div>
			<div class="card-body">
				<div class="attr-list">
					<div class="attr-row">
						<span class="attr-label">メール</span>
						<span class="attr-value">{person.email}</span>
					</div>
					{#if person.phone}
						<div class="attr-row">
							<span class="attr-label">電話</span>
							<span class="attr-value">{person.phone}</span>
						</div>
					{/if}
					<div class="attr-row">
						<span class="attr-label">役職</span>
						<span class="attr-value">{person.title}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">企業</span>
						<span class="attr-value">{company?.name ?? '—'}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">追加日</span>
						<span class="attr-value">{formatDate(person.createdAt)}</span>
					</div>
					<div class="attr-row">
						<span class="attr-label">担当営業</span>
						<span class="attr-value">{owner?.name ?? '—'}</span>
					</div>
				</div>
			</div>
		</section>

		<section class="card">
			<div class="card-header">
				<h3>案件</h3>
				<span class="text-tertiary" style="font-size:12px">{dls.length}</span>
			</div>
			<div style="padding:0">
				{#if dls.length === 0}
					<div class="card-body">
						<p class="text-tertiary" style="margin:0">関連する案件はありません。</p>
					</div>
				{:else}
					{#each dls as deal (deal.id)}
						<a href={resolve('/deals/[id]', { id: deal.id })} class="record-row">
							<span class="stage-dot" style="background:{stageColor[deal.stage]}"></span>
							<div class="record-info">
								<div class="record-name">{deal.name}</div>
								<div class="record-sub">
									{stageLabel[deal.stage]} · {formatCurrency(deal.value)}
								</div>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</section>
	</aside>
</div>

<style>
	.person-header {
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
	.person-header-left {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}
	.company-link {
		color: var(--accent);
		font-weight: 500;
	}
	.company-link:hover {
		text-decoration: underline;
	}
</style>
