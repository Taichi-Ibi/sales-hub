<script lang="ts">
	import { deals, tasks, eventLogs } from '$lib/intelligence/store.svelte.js';
	import { PHASE_LABELS, DEAL_PHASES, VALIDATION } from '$lib/intelligence/constants.js';

	const now = $derived(new Date());

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

	function formatDateTime(date: Date): string {
		return date.toLocaleString('ja-JP', {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDate(date: Date): string {
		return date.toLocaleDateString('ja-JP', {
			month: 'numeric',
			day: 'numeric'
		});
	}

	const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' };
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

	<!-- Progress Summary -->
	<section class="card">
		<h2 class="section-title">案件フェーズ別進捗</h2>
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
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-sm);
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
		grid-template-columns: 120px 1fr;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border);
		align-items: baseline;
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
</style>
