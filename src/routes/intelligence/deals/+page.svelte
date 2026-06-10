<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import {
		eventLogs,
		deals,
		tasks,
		addEventLog,
		updateDeal,
		addTask
	} from '$lib/intelligence/store.svelte.js';
	import { selectVisibleEventLogs } from '$lib/intelligence/store-logic.js';
	import { groupByThread, getThreadMessagesSorted } from '$lib/intelligence/thread-grouper.js';

	const threadGroups = $derived(groupByThread(eventLogs));
	import {
		generateSummary,
		detectPhaseChange,
		detectDataUpdate,
		generateTasks
	} from '$lib/intelligence/ai-engine.js';
	import { isBlank } from '$lib/intelligence/validation.js';
	import { VALIDATION, PHASE_LABELS, DEAL_PHASES } from '$lib/intelligence/constants.js';
	import { formatDate, formatDateTime } from '$lib/intelligence/format.js';
	import {
		sourceIcons,
		eventLogStatusLabel as logStatusLabel,
		eventLogStatusClass as logStatusClass,
		taskStatusLabel,
		priorityLabel
	} from '$lib/intelligence/ui-labels.js';
	import type {
		Deal,
		DealPhase,
		EventLog,
		DataUpdateProposal,
		ThreadGroup
	} from '$lib/intelligence/types.js';

	// ─── State ───────────────────────────────────────────────────────────────────

	let selectedDeal = $state<Deal | null>(null);

	// Detail: log view
	let isFlat = $state(false);
	type LogItem = { type: 'event'; item: EventLog } | { type: 'thread'; item: ThreadGroup };
	let selectedLogItem = $state<LogItem | null>(null);

	// Detail: phase change
	let phaseSelectOpen = $state(false);
	let pendingPhase = $state<DealPhase | ''>('');
	let phaseProposalDismissed = $state(false);

	// Detail: new log form
	let newLogOpen = $state(false);
	let newLogSource = $state<'minutes' | 'memo'>('memo');
	let newLogTitle = $state('');
	let newLogBody = $state('');
	let newLogError = $state('');
	let newLogNotice = $state('');

	// Detail: summary
	let summaryLoading = $state(false);
	let summaryError = $state('');

	// Detail: data update proposals
	let _dataUpdateProposals = $state<DataUpdateProposal[]>([]);
	let dismissedProposalKeys = new SvelteSet<string>();

	$effect(() => {
		const id = selectedDeal?.id;
		if (!id) {
			_dataUpdateProposals = [];
			return;
		}
		const relatedLogs = selectVisibleEventLogs(eventLogs).filter((l) => l.dealId === id);
		_dataUpdateProposals = relatedLogs.flatMap((l) => detectDataUpdate(l, deals));
	});

	// ─── Derived ─────────────────────────────────────────────────────────────────

	const syncedDeal = $derived(
		selectedDeal ? (deals.find((d) => d.id === selectedDeal!.id) ?? null) : null
	);

	const relatedLogs = $derived(
		syncedDeal
			? selectVisibleEventLogs(eventLogs)
					.filter((l) => l.dealId === syncedDeal.id)
					.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			: []
	);

	const relatedThreadGroups = $derived(
		syncedDeal
			? threadGroups
					.filter(
						(tg) =>
							tg.parentMessage.dealId === syncedDeal.id ||
							tg.replies.some((r) => r.dealId === syncedDeal.id)
					)
					.sort((a, b) => b.latestMessageAt.getTime() - a.latestMessageAt.getTime())
			: []
	);

	const relatedTasks = $derived(
		syncedDeal ? tasks.filter((t) => t.dealId === syncedDeal.id && !t.rejectedAt) : []
	);

	const phaseChangeProposal = $derived(
		syncedDeal && !phaseProposalDismissed ? detectPhaseChange(syncedDeal, eventLogs) : null
	);

	const summaryHasUpdates = $derived(
		syncedDeal?.summary
			? relatedLogs.some((l) => l.createdAt > syncedDeal!.summary!.generatedAt)
			: false
	);

	const visibleDataProposals = $derived(
		_dataUpdateProposals.filter((p) => !dismissedProposalKeys.has(`${p.dealId}-${p.field}`))
	);

	const newLogMaxLen = $derived(
		newLogSource === 'minutes' ? VALIDATION.EVENT_LOG_BODY_MAX : VALIDATION.MEMO_BODY_MAX
	);

	// ─── Helpers ─────────────────────────────────────────────────────────────────

	function getDealsInPhase(phase: DealPhase): Deal[] {
		return deals
			.filter((d) => d.phase === phase)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	// ─── Actions ─────────────────────────────────────────────────────────────────

	function selectDeal(deal: Deal) {
		selectedDeal = deal;
		selectedLogItem = null;
		isFlat = false;
		phaseSelectOpen = false;
		pendingPhase = '';
		phaseProposalDismissed = false;
		newLogOpen = false;
		newLogTitle = '';
		newLogBody = '';
		newLogError = '';
		newLogNotice = '';
		summaryError = '';
		dismissedProposalKeys.clear();
	}

	function handleManualPhaseChange() {
		if (!syncedDeal || !pendingPhase || pendingPhase === syncedDeal.phase) return;
		const newPhase = pendingPhase;
		const phaseLog: EventLog = {
			id: crypto.randomUUID(),
			source: 'memo',
			title: `フェーズ変更: ${PHASE_LABELS[syncedDeal.phase]} → ${PHASE_LABELS[newPhase]}`,
			body: `フェーズを手動変更しました。`,
			timestamp: new Date(),
			createdAt: new Date(),
			dealId: syncedDeal.id,
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: true,
			isDeleted: false
		};
		addEventLog(phaseLog);
		updateDeal(syncedDeal.id, { phase: newPhase }, { changeType: 'manual' });
		phaseSelectOpen = false;
		pendingPhase = '';
	}

	function handleProposalApprove() {
		if (!phaseChangeProposal || !syncedDeal) return;
		updateDeal(
			syncedDeal.id,
			{ phase: phaseChangeProposal.proposedPhase },
			{ changeType: 'ai_proposal_accepted' }
		);
		phaseProposalDismissed = true;
	}

	function handleGenerateSummary() {
		if (!syncedDeal) return;
		if (relatedLogs.length === 0) {
			summaryError = '関連するEvent_Logがありません';
			return;
		}
		summaryLoading = true;
		summaryError = '';
		try {
			const summary = generateSummary(syncedDeal, eventLogs);
			updateDeal(syncedDeal.id, { summary });
		} catch {
			summaryError = 'サマリー生成に失敗しました';
		} finally {
			summaryLoading = false;
		}
	}

	function handleDataUpdateApprove(proposal: DataUpdateProposal) {
		if (!syncedDeal) return;
		if (proposal.field === 'assignee') {
			updateDeal(syncedDeal.id, { assignee: proposal.proposedValue });
		}
		dismissedProposalKeys.add(`${proposal.dealId}-${proposal.field}`);
	}

	function handleDataUpdateReject(proposal: DataUpdateProposal) {
		dismissedProposalKeys.add(`${proposal.dealId}-${proposal.field}`);
	}

	function saveNewLog() {
		if (!syncedDeal) return;
		if (isBlank(newLogBody)) {
			newLogError = '本文を入力してください';
			return;
		}
		const log: EventLog = {
			id: crypto.randomUUID(),
			source: newLogSource,
			title:
				newLogTitle.trim() ||
				`${syncedDeal.name} ${newLogSource === 'minutes' ? '議事録' : 'メモ'}`,
			body: newLogBody,
			timestamp: new Date(),
			createdAt: new Date(),
			dealId: syncedDeal.id,
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: true,
			isDeleted: false
		};
		addEventLog(log);
		const newTasks = generateTasks(log, deals);
		for (const task of newTasks) {
			addTask(task);
		}
		newLogBody = '';
		newLogTitle = '';
		newLogError = '';
		newLogOpen = false;
		newLogNotice = `保存しました（AIタスク${newTasks.length}件を生成）`;
	}
</script>

<svelte:head>
	<title>案件 — Sales Intelligence</title>
</svelte:head>

<div class="deals-layout" class:has-selection={syncedDeal !== null}>
	<!-- Left: Deal list -->
	<div class="deals-left">
		<h1 class="page-title">案件</h1>
		{#each DEAL_PHASES as phase (phase)}
			{@const phaseDeals = getDealsInPhase(phase)}
			{#if phaseDeals.length > 0}
				<section class="phase-group">
					<h2 class="phase-heading">{PHASE_LABELS[phase]}</h2>
					{#each phaseDeals as deal (deal.id)}
						<button
							class="deal-row"
							class:active={syncedDeal?.id === deal.id}
							onclick={() => selectDeal(deal)}
						>
							<span class="deal-name">{deal.name}</span>
							<div class="deal-meta">
								<span class="deal-assignee">{deal.assignee}</span>
								<span class="deal-date">{formatDate(deal.updatedAt)}</span>
							</div>
						</button>
					{/each}
				</section>
			{/if}
		{/each}
		{#if deals.length === 0}
			<p class="empty-message">案件がありません</p>
		{/if}
	</div>

	<!-- Right: Deal detail -->
	<div class="deals-detail">
		{#if syncedDeal === null}
			<div class="detail-empty">
				<p>左のリストから案件を選択してください</p>
			</div>
		{:else}
			<div class="detail-panel">
				<button class="mobile-back" onclick={() => (selectedDeal = null)}>← 一覧へ戻る</button>
				<!-- Header -->
				<div class="detail-header">
					<div class="detail-title-row">
						<h2 class="detail-title">{syncedDeal.name}</h2>
						<span class="phase-badge">{PHASE_LABELS[syncedDeal.phase]}</span>
					</div>
					<div class="detail-sub">
						<span>担当者: <strong>{syncedDeal.assignee}</strong></span>
						<span class="detail-date">更新: {formatDateTime(syncedDeal.updatedAt)}</span>
					</div>
				</div>

				<!-- Phase change section (15.2) -->
				<section class="detail-section">
					<div class="section-header">
						<h3 class="section-title">フェーズ管理</h3>
						<button class="btn-secondary" onclick={() => (phaseSelectOpen = !phaseSelectOpen)}>
							{phaseSelectOpen ? 'キャンセル' : 'フェーズ変更'}
						</button>
					</div>

					{#if phaseSelectOpen}
						<div class="phase-selector">
							<select class="filter-select" bind:value={pendingPhase}>
								<option value="">フェーズを選択</option>
								{#each DEAL_PHASES as p (p)}
									<option value={p} disabled={p === syncedDeal.phase}>
										{PHASE_LABELS[p]}{p === syncedDeal.phase ? ' (現在)' : ''}
									</option>
								{/each}
							</select>
							<button
								class="btn-primary"
								disabled={!pendingPhase || pendingPhase === syncedDeal.phase}
								onclick={handleManualPhaseChange}>変更する</button
							>
						</div>
					{/if}

					{#if phaseChangeProposal}
						<div class="ai-proposal-card">
							<span class="ai-label">AIからの提案</span>
							<p class="proposal-body">
								<strong>{PHASE_LABELS[phaseChangeProposal.currentPhase]}</strong>
								→
								<strong>{PHASE_LABELS[phaseChangeProposal.proposedPhase]}</strong>
							</p>
							<p class="proposal-reason">{phaseChangeProposal.reasoning}</p>
							<div class="proposal-actions">
								<button class="btn-approve" onclick={handleProposalApprove}>承認</button>
								<button class="btn-reject" onclick={() => (phaseProposalDismissed = true)}
									>却下</button
								>
							</div>
						</div>
					{/if}
				</section>

				<!-- Summary section (15.3) -->
				<section class="detail-section">
					<div class="section-header">
						<h3 class="section-title">
							サマリー
							{#if summaryHasUpdates}
								<span class="updates-badge">更新あり</span>
							{/if}
						</h3>
						<button class="btn-secondary" disabled={summaryLoading} onclick={handleGenerateSummary}>
							{summaryLoading ? '生成中…' : 'サマリー生成'}
						</button>
					</div>
					{#if summaryError}
						<p class="error-text">{summaryError}</p>
					{/if}
					{#if syncedDeal.summary}
						<div class="summary-box">
							<p class="summary-text">{syncedDeal.summary.text}</p>
							<p class="summary-meta">生成: {formatDateTime(syncedDeal.summary.generatedAt)}</p>
						</div>
					{:else}
						<p class="empty-message">サマリーはまだ生成されていません</p>
					{/if}
				</section>

				<!-- Data update proposals (15.3) -->
				{#if visibleDataProposals.length > 0}
					<section class="detail-section">
						<h3 class="section-title">AI更新提案</h3>
						{#each visibleDataProposals as proposal, i (`${proposal.dealId}-${proposal.field}-${i}`)}
							<div class="ai-proposal-card">
								<span class="ai-label">データ更新提案</span>
								<p class="proposal-body">
									<strong>{proposal.field}</strong>:
									<span class="proposal-current">{proposal.currentValue}</span>
									→
									<strong>{proposal.proposedValue}</strong>
								</p>
								<div class="proposal-actions">
									<button class="btn-approve" onclick={() => handleDataUpdateApprove(proposal)}
										>承認</button
									>
									<button class="btn-reject" onclick={() => handleDataUpdateReject(proposal)}
										>却下</button
									>
								</div>
							</div>
						{/each}
					</section>
				{/if}

				<!-- Related Event Logs (15.1) -->
				<section class="detail-section">
					<div class="section-header">
						<h3 class="section-title">活動記録 ({relatedLogs.length}件)</h3>
						<div class="section-actions">
							<button
								class="btn-toggle"
								class:active={isFlat}
								onclick={() => {
									isFlat = !isFlat;
									selectedLogItem = null;
								}}
							>
								{isFlat ? 'スレッド表示' : 'フラット表示'}
							</button>
							<button
								class="btn-secondary"
								onclick={() => {
									newLogOpen = !newLogOpen;
									newLogNotice = '';
								}}
							>
								{newLogOpen ? 'キャンセル' : '+ 新規記録'}
							</button>
						</div>
					</div>

					<!-- New log form -->
					{#if newLogOpen}
						<div class="new-log-form">
							<div class="form-row">
								<span class="form-label">種別</span>
								<div class="radio-group">
									<label class="radio-label">
										<input type="radio" bind:group={newLogSource} value="minutes" />
										議事録
									</label>
									<label class="radio-label">
										<input type="radio" bind:group={newLogSource} value="memo" />
										メモ
									</label>
								</div>
							</div>
							<div class="form-row">
								<label class="form-label" for="new-log-title">タイトル (任意)</label>
								<input
									id="new-log-title"
									class="form-input"
									type="text"
									placeholder="タイトルを入力"
									bind:value={newLogTitle}
								/>
							</div>
							<div class="form-row">
								<label class="form-label" for="new-log-body">
									本文 ({newLogBody.length}/{newLogMaxLen})
								</label>
								<textarea
									id="new-log-body"
									class="form-textarea"
									placeholder="内容を入力してください"
									maxlength={newLogMaxLen}
									bind:value={newLogBody}
								></textarea>
							</div>
							{#if newLogError}
								<p class="error-text">{newLogError}</p>
							{/if}
							<button class="btn-primary" onclick={saveNewLog}>保存</button>
						</div>
					{/if}

					{#if newLogNotice}
						<p class="save-notice">{newLogNotice}</p>
					{/if}

					<!-- Log list -->
					{#if relatedLogs.length === 0}
						<p class="empty-message">関連する活動記録がありません</p>
					{:else}
						<div class="log-list-wrapper">
							<ul class="log-list">
								{#if isFlat}
									{#each relatedLogs as log (log.id)}
										<li>
											<button
												class="log-row"
												class:active={selectedLogItem?.type === 'event' &&
													selectedLogItem.item.id === log.id}
												onclick={() => (selectedLogItem = { type: 'event', item: log })}
											>
												<span class="source-icon">{sourceIcons[log.source]}</span>
												<div class="log-info">
													<span class="log-title">{log.title.slice(0, 50)}</span>
													<span class="log-meta">
														{formatDateTime(log.timestamp)}
														<span class="status-badge {logStatusClass[log.status]}">
															{logStatusLabel[log.status]}
														</span>
													</span>
												</div>
											</button>
										</li>
									{/each}
								{:else}
									{#each relatedThreadGroups as tg (tg.id)}
										<li>
											<button
												class="log-row"
												class:active={selectedLogItem?.type === 'thread' &&
													selectedLogItem.item.id === tg.id}
												onclick={() => (selectedLogItem = { type: 'thread', item: tg })}
											>
												<span class="source-icon">{sourceIcons[tg.source]}</span>
												<div class="log-info">
													<span class="log-title">{tg.parentMessage.title.slice(0, 50)}</span>
													<span class="log-meta">
														{formatDateTime(tg.latestMessageAt)}
														<span class="thread-count">{tg.messageCount}件</span>
													</span>
												</div>
											</button>
										</li>
									{/each}
									{#each relatedLogs.filter((l) => l.source !== 'slack' && l.source !== 'email') as log (log.id)}
										<li>
											<button
												class="log-row"
												class:active={selectedLogItem?.type === 'event' &&
													selectedLogItem.item.id === log.id}
												onclick={() => (selectedLogItem = { type: 'event', item: log })}
											>
												<span class="source-icon">{sourceIcons[log.source]}</span>
												<div class="log-info">
													<span class="log-title">{log.title.slice(0, 50)}</span>
													<span class="log-meta">
														{formatDateTime(log.timestamp)}
														<span class="status-badge {logStatusClass[log.status]}">
															{logStatusLabel[log.status]}
														</span>
													</span>
												</div>
											</button>
										</li>
									{/each}
								{/if}
							</ul>

							<!-- Log detail pane -->
							{#if selectedLogItem}
								<div class="log-detail">
									{#if selectedLogItem.type === 'event'}
										{@const log = selectedLogItem.item}
										<div class="log-detail-header">
											<span class="source-icon lg">{sourceIcons[log.source]}</span>
											<div>
												<p class="log-detail-title">{log.title}</p>
												<p class="log-detail-meta">
													{formatDateTime(log.timestamp)}
													<span class="status-badge {logStatusClass[log.status]}">
														{logStatusLabel[log.status]}
													</span>
												</p>
											</div>
										</div>
										<p class="log-detail-body">
											{log.isMasked ? (log.maskedBody ?? log.body) : log.body}
										</p>
									{:else}
										{@const tg = selectedLogItem.item}
										<div class="log-detail-header">
											<span class="source-icon lg">{sourceIcons[tg.source]}</span>
											<div>
												<p class="log-detail-title">{tg.parentMessage.title}</p>
												<p class="log-detail-meta">
													{tg.messageCount}件 · {formatDateTime(tg.latestMessageAt)}
												</p>
											</div>
										</div>
										<div class="thread-messages">
											{#each getThreadMessagesSorted(tg) as msg, i (msg.id)}
												{#if i > 0}<hr class="thread-divider" />{/if}
												<div class="thread-msg">
													<p class="thread-msg-meta">
														{#if msg.slackSender}{msg.slackSender} ·{/if}
														{#if msg.emailFrom}{msg.emailFrom} ·{/if}
														{formatDateTime(msg.timestamp)}
													</p>
													<p class="thread-msg-body">
														{msg.isMasked ? (msg.maskedBody ?? msg.body) : msg.body}
													</p>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</section>

				<!-- Related Tasks (15.1) -->
				<section class="detail-section">
					<h3 class="section-title">関連タスク ({relatedTasks.length}件)</h3>
					{#if relatedTasks.length === 0}
						<p class="empty-message">関連タスクがありません</p>
					{:else}
						<ul class="task-list">
							{#each relatedTasks as task (task.id)}
								<li class="task-row">
									<span class="task-title">{task.title}</span>
									<div class="task-badges">
										{#if task.isProposal}
											<span class="badge-proposal">AI提案</span>
										{/if}
										<span class="badge-status status-{task.status}">
											{taskStatusLabel[task.status]}
										</span>
										<span class="badge-priority priority-{task.priority}">
											{priorityLabel[task.priority]}
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<!-- Phase history timeline (15.1) -->
				<section class="detail-section">
					<h3 class="section-title">フェーズ遷移履歴</h3>
					{#if syncedDeal.phaseHistory.length === 0}
						<p class="empty-message">フェーズ遷移の履歴がありません</p>
					{:else}
						<ol class="phase-timeline">
							{#each [...syncedDeal.phaseHistory].sort((a, b) => b.transitionAt.getTime() - a.transitionAt.getTime()) as h, i (i)}
								<li class="timeline-item">
									<div class="timeline-marker"></div>
									<div class="timeline-content">
										<p class="timeline-phases">
											{PHASE_LABELS[h.fromPhase]} → <strong>{PHASE_LABELS[h.toPhase]}</strong>
										</p>
										<p class="timeline-meta">
											{formatDateTime(h.transitionAt)} · {h.operator}
											{#if h.changeType === 'ai_proposal_accepted'}
												<span class="ai-tag">AI提案承認</span>
											{/if}
										</p>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</section>
			</div>
		{/if}
	</div>
</div>

<style>
	.deals-layout {
		display: flex;
		gap: var(--space-lg);
		height: calc(100vh - 48px);
	}

	/* ─── Left panel ─────────────────────────────────────────────────────────── */

	.deals-left {
		width: 280px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		overflow-y: auto;
	}

	/* Mobile: collapse master-detail into a single column. The deal list and the
	   detail swap based on whether a deal is selected (driven by .has-selection). */
	.mobile-back {
		display: none;
	}

	@media (max-width: 767px) {
		.deals-layout {
			height: auto;
			gap: 0;
		}

		.deals-left {
			width: 100%;
		}

		.deals-detail {
			display: none;
		}

		.deals-layout.has-selection .deals-left {
			display: none;
		}

		.deals-layout.has-selection .deals-detail {
			display: block;
		}

		.mobile-back {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			margin-bottom: var(--space-sm);
			padding: 0;
			background: none;
			border: none;
			color: var(--color-brand);
			font-size: var(--font-size-sm);
			cursor: pointer;
		}
	}

	.page-title {
		font-size: var(--font-size-xl);
		color: var(--color-text-heading);
		margin: 0 0 var(--space-sm);
	}

	.phase-group {
		margin-bottom: var(--space-sm);
	}

	.phase-heading {
		font-size: var(--font-size-xs);
		font-weight: 700;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0 0 4px;
		letter-spacing: 0.05em;
	}

	.deal-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		text-align: left;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
		margin-bottom: 4px;
		transition: background 0.1s;
	}

	.deal-row:hover {
		background: var(--color-brand-light);
	}

	.deal-row.active {
		background: var(--color-brand-light);
		border-color: var(--color-brand);
	}

	.deal-name {
		font-size: var(--font-size-md);
		color: var(--color-text);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.deal-meta {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.empty-message {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0;
	}

	/* ─── Right panel ────────────────────────────────────────────────────────── */

	.deals-detail {
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
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Header */
	.detail-header {
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border);
	}

	.detail-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.detail-title {
		font-size: var(--font-size-xl);
		color: var(--color-text-heading);
		margin: 0;
	}

	.phase-badge {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 2px var(--space-sm);
		background: var(--color-brand-light);
		color: var(--color-brand);
		border-radius: 10px;
		white-space: nowrap;
	}

	.detail-sub {
		display: flex;
		gap: var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.detail-date {
		margin-left: auto;
	}

	/* Sections */
	.detail-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: var(--font-size-md);
		font-weight: 700;
		color: var(--color-text-heading);
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.section-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.updates-badge {
		font-size: var(--font-size-xs);
		font-weight: 600;
		padding: 1px 6px;
		background: var(--color-accent-light);
		color: var(--color-warning);
		border-radius: 8px;
	}

	/* Buttons */
	.btn-primary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-brand);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-primary:disabled {
		background: var(--color-border);
		cursor: not-allowed;
	}

	.btn-secondary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-secondary:disabled {
		border-color: var(--color-border);
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.btn-toggle {
		font-size: var(--font-size-xs);
		padding: 3px var(--space-sm);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-toggle.active {
		background: var(--color-brand);
		color: white;
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

	/* Phase selector */
	.phase-selector {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.filter-select {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
		color: var(--color-text);
	}

	/* AI proposal card */
	.ai-proposal-card {
		background: var(--color-brand-light);
		border: 1px solid #c2d9f0;
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.ai-label {
		font-size: var(--font-size-xs);
		font-weight: 700;
		color: var(--color-brand);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.proposal-body {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		margin: 0;
	}

	.proposal-current {
		color: var(--color-text-muted);
		text-decoration: line-through;
	}

	.proposal-reason {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.proposal-actions {
		display: flex;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
	}

	/* Summary */
	.summary-box {
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
	}

	.summary-text {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		white-space: pre-wrap;
		margin: 0 0 var(--space-xs);
	}

	.summary-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.error-text {
		font-size: var(--font-size-sm);
		color: var(--color-error);
		margin: 0;
	}

	.save-notice {
		font-size: var(--font-size-sm);
		color: var(--color-success);
		background: #e6f4ea;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		margin: 0;
	}

	/* New log form */
	.new-log-form {
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.form-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.form-input {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
	}

	.form-textarea {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
		resize: vertical;
		min-height: 100px;
		font-family: var(--font-family);
	}

	.radio-group {
		display: flex;
		gap: var(--space-md);
	}

	.radio-label {
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
	}

	/* Log list */
	.log-list-wrapper {
		display: flex;
		gap: var(--space-md);
	}

	.log-list {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 260px;
		flex-shrink: 0;
		max-height: 280px;
		overflow-y: auto;
		background: var(--color-bg);
		border-radius: var(--radius-sm);
	}

	@media (max-width: 767px) {
		.log-list-wrapper {
			flex-direction: column;
		}

		.log-list {
			width: 100%;
			max-height: 220px;
		}
	}

	.log-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.1s;
	}

	.log-row:hover {
		background: var(--color-brand-light);
	}

	.log-row.active {
		background: var(--color-brand-light);
		border-left: 2px solid var(--color-brand);
	}

	.source-icon {
		font-size: 14px;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.source-icon.lg {
		font-size: 20px;
	}

	.log-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.log-title {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.log-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.log-detail {
		flex: 1;
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		max-height: 280px;
		overflow-y: auto;
	}

	.log-detail-header {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-start;
		margin-bottom: var(--space-sm);
	}

	.log-detail-title {
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text-heading);
		margin: 0 0 2px;
	}

	.log-detail-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.log-detail-body {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		white-space: pre-wrap;
		line-height: 1.6;
		margin: 0;
	}

	.thread-messages {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.thread-divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 0;
	}

	.thread-msg {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.thread-msg-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.thread-msg-body {
		font-size: var(--font-size-sm);
		line-height: 1.6;
		white-space: pre-wrap;
		margin: 0;
	}

	/* Status / priority badges */
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
		font-size: var(--font-size-xs);
	}

	/* Tasks in deal detail */
	.task-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.task-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.task-title {
		flex: 1;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.task-badges {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.badge-proposal {
		font-size: var(--font-size-xs);
		padding: 1px 5px;
		border-radius: 8px;
		background: var(--color-brand-light);
		color: var(--color-brand);
		font-weight: 600;
	}

	.badge-status {
		font-size: var(--font-size-xs);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
	}

	.status-not_started {
		background: var(--color-bg);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.status-in_progress {
		background: var(--color-accent-light);
		color: var(--color-warning);
	}

	.status-completed {
		background: #e6f4ea;
		color: var(--color-success);
	}

	.badge-priority {
		font-size: var(--font-size-xs);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
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

	/* Phase timeline */
	.phase-timeline {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		border-left: 2px solid var(--color-border);
		padding-left: var(--space-md);
	}

	.timeline-item {
		position: relative;
		padding-bottom: var(--space-md);
	}

	.timeline-item:last-child {
		padding-bottom: 0;
	}

	.timeline-marker {
		position: absolute;
		left: calc(-1 * var(--space-md) - 5px);
		top: 4px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-brand);
	}

	.timeline-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.timeline-phases {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		margin: 0;
	}

	.timeline-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.ai-tag {
		font-size: var(--font-size-xs);
		padding: 1px 5px;
		border-radius: 8px;
		background: var(--color-brand-light);
		color: var(--color-brand);
		font-weight: 600;
	}
</style>
