<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { eventLogs, updateEventLog } from '$lib/intelligence/store.svelte.js';
	import { groupByThread } from '$lib/intelligence/thread-grouper.js';

	const threadGroups = $derived(groupByThread(eventLogs));
	import { selectVisibleEventLogs } from '$lib/intelligence/store-logic.js';
	import { getThreadMessages } from '$lib/intelligence/thread-grouper.js';
	import { VALIDATION } from '$lib/intelligence/constants.js';
	import type { DataSource, EventLog, ThreadGroup } from '$lib/intelligence/types.js';

	type SelectedItem = { type: 'event'; item: EventLog } | { type: 'thread'; item: ThreadGroup };

	let isFlat = $state(false);
	let selectedSources = new SvelteSet<DataSource>();
	let currentPage = $state(0);
	let selected = $state<SelectedItem | null>(null);

	const sourceOptions: { value: DataSource; label: string }[] = [
		{ value: 'slack', label: 'Slack' },
		{ value: 'email', label: 'メール' },
		{ value: 'calendar', label: 'カレンダー' },
		{ value: 'minutes', label: '議事録' },
		{ value: 'memo', label: 'メモ' }
	];

	const sourceIcons: Record<DataSource, string> = {
		slack: '💬',
		email: '✉️',
		calendar: '📅',
		minutes: '📝',
		memo: '🗒️'
	};

	function toggleSource(source: DataSource) {
		if (selectedSources.has(source)) {
			selectedSources.delete(source);
		} else {
			selectedSources.add(source);
		}
		currentPage = 0;
	}

	const visibleLogs = $derived(selectVisibleEventLogs(eventLogs));

	const filteredFlat = $derived(
		visibleLogs
			.filter((l) => selectedSources.size === 0 || selectedSources.has(l.source))
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
	);

	const filteredThreads = $derived(
		threadGroups.filter(
			(tg) =>
				selectedSources.size === 0 ||
				selectedSources.has(tg.source) ||
				[tg.parentMessage, ...tg.replies].some((l) => selectedSources.has(l.source))
		)
	);

	const flatPageItems = $derived(
		filteredFlat.slice(currentPage * VALIDATION.PAGE_SIZE, (currentPage + 1) * VALIDATION.PAGE_SIZE)
	);

	const threadPageItems = $derived(
		filteredThreads.slice(
			currentPage * VALIDATION.PAGE_SIZE,
			(currentPage + 1) * VALIDATION.PAGE_SIZE
		)
	);

	const totalItems = $derived(isFlat ? filteredFlat.length : filteredThreads.length);
	const totalPages = $derived(Math.ceil(totalItems / VALIDATION.PAGE_SIZE));

	function selectEvent(log: EventLog) {
		selected = { type: 'event', item: log };
		if (!log.isRead) {
			updateEventLog(log.id, { isRead: true });
		}
	}

	function selectThread(tg: ThreadGroup) {
		selected = { type: 'thread', item: tg };
		if (!tg.parentMessage.isRead) {
			updateEventLog(tg.parentMessage.id, { isRead: true });
		}
	}

	function formatDateTime(date: Date): string {
		return date.toLocaleString('ja-JP', {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const statusLabel: Record<string, string> = {
		pending: '未承認',
		approved: '承認済',
		rejected: '却下'
	};

	const statusClass: Record<string, string> = {
		pending: 'status-pending',
		approved: 'status-approved',
		rejected: 'status-rejected'
	};

	function getThreadMessages2(tg: ThreadGroup): EventLog[] {
		return getThreadMessages(tg).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	}
</script>

<svelte:head>
	<title>インボックス — Sales Intelligence</title>
</svelte:head>

<div class="inbox-layout">
	<div class="inbox-left">
		<div class="inbox-header">
			<h1 class="page-title">インボックス</h1>
			<button
				class="toggle-btn"
				class:active={isFlat}
				onclick={() => {
					isFlat = !isFlat;
					currentPage = 0;
					selected = null;
				}}
			>
				{isFlat ? 'スレッド表示' : 'フラット表示'}
			</button>
		</div>

		<!-- FilterBar -->
		<div class="filter-bar">
			{#each sourceOptions as opt (opt.value)}
				<button
					class="filter-chip"
					class:selected={selectedSources.has(opt.value)}
					onclick={() => toggleSource(opt.value)}
				>
					{sourceIcons[opt.value]}
					{opt.label}
				</button>
			{/each}
		</div>

		<!-- List -->
		{#if totalItems === 0}
			<p class="empty-message">表示するEvent_Logがありません</p>
		{:else if isFlat}
			<ul class="item-list">
				{#each flatPageItems as log (log.id)}
					<li>
						<button
							class="item-row"
							class:unread={!log.isRead}
							class:active={selected?.type === 'event' && selected.item.id === log.id}
							onclick={() => selectEvent(log)}
						>
							<span class="source-icon">{sourceIcons[log.source]}</span>
							<div class="item-body">
								<span class="item-title">{log.title.slice(0, 50)}</span>
								<span class="item-meta">
									{formatDateTime(log.timestamp)}
									<span class="status-badge {statusClass[log.status]}"
										>{statusLabel[log.status]}</span
									>
								</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="item-list">
				{#each threadPageItems as tg (tg.id)}
					<li>
						<button
							class="item-row"
							class:unread={!tg.parentMessage.isRead}
							class:active={selected?.type === 'thread' && selected.item.id === tg.id}
							onclick={() => selectThread(tg)}
						>
							<span class="source-icon">{sourceIcons[tg.source]}</span>
							<div class="item-body">
								<span class="item-title">{tg.parentMessage.title.slice(0, 50)}</span>
								<span class="item-meta">
									{formatDateTime(tg.latestMessageAt)}
									<span class="thread-count">{tg.messageCount}件</span>
								</span>
							</div>
						</button>
					</li>
				{/each}
				<!-- standalone logs not in any thread -->
				{#each filteredFlat
					.filter((l) => l.source !== 'slack' && l.source !== 'email')
					.filter((l) => selectedSources.size === 0 || selectedSources.has(l.source))
					.slice(currentPage * VALIDATION.PAGE_SIZE, (currentPage + 1) * VALIDATION.PAGE_SIZE) as log (log.id)}
					{#if !threadPageItems.some((tg) => tg.parentMessage.id === log.id || tg.replies.some((r) => r.id === log.id))}
						<li>
							<button
								class="item-row"
								class:unread={!log.isRead}
								class:active={selected?.type === 'event' && selected.item.id === log.id}
								onclick={() => selectEvent(log)}
							>
								<span class="source-icon">{sourceIcons[log.source]}</span>
								<div class="item-body">
									<span class="item-title">{log.title.slice(0, 50)}</span>
									<span class="item-meta">
										{formatDateTime(log.timestamp)}
										<span class="status-badge {statusClass[log.status]}"
											>{statusLabel[log.status]}</span
										>
									</span>
								</div>
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<button class="page-btn" disabled={currentPage === 0} onclick={() => (currentPage -= 1)}>
					前へ
				</button>
				<span class="page-info">{currentPage + 1} / {totalPages}</span>
				<button
					class="page-btn"
					disabled={currentPage >= totalPages - 1}
					onclick={() => (currentPage += 1)}
				>
					次へ
				</button>
			</div>
		{/if}
	</div>

	<!-- Detail Panel -->
	<div class="inbox-detail">
		{#if selected === null}
			<div class="detail-empty">
				<p>左のリストから項目を選択してください</p>
			</div>
		{:else if selected.type === 'event'}
			{@const log = selected.item}
			<div class="detail-panel">
				<div class="detail-header">
					<span class="source-icon lg">{sourceIcons[log.source]}</span>
					<div>
						<h2 class="detail-title">{log.title}</h2>
						<div class="detail-meta">
							{formatDateTime(log.timestamp)}
							<span class="status-badge {statusClass[log.status]}">{statusLabel[log.status]}</span>
						</div>
					</div>
				</div>
				<div class="detail-body">{log.isMasked ? (log.maskedBody ?? log.body) : log.body}</div>
				{#if log.annotations.length > 0}
					<section class="detail-section">
						<h3>追記</h3>
						{#each log.annotations as ann (ann.id)}
							<div class="annotation">{ann.content}</div>
						{/each}
					</section>
				{/if}
				{#if log.comments.length > 0}
					<section class="detail-section">
						<h3>コメント</h3>
						{#each log.comments as comment (comment.id)}
							<div class="comment">{comment.content}</div>
						{/each}
					</section>
				{/if}
			</div>
		{:else}
			{@const tg = selected.item}
			{@const messages = getThreadMessages2(tg)}
			<div class="detail-panel">
				<div class="detail-header">
					<span class="source-icon lg">{sourceIcons[tg.source]}</span>
					<div>
						<h2 class="detail-title">{tg.parentMessage.title}</h2>
						<div class="detail-meta">
							{tg.messageCount}件のメッセージ · 最終更新: {formatDateTime(tg.latestMessageAt)}
						</div>
					</div>
				</div>
				<div class="thread-messages">
					{#each messages as msg, i (msg.id)}
						{#if i > 0}
							<hr class="thread-divider" />
						{/if}
						<div class="thread-message">
							<div class="message-meta">
								{#if msg.slackSender}{msg.slackSender} ·{/if}
								{#if msg.emailFrom}{msg.emailFrom} ·{/if}
								{formatDateTime(msg.timestamp)}
							</div>
							<div class="message-body">
								{msg.isMasked ? (msg.maskedBody ?? msg.body) : msg.body}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.inbox-layout {
		display: flex;
		gap: var(--space-lg);
		height: calc(100vh - 48px);
	}

	.inbox-left {
		width: 380px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		overflow: hidden;
	}

	.inbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.page-title {
		font-size: var(--font-size-xl);
		color: var(--color-text-heading);
		margin: 0;
	}

	.toggle-btn {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.toggle-btn.active {
		background: var(--color-brand);
		color: white;
	}

	.filter-bar {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
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

	.empty-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		flex: 1;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
	}

	.item-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.1s;
	}

	.item-row:hover {
		background: var(--color-brand-light);
	}

	.item-row.active {
		background: var(--color-brand-light);
		border-left: 3px solid var(--color-brand);
	}

	.item-row.unread .item-title {
		font-weight: 700;
	}

	.source-icon {
		font-size: 16px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.source-icon.lg {
		font-size: 24px;
	}

	.item-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.item-title {
		font-size: var(--font-size-md);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.status-badge {
		font-size: var(--font-size-xs);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
	}

	.status-pending {
		background: var(--color-accent-light);
		color: var(--color-warning);
	}

	.status-approved {
		background: #e6f4ea;
		color: var(--color-success);
	}

	.status-rejected {
		background: #fdecea;
		color: var(--color-error);
	}

	.thread-count {
		background: var(--color-brand-light);
		color: var(--color-brand);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		justify-content: center;
		padding: var(--space-sm) 0;
	}

	.page-btn {
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-border);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
	}

	.page-btn:disabled {
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.page-info {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	/* Detail panel */
	.inbox-detail {
		flex: 1;
		overflow-y: auto;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
	}

	.detail-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.detail-panel {
		padding: var(--space-lg);
	}

	.detail-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.detail-title {
		font-size: var(--font-size-lg);
		color: var(--color-text-heading);
		margin: 0 0 var(--space-xs);
	}

	.detail-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.detail-body {
		font-size: var(--font-size-md);
		line-height: 1.6;
		white-space: pre-wrap;
		color: var(--color-text);
	}

	.detail-section {
		margin-top: var(--space-lg);
	}

	.detail-section h3 {
		font-size: var(--font-size-md);
		color: var(--color-text-heading);
		margin: 0 0 var(--space-sm);
	}

	.annotation,
	.comment {
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-xs);
	}

	.thread-messages {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.thread-divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 0;
	}

	.thread-message {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.message-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.message-body {
		font-size: var(--font-size-md);
		line-height: 1.6;
		white-space: pre-wrap;
	}
</style>
