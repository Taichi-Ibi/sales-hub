<script lang="ts">
	import { resolve } from '$app/paths';
	import { deals, tasks, eventLogs } from '$lib/intelligence/store.svelte.js';
	import { PHASE_LABELS, DEAL_PHASES, VALIDATION } from '$lib/intelligence/constants.js';
	import { generateRetrospective } from '$lib/intelligence/ai-engine.js';
	import { computeHandoffOverview } from '$lib/intelligence/handoff.js';
	import { formatDate, formatDateTime } from '$lib/intelligence/format.js';
	import { priorityLabel } from '$lib/intelligence/ui-labels.js';
	import type { DataSource, RetrospectiveResult } from '$lib/intelligence/types.js';

	const now = $derived(new Date());

	// ─── 勝ち筋メーター：申し送り漏れ ───────────────────────────────────────────
	// このプロダクトの勝ち条件は「申し送りが構造的に漏れないこと」。
	// 汎用KPIではなく、まず "今いくつ漏れているか" を最上段で突きつける。
	const handoff = $derived(computeHandoffOverview(deals, eventLogs));
	const atRiskDeals = $derived(
		handoff.perDeal
			.filter((d) => !d.handoff.isComplete && d.handoff.requiredCount > 0)
			.sort((a, b) => b.handoff.missingItems.length - a.handoff.missingItems.length)
	);

	// ─── Retrospective (Task 19.1) ─────────────────────────────────────────────
	function toInputDate(d: Date): string {
		return d.toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
	}

	const today = new Date();
	const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	let retroStart = $state(toInputDate(thirtyDaysAgo));
	let retroEnd = $state(toInputDate(today));
	let retroError = $state('');
	let retroResult = $state<RetrospectiveResult | null>(null);

	const sourceLabels: Record<DataSource, string> = {
		slack: 'Slack',
		email: 'メール',
		calendar: 'カレンダー',
		minutes: '議事録',
		memo: 'メモ'
	};

	function runRetrospective() {
		retroError = '';
		if (!retroStart || !retroEnd) {
			retroError = '開始日と終了日を入力してください';
			retroResult = null;
			return;
		}
		const start = new Date(retroStart + 'T00:00:00');
		const end = new Date(retroEnd + 'T23:59:59');
		if (start.getTime() > end.getTime()) {
			retroError = '開始日は終了日より前を指定してください';
			retroResult = null;
			return;
		}
		retroResult = generateRetrospective(eventLogs, tasks, start, end, deals);
	}

	const retroHasActivity = $derived(
		retroResult !== null &&
			(retroResult.eventLogCount > 0 ||
				retroResult.taskCompletedCount > 0 ||
				retroResult.taskPendingCount > 0 ||
				retroResult.phaseChanges.length > 0)
	);

	const phaseCounts = $derived(
		DEAL_PHASES.map((phase) => ({
			phase,
			label: PHASE_LABELS[phase],
			count: deals.filter((d) => d.phase === phase).length
		}))
	);

	const upcomingEvents = $derived(
		eventLogs
			.filter((l) => {
				if (l.isDeleted || l.source !== 'calendar' || !l.startTime) return false;
				const diff = l.startTime.getTime() - now.getTime();
				return diff >= 0 && diff <= VALIDATION.DASHBOARD_EVENTS_HOURS * 3600_000;
			})
			.sort((a, b) => a.startTime!.getTime() - b.startTime!.getTime())
	);

	const urgentTasks = $derived(
		tasks
			.filter((t) => {
				if (t.status === 'completed' || !t.dueDate) return false;
				const diff = t.dueDate.getTime() - now.getTime();
				return diff <= VALIDATION.DASHBOARD_TASKS_HOURS * 3600_000;
			})
			.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
			.slice(0, VALIDATION.DASHBOARD_TASKS_MAX)
	);

	const completedCount = $derived(tasks.filter((t) => t.status === 'completed').length);
	const completionRate = $derived(
		tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
	);

	const priorityClass: Record<string, string> = {
		high: 'priority-high',
		medium: 'priority-medium',
		low: 'priority-low'
	};
</script>

<svelte:head>
	<title>ダッシュボード — Sales Intelligence</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">ダッシュボード</h1>

	<!-- 勝ち筋メーター：申し送り漏れ -->
	<section class="card meter-card" class:meter-clean={handoff.leakCount === 0}>
		<div class="meter-head">
			<h2 class="meter-eyebrow">このチームの勝ち条件</h2>
			<p class="meter-statement">申し送りを、構造的に漏らさない。</p>
		</div>

		{#if deals.length === 0}
			<p class="empty-message">案件がありません</p>
		{:else}
			<div class="meter-grid">
				<div class="meter-primary" class:is-leak={handoff.leakCount > 0}>
					<span class="meter-value">{handoff.leakCount}</span>
					<span class="meter-unit">件</span>
					<span class="meter-caption">
						{handoff.leakCount === 0 ? '申し送り漏れゼロを達成中' : '漏れている申し送り'}
					</span>
				</div>

				<div class="meter-secondary">
					<div class="meter-rate-row">
						<span class="meter-rate-label">フェーズ移行の充足率</span>
						<span class="meter-rate-value">{handoff.fulfillmentRate}%</span>
					</div>
					<div class="meter-bar" role="presentation">
						<div class="meter-bar-fill" style="width: {handoff.fulfillmentRate}%"></div>
					</div>
					<div class="meter-counts">
						<span class="meter-chip meter-chip-ok">揃っている案件 {handoff.cleanDealCount}</span>
						<span class="meter-chip meter-chip-risk">漏れのある案件 {handoff.atRiskDealCount}</span>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- 漏れている申し送り（案件別） -->
	{#if atRiskDeals.length > 0}
		<section class="card">
			<h2 class="section-title">漏れている申し送り</h2>
			<p class="section-lead">フェーズを次へ渡す前に、これらを埋めると漏れがゼロになります。</p>
			<ul class="risk-list">
				{#each atRiskDeals as { deal, handoff: h } (deal.id)}
					<li class="risk-item">
						<a class="risk-deal" href={resolve('/intelligence/deals')}>
							<span class="risk-deal-name">{deal.name}</span>
							<span class="risk-phase">{PHASE_LABELS[deal.phase]}</span>
						</a>
						<div class="risk-missing">
							{#each h.missingItems as item (item.id)}
								<span class="risk-missing-chip" title={item.hint}>{item.label}</span>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Progress Summary -->
	<section class="card">
		<h2 class="section-title">案件フェーズ別進捗（参考）</h2>
		<div class="phase-summary-meta">
			<span class="meta-item">案件総数: <strong>{deals.length}</strong></span>
			<span class="meta-item">タスク完了率: <strong>{completionRate}%</strong></span>
		</div>
		{#if deals.length === 0}
			<p class="empty-message">表示するデータがありません</p>
		{:else}
			<div class="phase-grid">
				{#each phaseCounts as { label, count } (label)}
					<div class="phase-item">
						<span class="phase-count">{count}</span>
						<span class="phase-label">{label}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Upcoming Events -->
	<section class="card">
		<h2 class="section-title">直近の予定（24時間以内）</h2>
		{#if upcomingEvents.length === 0}
			<p class="empty-message">表示するデータがありません</p>
		{:else}
			<ul class="event-list">
				{#each upcomingEvents as event (event.id)}
					<li class="event-item">
						<div class="event-time">{event.startTime ? formatDateTime(event.startTime) : '—'}</div>
						<div class="event-name">{event.eventName ?? event.title}</div>
						{#if event.attendees && event.attendees.length > 0}
							<div class="event-attendees">{event.attendees.join('、')}</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Urgent Tasks -->
	<section class="card">
		<h2 class="section-title">期限間近のタスク（72時間以内）</h2>
		{#if urgentTasks.length === 0}
			<p class="empty-message">表示するデータがありません</p>
		{:else}
			<ul class="task-list">
				{#each urgentTasks as task (task.id)}
					<li class="task-item" class:overdue={task.dueDate && task.dueDate < now}>
						<span class="task-priority {priorityClass[task.priority]}"
							>{priorityLabel[task.priority]}</span
						>
						<span class="task-title">{task.title}</span>
						<span class="task-due">{task.dueDate ? formatDate(task.dueDate) : '—'}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Retrospective (Task 19.1) -->
	<section class="card">
		<h2 class="section-title">振り返り</h2>
		<div class="retro-controls">
			<label class="retro-field">
				<span class="retro-label">開始日</span>
				<input type="date" class="retro-input" bind:value={retroStart} />
			</label>
			<label class="retro-field">
				<span class="retro-label">終了日</span>
				<input type="date" class="retro-input" bind:value={retroEnd} />
			</label>
			<button class="retro-btn" onclick={runRetrospective}>集計する</button>
		</div>
		{#if retroError}
			<p class="retro-error">{retroError}</p>
		{/if}

		{#if retroResult !== null}
			{#if !retroHasActivity}
				<p class="empty-message">この期間の活動データがありません</p>
			{:else}
				<div class="retro-stats">
					<div class="retro-stat">
						<span class="retro-stat-value">{retroResult.eventLogCount}</span>
						<span class="retro-stat-label">活動記録</span>
					</div>
					<div class="retro-stat">
						<span class="retro-stat-value">{retroResult.taskCompletedCount}</span>
						<span class="retro-stat-label">完了タスク</span>
					</div>
					<div class="retro-stat">
						<span class="retro-stat-value">{retroResult.taskPendingCount}</span>
						<span class="retro-stat-label">未完了タスク</span>
					</div>
					<div class="retro-stat">
						<span class="retro-stat-value">{retroResult.phaseChanges.length}</span>
						<span class="retro-stat-label">フェーズ変更</span>
					</div>
				</div>

				<h3 class="retro-subtitle">活動内訳</h3>
				<div class="retro-activity">
					{#each Object.entries(retroResult.activityPattern) as [source, count] (source)}
						<div class="retro-activity-item">
							<span class="retro-activity-label">{sourceLabels[source as DataSource]}</span>
							<span class="retro-activity-count">{count}</span>
						</div>
					{/each}
				</div>

				{#if retroResult.phaseChanges.length > 0}
					<h3 class="retro-subtitle">フェーズ変更履歴</h3>
					<ul class="retro-phase-list">
						{#each retroResult.phaseChanges as h, i (i)}
							<li class="retro-phase-item">
								<span class="retro-phase-text">
									{PHASE_LABELS[h.fromPhase]} → <strong>{PHASE_LABELS[h.toPhase]}</strong>
								</span>
								<span class="retro-phase-meta">
									{formatDate(h.transitionAt)} · {h.operator}
								</span>
							</li>
						{/each}
					</ul>
				{/if}

				<h3 class="retro-subtitle">AIによる改善提案</h3>
				<ul class="retro-suggestions">
					{#each retroResult.suggestions as suggestion, i (i)}
						<li class="retro-suggestion">{suggestion}</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>
</div>

<style>
	.dashboard {
		max-width: 900px;
	}

	.page-title {
		font-size: var(--font-size-2xl);
		color: var(--color-text-heading);
		margin: 0 0 var(--space-lg);
	}

	.card {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
		padding: var(--space-lg);
		margin-bottom: var(--space-lg);
	}

	.section-title {
		font-size: var(--font-size-lg);
		color: var(--color-text-heading);
		margin: 0 0 var(--space-md);
	}

	.section-lead {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: -8px 0 var(--space-md);
	}

	/* ─── 勝ち筋メーター ───────────────────────────────────────────────────────── */
	.meter-card {
		background: linear-gradient(160deg, var(--color-brand-dark), var(--color-brand));
		color: white;
	}

	.meter-head {
		margin-bottom: var(--space-lg);
	}

	.meter-eyebrow {
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 4px;
	}

	.meter-statement {
		font-size: var(--font-size-xl);
		font-weight: 700;
		margin: 0;
		color: white;
	}

	.meter-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
		align-items: center;
	}

	@media (min-width: 768px) {
		.meter-grid {
			grid-template-columns: minmax(160px, 240px) 1fr;
		}
	}

	.meter-primary {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-md);
		padding: var(--space-md) var(--space-lg);
	}

	.meter-value {
		font-size: 56px;
		line-height: 1;
		font-weight: 800;
		color: var(--color-accent);
	}

	.meter-primary.is-leak .meter-value {
		color: #ffd0d0;
	}

	.meter-unit {
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.meter-caption {
		flex-basis: 100%;
		font-size: var(--font-size-sm);
		color: rgba(255, 255, 255, 0.85);
		margin-top: 4px;
	}

	.meter-secondary {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.meter-rate-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.meter-rate-label {
		font-size: var(--font-size-sm);
		color: rgba(255, 255, 255, 0.85);
	}

	.meter-rate-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
	}

	.meter-bar {
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.meter-bar-fill {
		height: 100%;
		border-radius: 999px;
		background: var(--color-accent);
		transition: width 0.4s ease;
	}

	.meter-counts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-top: 4px;
	}

	.meter-chip {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 999px;
	}

	.meter-chip-ok {
		background: rgba(255, 255, 255, 0.18);
		color: white;
	}

	.meter-chip-risk {
		background: rgba(255, 255, 255, 0.92);
		color: var(--color-brand-dark);
	}

	/* ─── 漏れている申し送り ───────────────────────────────────────────────────── */
	.risk-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.risk-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-warning);
		border-radius: var(--radius-sm);
	}

	@media (min-width: 768px) {
		.risk-item {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}

	.risk-deal {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		text-decoration: none;
		color: inherit;
		flex-shrink: 0;
	}

	.risk-deal:hover .risk-deal-name {
		text-decoration: underline;
	}

	.risk-deal-name {
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-brand);
	}

	.risk-phase {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.risk-missing {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.risk-missing-chip {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		background: var(--color-accent-light);
		color: var(--color-warning);
		border: 1px solid var(--color-accent);
		cursor: help;
	}

	.phase-summary-meta {
		display: flex;
		gap: var(--space-lg);
		margin-bottom: var(--space-md);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.meta-item strong {
		color: var(--color-text);
	}

	.phase-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	@media (min-width: 768px) {
		.phase-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.phase-item {
		background: var(--color-brand-light);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.phase-count {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--color-brand);
	}

	.phase-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-align: center;
	}

	.empty-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.event-list,
	.task-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.event-item {
		display: grid;
		grid-template-columns: 88px 1fr;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border);
		align-items: baseline;
	}

	@media (min-width: 768px) {
		.event-item {
			grid-template-columns: 120px 1fr;
		}
	}

	.event-item:last-child {
		border-bottom: none;
	}

	.event-time {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.event-name {
		font-size: var(--font-size-md);
		color: var(--color-text);
	}

	.event-attendees {
		grid-column: 2;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.task-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.task-item.overdue {
		background: #fff0f0;
		border-color: var(--color-error);
	}

	.task-priority {
		font-size: var(--font-size-xs);
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.priority-high {
		background: var(--color-error);
		color: white;
	}

	.priority-medium {
		background: var(--color-accent);
		color: var(--color-brand-dark);
	}

	.priority-low {
		background: var(--color-success);
		color: white;
	}

	.task-title {
		flex: 1;
		font-size: var(--font-size-md);
	}

	.task-due {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* ─── Retrospective ──────────────────────────────────────────────────────── */
	.retro-controls {
		display: flex;
		align-items: flex-end;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}

	.retro-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	@media (max-width: 767px) {
		.retro-field,
		.retro-input,
		.retro-btn {
			width: 100%;
		}
	}

	.retro-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.retro-input {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
	}

	.retro-btn {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-brand);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.retro-error {
		font-size: var(--font-size-sm);
		color: var(--color-error);
		margin: 0 0 var(--space-sm);
	}

	.retro-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	@media (min-width: 768px) {
		.retro-stats {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.retro-stat {
		background: var(--color-brand-light);
		border-radius: var(--radius-sm);
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.retro-stat-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--color-brand);
	}

	.retro-stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.retro-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-heading);
		margin: var(--space-md) 0 var(--space-sm);
	}

	.retro-activity {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.retro-activity-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.retro-activity-label {
		color: var(--color-text-muted);
	}

	.retro-activity-count {
		font-weight: 700;
		color: var(--color-text);
	}

	.retro-phase-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.retro-phase-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.retro-phase-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.retro-suggestions {
		margin: 0;
		padding-left: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.retro-suggestion {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		line-height: 1.5;
	}
</style>
