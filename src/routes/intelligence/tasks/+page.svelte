<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		tasks,
		deals,
		updateTaskStatus,
		approveTask,
		rejectTask
	} from '$lib/intelligence/store.svelte.js';
	import { canTransitionTaskStatus } from '$lib/intelligence/validation.js';
	import { VALIDATION } from '$lib/intelligence/constants.js';
	import type { Task, TaskPriority, TaskStatus } from '$lib/intelligence/types.js';

	let now = $state(new Date());
	let dismissedIds = new SvelteSet<string>();
	let filterDealId = $state('');
	let filterPriority = $state<TaskPriority | ''>('');
	let transitionError = $state('');

	onMount(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, VALIDATION.REMINDER_CHECK_INTERVAL_SEC * 1000);
		return () => clearInterval(interval);
	});

	const priorityLabel: Record<TaskPriority, string> = {
		high: '高',
		medium: '中',
		low: '低'
	};

	const statusLabel: Record<TaskStatus, string> = {
		not_started: '未着手',
		in_progress: '進行中',
		completed: '完了'
	};

	function getDealName(dealId?: string): string {
		if (!dealId) return '';
		return deals.find((d) => d.id === dealId)?.name ?? '';
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return '—';
		return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
	}

	function isOverdue(task: Task): boolean {
		return task.dueDate !== undefined && task.dueDate < now && task.status !== 'completed';
	}

	function handleTransition(task: Task, to: TaskStatus) {
		if (!canTransitionTaskStatus(task.status, to)) {
			transitionError = `「${statusLabel[task.status]}」から「${statusLabel[to]}」への遷移はできません`;
			setTimeout(() => (transitionError = ''), 3000);
			return;
		}
		updateTaskStatus(task.id, to);
	}

	function sortByDueDate(a: Task, b: Task): number {
		return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
	}

	const visibleTasks = $derived(
		tasks.filter((t) => {
			if (t.rejectedAt) return false;
			if (filterDealId && t.dealId !== filterDealId) return false;
			if (filterPriority && t.priority !== filterPriority) return false;
			return true;
		})
	);

	const proposals = $derived(visibleTasks.filter((t) => t.isProposal));

	const notStartedTasks = $derived(
		visibleTasks.filter((t) => !t.isProposal && t.status === 'not_started').sort(sortByDueDate)
	);

	const inProgressTasks = $derived(
		visibleTasks.filter((t) => !t.isProposal && t.status === 'in_progress').sort(sortByDueDate)
	);

	const completedTasks = $derived(
		visibleTasks.filter((t) => !t.isProposal && t.status === 'completed').sort(sortByDueDate)
	);

	const reminderTasks = $derived(
		tasks
			.filter((t) => {
				if (t.isProposal || t.rejectedAt || t.status === 'completed' || !t.dueDate) return false;
				const threshold = new Date(
					now.getTime() + VALIDATION.REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000
				);
				return t.dueDate <= threshold && !dismissedIds.has(t.id);
			})
			.sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
	);

	const visibleReminders = $derived(reminderTasks.slice(0, VALIDATION.REMINDERS_MAX));
	const hiddenReminderCount = $derived(
		Math.max(0, reminderTasks.length - VALIDATION.REMINDERS_MAX)
	);

	const dealOptions = $derived(deals.filter((d) => tasks.some((t) => t.dealId === d.id)));
</script>

<svelte:head>
	<title>タスク — Sales Intelligence</title>
</svelte:head>

{#if visibleReminders.length > 0}
	<div class="reminder-bar">
		<div class="reminder-header">
			<span class="reminder-icon">🔔</span>
			<strong class="reminder-title">期限が近いタスク</strong>
			{#if hiddenReminderCount > 0}
				<span class="reminder-overflow">他 {hiddenReminderCount} 件</span>
			{/if}
		</div>
		<ul class="reminder-list">
			{#each visibleReminders as task (task.id)}
				<li class="reminder-item">
					<span class="reminder-task-name">{task.title}</span>
					<span class="reminder-due">期限: {formatDate(task.dueDate)}</span>
					<button class="reminder-dismiss" onclick={() => dismissedIds.add(task.id)}>×</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<div class="tasks-page">
	<div class="page-header">
		<h1 class="page-title">タスク</h1>
	</div>

	<div class="filter-bar">
		<select class="filter-select" bind:value={filterDealId}>
			<option value="">すべての案件</option>
			{#each dealOptions as deal (deal.id)}
				<option value={deal.id}>{deal.name}</option>
			{/each}
		</select>
		<div class="priority-filters">
			<button
				class="filter-chip"
				class:selected={filterPriority === ''}
				onclick={() => (filterPriority = '')}>すべて</button
			>
			{#each ['high', 'medium', 'low'] as TaskPriority[] as p (p)}
				<button
					class="filter-chip"
					class:selected={filterPriority === p}
					onclick={() => (filterPriority = p)}>{priorityLabel[p]}</button
				>
			{/each}
		</div>
	</div>

	{#if transitionError}
		<div class="error-banner">{transitionError}</div>
	{/if}

	{#if proposals.length > 0}
		<section class="task-group">
			<h2 class="group-title">
				<span class="group-badge proposal-badge">AI提案</span>
				<span class="group-count">{proposals.length}件</span>
			</h2>
			<ul class="task-list">
				{#each proposals as task (task.id)}
					<li class="task-card proposal-card">
						<div class="task-main">
							<span class="task-title">{task.title}</span>
							{#if task.dealId}
								<span class="task-deal">{getDealName(task.dealId)}</span>
							{/if}
							<div class="task-meta">
								<span class="priority-badge priority-{task.priority}"
									>{priorityLabel[task.priority]}</span
								>
								<span class="task-due">期限: {formatDate(task.dueDate)}</span>
							</div>
						</div>
						<div class="task-actions">
							<button class="btn-approve" onclick={() => approveTask(task.id)}>承認</button>
							<button class="btn-reject" onclick={() => rejectTask(task.id)}>却下</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="task-group">
		<h2 class="group-title">
			<span class="group-badge not-started-badge">未着手</span>
			<span class="group-count">{notStartedTasks.length}件</span>
		</h2>
		{#if notStartedTasks.length === 0}
			<p class="empty-message">タスクはありません</p>
		{:else}
			<ul class="task-list">
				{#each notStartedTasks as task (task.id)}
					<li class="task-card" class:overdue={isOverdue(task)}>
						<div class="task-main">
							<span class="task-title">{task.title}</span>
							{#if task.dealId}
								<span class="task-deal">{getDealName(task.dealId)}</span>
							{/if}
							<div class="task-meta">
								<span class="priority-badge priority-{task.priority}"
									>{priorityLabel[task.priority]}</span
								>
								<span class="task-due" class:overdue-text={isOverdue(task)}
									>期限: {formatDate(task.dueDate)}</span
								>
							</div>
						</div>
						<div class="task-actions">
							<button
								class="btn-transition"
								disabled={!canTransitionTaskStatus(task.status, 'in_progress')}
								onclick={() => handleTransition(task, 'in_progress')}>開始</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="task-group">
		<h2 class="group-title">
			<span class="group-badge in-progress-badge">進行中</span>
			<span class="group-count">{inProgressTasks.length}件</span>
		</h2>
		{#if inProgressTasks.length === 0}
			<p class="empty-message">タスクはありません</p>
		{:else}
			<ul class="task-list">
				{#each inProgressTasks as task (task.id)}
					<li class="task-card" class:overdue={isOverdue(task)}>
						<div class="task-main">
							<span class="task-title">{task.title}</span>
							{#if task.dealId}
								<span class="task-deal">{getDealName(task.dealId)}</span>
							{/if}
							<div class="task-meta">
								<span class="priority-badge priority-{task.priority}"
									>{priorityLabel[task.priority]}</span
								>
								<span class="task-due" class:overdue-text={isOverdue(task)}
									>期限: {formatDate(task.dueDate)}</span
								>
							</div>
						</div>
						<div class="task-actions">
							<button
								class="btn-transition"
								disabled={!canTransitionTaskStatus(task.status, 'completed')}
								onclick={() => handleTransition(task, 'completed')}>完了</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="task-group">
		<h2 class="group-title">
			<span class="group-badge completed-badge">完了</span>
			<span class="group-count">{completedTasks.length}件</span>
		</h2>
		{#if completedTasks.length === 0}
			<p class="empty-message">完了したタスクはありません</p>
		{:else}
			<ul class="task-list">
				{#each completedTasks as task (task.id)}
					<li class="task-card">
						<div class="task-main">
							<span class="task-title completed-title">{task.title}</span>
							{#if task.dealId}
								<span class="task-deal">{getDealName(task.dealId)}</span>
							{/if}
							<div class="task-meta">
								<span class="priority-badge priority-{task.priority}"
									>{priorityLabel[task.priority]}</span
								>
								<span class="task-due">期限: {formatDate(task.dueDate)}</span>
							</div>
						</div>
						<div class="task-actions">
							<button
								class="btn-transition btn-reset"
								disabled={!canTransitionTaskStatus(task.status, 'not_started')}
								onclick={() => handleTransition(task, 'not_started')}>戻す</button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.reminder-bar {
		background: var(--color-accent-light);
		border-left: 4px solid var(--color-warning);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin-bottom: var(--space-md);
	}

	.reminder-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.reminder-icon {
		font-size: 16px;
	}

	.reminder-title {
		font-size: var(--font-size-sm);
		color: var(--color-warning);
	}

	.reminder-overflow {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin-left: auto;
	}

	.reminder-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.reminder-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.reminder-task-name {
		flex: 1;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reminder-due {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.reminder-dismiss {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
		padding: 0 4px;
		line-height: 1;
	}

	.reminder-dismiss:hover {
		color: var(--color-error);
	}

	.tasks-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.page-header {
		display: flex;
		align-items: center;
	}

	.page-title {
		font-size: var(--font-size-xl);
		color: var(--color-text-heading);
		margin: 0;
	}

	.filter-bar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.filter-select {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
		color: var(--color-text);
		cursor: pointer;
	}

	.priority-filters {
		display: flex;
		gap: var(--space-xs);
	}

	.filter-chip {
		font-size: var(--font-size-xs);
		padding: 3px var(--space-sm);
		border: 1px solid var(--color-border);
		background: white;
		color: var(--color-text);
		border-radius: 12px;
		cursor: pointer;
	}

	.filter-chip.selected {
		background: var(--color-brand);
		color: white;
		border-color: var(--color-brand);
	}

	.error-banner {
		background: #fdecea;
		border-left: 4px solid var(--color-error);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--color-error);
	}

	.task-group {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
		padding: var(--space-md);
	}

	.group-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin: 0 0 var(--space-sm);
		font-size: var(--font-size-md);
	}

	.group-badge {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 2px var(--space-sm);
		border-radius: 10px;
	}

	.proposal-badge {
		background: #e8f4fd;
		color: var(--color-brand);
	}

	.not-started-badge {
		background: var(--color-bg);
		color: var(--color-text-muted);
	}

	.in-progress-badge {
		background: var(--color-accent-light);
		color: var(--color-warning);
	}

	.completed-badge {
		background: #e6f4ea;
		color: var(--color-success);
	}

	.group-count {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-weight: normal;
	}

	.empty-message {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
		padding: var(--space-sm) 0;
	}

	.task-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.task-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	.task-card.overdue {
		background: #fff0f0;
		border-color: #f9c5c5;
	}

	.proposal-card {
		border-color: var(--color-brand);
		background: #f0f7ff;
	}

	.task-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.task-title {
		font-size: var(--font-size-md);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.completed-title {
		text-decoration: line-through;
		color: var(--color-text-muted);
	}

	.task-deal {
		font-size: var(--font-size-xs);
		color: var(--color-brand);
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: 2px;
	}

	.priority-badge {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 8px;
	}

	.priority-high {
		background: #fdecea;
		color: var(--color-error);
	}

	.priority-medium {
		background: var(--color-accent-light);
		color: var(--color-warning);
	}

	.priority-low {
		background: #e6f4ea;
		color: var(--color-success);
	}

	.task-due {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.overdue-text {
		color: var(--color-error);
		font-weight: 600;
	}

	.task-actions {
		display: flex;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.btn-transition {
		font-size: var(--font-size-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-transition:hover:not(:disabled) {
		background: var(--color-brand);
		color: white;
	}

	.btn-transition:disabled {
		border-color: var(--color-border);
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.btn-reset {
		border-color: var(--color-border);
		color: var(--color-text-muted);
	}

	.btn-reset:hover:not(:disabled) {
		background: var(--color-bg);
		color: var(--color-text);
	}

	.btn-approve {
		font-size: var(--font-size-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-success);
		background: white;
		color: var(--color-success);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-approve:hover {
		background: var(--color-success);
		color: white;
	}

	.btn-reject {
		font-size: var(--font-size-xs);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-error);
		background: white;
		color: var(--color-error);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-reject:hover {
		background: var(--color-error);
		color: white;
	}
</style>
