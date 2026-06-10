<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import {
		eventLogs,
		deals,
		tasks,
		updateEventLog,
		deleteEventLog,
		rejectEventLog,
		addAnnotation,
		addComment,
		addEventLog,
		addTask
	} from '$lib/intelligence/store.svelte.js';
	import { groupByThread, getThreadMessages } from '$lib/intelligence/thread-grouper.js';
	import { selectVisibleEventLogs } from '$lib/intelligence/store-logic.js';
	import { filterEventLogs, type EventLogFilter } from '$lib/intelligence/filters.js';
	import { search, generateTasks } from '$lib/intelligence/ai-engine.js';
	import { isBlank } from '$lib/intelligence/validation.js';
	import { VALIDATION, CURRENT_USER } from '$lib/intelligence/constants.js';
	import type { DataSource, EventLog, SearchResult, ThreadGroup } from '$lib/intelligence/types.js';

	type SelectedItem = { type: 'event'; item: EventLog } | { type: 'thread'; item: ThreadGroup };

	const threadGroups = $derived(groupByThread(eventLogs));
	const visibleLogs = $derived(selectVisibleEventLogs(eventLogs));

	// ─── View state ────────────────────────────────────────────────────────────
	let isFlat = $state(false);
	let currentPage = $state(0);
	let selected = $state<SelectedItem | null>(null);

	// ─── Filter state (18.2) ─────────────────────────────────────────────────────
	let selectedSources = new SvelteSet<DataSource>();
	let showAdvancedFilter = $state(false);
	let filterStartDate = $state('');
	let filterEndDate = $state('');
	let filterDealId = $state('');
	let filterKeyword = $state('');

	// ─── Search state (18.1) ──────────────────────────────────────────────────────
	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let searchSubmitted = $state(false);
	let searchPrompt = $state('');

	// ─── New log form state (16.1) ─────────────────────────────────────────────────
	let showNewLog = $state(false);
	let newLogSource = $state<'minutes' | 'memo'>('memo');
	let newLogTitle = $state('');
	let newLogBody = $state('');
	let newLogError = $state('');
	let saveNotice = $state('');

	// ─── Detail edit state (16.2) ───────────────────────────────────────────────────
	let editMode = $state<'none' | 'annotation' | 'comment' | 'reject'>('none');
	let annotationInput = $state('');
	let commentInput = $state('');
	let rejectReason = $state('');
	let editError = $state('');
	let showDeleteConfirm = $state(false);

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

	const searchTypeIcon: Record<SearchResult['type'], string> = {
		event_log: '📥',
		deal: '💼',
		task: '✅'
	};

	const searchTypeLabel: Record<SearchResult['type'], string> = {
		event_log: 'Event Log',
		deal: '案件',
		task: 'タスク'
	};

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

	function toggleSource(source: DataSource) {
		if (selectedSources.has(source)) {
			selectedSources.delete(source);
		} else {
			selectedSources.add(source);
		}
		currentPage = 0;
	}

	// ─── Compound filter (18.2) ─────────────────────────────────────────────────────
	const activeFilter = $derived<EventLogFilter>({
		startDate: filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null,
		endDate: filterEndDate ? new Date(filterEndDate + 'T23:59:59.999') : null,
		sources: Array.from(selectedSources),
		dealId: filterDealId || null,
		keyword: filterKeyword
	});

	const anyFilterActive = $derived(
		selectedSources.size > 0 ||
			filterStartDate !== '' ||
			filterEndDate !== '' ||
			filterDealId !== '' ||
			filterKeyword.trim() !== ''
	);

	const passingLogs = $derived(filterEventLogs(visibleLogs, activeFilter));
	const passingIds = $derived(new SvelteSet(passingLogs.map((l) => l.id)));

	const filteredFlat = $derived(
		[...passingLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
	);

	const filteredThreads = $derived(
		threadGroups.filter(
			(tg) => passingIds.has(tg.parentMessage.id) || tg.replies.some((r) => passingIds.has(r.id))
		)
	);

	const standaloneFlat = $derived(
		filteredFlat.filter((l) => l.source !== 'slack' && l.source !== 'email')
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

	const standalonePageItems = $derived(
		standaloneFlat.slice(
			currentPage * VALIDATION.PAGE_SIZE,
			(currentPage + 1) * VALIDATION.PAGE_SIZE
		)
	);

	const totalItems = $derived(isFlat ? filteredFlat.length : filteredThreads.length);
	const totalPages = $derived(Math.ceil(totalItems / VALIDATION.PAGE_SIZE));

	function clearFilters() {
		selectedSources.clear();
		filterStartDate = '';
		filterEndDate = '';
		filterDealId = '';
		filterKeyword = '';
		currentPage = 0;
	}

	// ─── Search (18.1) ──────────────────────────────────────────────────────────────
	function runSearch() {
		if (isBlank(searchQuery)) {
			searchSubmitted = false;
			searchResults = [];
			searchPrompt = '検索キーワードを入力してください';
			return;
		}
		searchPrompt = '';
		searchResults = search(searchQuery, eventLogs, deals, tasks);
		searchSubmitted = true;
	}

	function clearSearch() {
		searchQuery = '';
		searchResults = [];
		searchSubmitted = false;
		searchPrompt = '';
	}

	function openSearchResult(result: SearchResult) {
		if (result.type !== 'event_log') return;
		const log = eventLogs.find((l) => l.id === result.id);
		if (log) selectEvent(log);
	}

	// ─── Selection ────────────────────────────────────────────────────────────────
	function resetEditState() {
		editMode = 'none';
		annotationInput = '';
		commentInput = '';
		rejectReason = '';
		editError = '';
		showDeleteConfirm = false;
	}

	function selectEvent(log: EventLog) {
		selected = { type: 'event', item: log };
		resetEditState();
		if (!log.isRead) {
			updateEventLog(log.id, { isRead: true });
		}
	}

	function selectThread(tg: ThreadGroup) {
		selected = { type: 'thread', item: tg };
		resetEditState();
		if (!tg.parentMessage.isRead) {
			updateEventLog(tg.parentMessage.id, { isRead: true });
		}
	}

	// Keep the detail panel reactive to store updates (annotations / comments / status)
	const selectedEventLog = $derived(
		selected?.type === 'event' ? (eventLogs.find((l) => l.id === selected!.item.id) ?? null) : null
	);

	const selectedThread = $derived(
		selected?.type === 'thread'
			? (threadGroups.find((t) => t.id === selected!.item.id) ?? null)
			: null
	);

	// ─── Detail edit actions (16.2) ──────────────────────────────────────────────────
	function openEdit(mode: 'annotation' | 'comment' | 'reject') {
		editMode = editMode === mode ? 'none' : mode;
		editError = '';
		showDeleteConfirm = false;
	}

	function submitAnnotation() {
		if (!selectedEventLog) return;
		if (isBlank(annotationInput)) {
			editError = '追記内容を入力してください';
			return;
		}
		addAnnotation(selectedEventLog.id, annotationInput, { operator: CURRENT_USER });
		annotationInput = '';
		resetEditState();
	}

	function submitComment() {
		if (!selectedEventLog) return;
		if (isBlank(commentInput)) {
			editError = 'コメントを入力してください';
			return;
		}
		addComment(selectedEventLog.id, commentInput, { operator: CURRENT_USER });
		commentInput = '';
		resetEditState();
	}

	function submitReject() {
		if (!selectedEventLog) return;
		if (isBlank(rejectReason)) {
			editError = '却下理由を入力してください';
			return;
		}
		rejectEventLog(selectedEventLog.id, rejectReason, CURRENT_USER);
		rejectReason = '';
		resetEditState();
	}

	function confirmDelete() {
		if (!selectedEventLog) return;
		deleteEventLog(selectedEventLog.id);
		selected = null;
		resetEditState();
	}

	// ─── New log (16.1) ───────────────────────────────────────────────────────────
	const newLogMaxLen = $derived(
		newLogSource === 'minutes' ? VALIDATION.EVENT_LOG_BODY_MAX : VALIDATION.MEMO_BODY_MAX
	);

	function saveNewLog() {
		if (isBlank(newLogBody)) {
			newLogError = '本文を入力してください';
			return;
		}
		const log: EventLog = {
			id: crypto.randomUUID(),
			source: newLogSource,
			title: newLogTitle.trim() || (newLogSource === 'minutes' ? '議事録' : 'メモ'),
			body: newLogBody.slice(0, newLogMaxLen),
			timestamp: new Date(),
			createdAt: new Date(),
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: true,
			isDeleted: false
		};
		addEventLog(log);
		// AI Engine によるタスク自動生成
		const newTasks = generateTasks(log, deals);
		for (const task of newTasks) {
			addTask(task);
		}
		newLogTitle = '';
		newLogBody = '';
		newLogError = '';
		showNewLog = false;
		saveNotice = `保存しました（AIタスク${newTasks.length}件を生成）`;
	}

	function formatDateTime(date: Date): string {
		return date.toLocaleString('ja-JP', {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getThreadMessagesSorted(tg: ThreadGroup): EventLog[] {
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
			<div class="header-actions">
				<button class="toggle-btn" onclick={() => (showNewLog = !showNewLog)}>
					{showNewLog ? 'キャンセル' : '+ 新規記録'}
				</button>
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
		</div>

		<!-- AI Search (18.1) -->
		<div class="search-bar">
			<input
				class="search-input"
				type="search"
				placeholder="AI検索（議事録・メール・案件・タスクを横断）"
				bind:value={searchQuery}
				onkeydown={(e) => {
					if (e.key === 'Enter') runSearch();
				}}
			/>
			<button class="search-btn" onclick={runSearch}>検索</button>
			{#if searchSubmitted || searchPrompt}
				<button class="search-clear" onclick={clearSearch}>クリア</button>
			{/if}
		</div>

		<!-- New log form (16.1) -->
		{#if showNewLog}
			<div class="new-log-form">
				<div class="form-row">
					<span class="form-label">種別</span>
					<div class="radio-group">
						<label class="radio-label">
							<input type="radio" bind:group={newLogSource} value="minutes" /> 議事録
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={newLogSource} value="memo" /> メモ
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
					<label class="form-label" for="new-log-body"
						>本文 ({newLogBody.length}/{newLogMaxLen})</label
					>
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

		{#if saveNotice}
			<p class="save-notice">{saveNotice}</p>
		{/if}

		{#if searchSubmitted}
			<!-- Search results (18.1) -->
			<div class="search-results">
				{#if searchResults.length === 0}
					<p class="empty-message">該当する結果がありません</p>
				{:else}
					<ul class="item-list">
						{#each searchResults as result (result.type + result.id)}
							<li>
								<button
									class="item-row"
									class:clickable={result.type === 'event_log'}
									onclick={() => openSearchResult(result)}
								>
									<span class="source-icon">{searchTypeIcon[result.type]}</span>
									<div class="item-body">
										<span class="item-title">{result.title.slice(0, 50)}</span>
										<span class="item-excerpt">{result.excerpt}</span>
										<span class="item-meta">
											<span class="type-tag">{searchTypeLabel[result.type]}</span>
											<span class="score-tag">関連度 {result.relevanceScore}</span>
										</span>
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{:else}
			{#if searchPrompt}
				<p class="empty-message">{searchPrompt}</p>
			{/if}

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
				<button
					class="filter-chip filter-toggle"
					class:selected={showAdvancedFilter}
					onclick={() => (showAdvancedFilter = !showAdvancedFilter)}
				>
					絞り込み
				</button>
			</div>

			<!-- Advanced compound filter (18.2) -->
			{#if showAdvancedFilter}
				<div class="advanced-filter">
					<div class="form-row">
						<label class="form-label" for="filter-start">期間</label>
						<div class="date-range">
							<input
								id="filter-start"
								class="form-input"
								type="date"
								bind:value={filterStartDate}
								onchange={() => (currentPage = 0)}
							/>
							<span class="date-sep">〜</span>
							<input
								class="form-input"
								type="date"
								bind:value={filterEndDate}
								onchange={() => (currentPage = 0)}
							/>
						</div>
					</div>
					<div class="form-row">
						<label class="form-label" for="filter-deal">案件</label>
						<select
							id="filter-deal"
							class="form-input"
							bind:value={filterDealId}
							onchange={() => (currentPage = 0)}
						>
							<option value="">すべての案件</option>
							{#each deals as deal (deal.id)}
								<option value={deal.id}>{deal.name}</option>
							{/each}
						</select>
					</div>
					<div class="form-row">
						<label class="form-label" for="filter-keyword">キーワード（本文部分一致）</label>
						<input
							id="filter-keyword"
							class="form-input"
							type="text"
							placeholder="キーワードを入力"
							bind:value={filterKeyword}
							oninput={() => (currentPage = 0)}
						/>
					</div>
					{#if anyFilterActive}
						<button class="search-clear" onclick={clearFilters}>フィルタをクリア</button>
					{/if}
				</div>
			{/if}

			<!-- List -->
			{#if totalItems === 0}
				<p class="empty-message">
					{anyFilterActive ? '該当するデータがありません' : '表示するEvent_Logがありません'}
				</p>
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
					{#each standalonePageItems as log (log.id)}
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
		{/if}
	</div>

	<!-- Detail Panel -->
	<div class="inbox-detail">
		{#if selected === null}
			<div class="detail-empty">
				<p>左のリストから項目を選択してください</p>
			</div>
		{:else if selectedEventLog}
			{@const log = selectedEventLog}
			<div class="detail-panel">
				<div class="detail-header">
					<span class="source-icon lg">{sourceIcons[log.source]}</span>
					<div>
						<h2 class="detail-title">{log.title}</h2>
						<div class="detail-meta">
							{formatDateTime(log.timestamp)}
							<span class="status-badge {statusClass[log.status]}">{statusLabel[log.status]}</span>
							{#if log.dealId}
								{@const deal = deals.find((d) => d.id === log.dealId)}
								{#if deal}<span class="deal-tag">{deal.name}</span>{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Action toolbar (16.2) -->
				<div class="detail-actions">
					<button class="action-btn" onclick={() => openEdit('annotation')}>追記</button>
					<button class="action-btn" onclick={() => openEdit('comment')}>コメント</button>
					{#if log.status !== 'rejected'}
						<button class="action-btn action-warn" onclick={() => openEdit('reject')}>却下</button>
					{:else}
						<span class="rejected-label">却下済み</span>
					{/if}
					<button
						class="action-btn action-danger"
						onclick={() => {
							showDeleteConfirm = true;
							editMode = 'none';
						}}
					>
						削除
					</button>
				</div>

				{#if showDeleteConfirm}
					<div class="confirm-box">
						<p>このEvent_Logを削除しますか？（論理削除されます）</p>
						<div class="confirm-actions">
							<button class="btn-danger" onclick={confirmDelete}>削除する</button>
							<button class="btn-secondary" onclick={() => (showDeleteConfirm = false)}
								>キャンセル</button
							>
						</div>
					</div>
				{/if}

				{#if editMode === 'annotation'}
					<div class="edit-form">
						<label class="form-label" for="annotation-input"
							>追記 ({annotationInput.length}/{VALIDATION.ANNOTATION_MAX})</label
						>
						<textarea
							id="annotation-input"
							class="form-textarea sm"
							maxlength={VALIDATION.ANNOTATION_MAX}
							bind:value={annotationInput}
						></textarea>
						{#if editError}<p class="error-text">{editError}</p>{/if}
						<button class="btn-primary" onclick={submitAnnotation}>追記する</button>
					</div>
				{:else if editMode === 'comment'}
					<div class="edit-form">
						<label class="form-label" for="comment-input"
							>コメント ({commentInput.length}/{VALIDATION.COMMENT_MAX})</label
						>
						<textarea
							id="comment-input"
							class="form-textarea sm"
							maxlength={VALIDATION.COMMENT_MAX}
							bind:value={commentInput}
						></textarea>
						{#if editError}<p class="error-text">{editError}</p>{/if}
						<button class="btn-primary" onclick={submitComment}>コメントする</button>
					</div>
				{:else if editMode === 'reject'}
					<div class="edit-form">
						<label class="form-label" for="reject-input">却下理由（必須）</label>
						<textarea id="reject-input" class="form-textarea sm" bind:value={rejectReason}
						></textarea>
						{#if editError}<p class="error-text">{editError}</p>{/if}
						<button class="btn-danger" onclick={submitReject}>却下する</button>
					</div>
				{/if}

				<div class="detail-body">{log.isMasked ? (log.maskedBody ?? log.body) : log.body}</div>

				{#if log.status === 'rejected' && log.rejectionReason}
					<div class="rejection-note">
						<strong>却下理由:</strong>
						{log.rejectionReason}
						{#if log.rejectedBy}<span class="rejection-meta">（{log.rejectedBy}）</span>{/if}
					</div>
				{/if}

				{#if log.annotations.length > 0}
					<section class="detail-section">
						<h3>追記</h3>
						{#each log.annotations as ann (ann.id)}
							<div class="annotation">
								<p class="entry-content">{ann.content}</p>
								<p class="entry-meta">{ann.author} · {formatDateTime(ann.createdAt)}</p>
							</div>
						{/each}
					</section>
				{/if}
				{#if log.comments.length > 0}
					<section class="detail-section">
						<h3>コメント</h3>
						{#each log.comments as comment (comment.id)}
							<div class="comment">
								<p class="entry-content">{comment.content}</p>
								<p class="entry-meta">{comment.author} · {formatDateTime(comment.createdAt)}</p>
							</div>
						{/each}
					</section>
				{/if}
			</div>
		{:else if selectedThread}
			{@const tg = selectedThread}
			{@const messages = getThreadMessagesSorted(tg)}
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
		overflow-y: auto;
	}

	.inbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-actions {
		display: flex;
		gap: var(--space-xs);
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

	/* Search */
	.search-bar {
		display: flex;
		gap: var(--space-xs);
	}

	.search-input {
		flex: 1;
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
	}

	.search-btn {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		border: none;
		background: var(--color-brand);
		color: white;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.search-clear {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		background: white;
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
	}

	.item-excerpt {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.type-tag {
		background: var(--color-brand-light);
		color: var(--color-brand);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
	}

	.score-tag {
		background: var(--color-bg);
		color: var(--color-text-muted);
		padding: 1px 5px;
		border-radius: 8px;
		font-weight: 600;
	}

	.item-row.clickable:hover {
		background: var(--color-brand-light);
	}

	/* Filter */
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

	.filter-toggle {
		margin-left: auto;
	}

	.advanced-filter {
		background: var(--color-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.date-range {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.date-sep {
		color: var(--color-text-muted);
	}

	/* Forms */
	.new-log-form,
	.edit-form {
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

	.date-range .form-input {
		flex: 1;
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

	.form-textarea.sm {
		min-height: 64px;
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

	.btn-primary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-brand);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		align-self: flex-start;
	}

	.btn-secondary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-border);
		background: white;
		color: var(--color-text);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-danger {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-error);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		align-self: flex-start;
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
		margin-bottom: var(--space-md);
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

	.deal-tag {
		background: var(--color-brand-light);
		color: var(--color-brand);
		padding: 1px 6px;
		border-radius: 8px;
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	/* Detail actions */
	.detail-actions {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.action-btn {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.action-btn:hover {
		background: var(--color-brand-light);
	}

	.action-warn {
		border-color: var(--color-warning);
		color: var(--color-warning);
	}

	.action-danger {
		border-color: var(--color-error);
		color: var(--color-error);
	}

	.rejected-label {
		font-size: var(--font-size-xs);
		padding: 2px 6px;
		border-radius: 8px;
		background: #fdecea;
		color: var(--color-error);
		font-weight: 600;
	}

	.confirm-box {
		background: #fdecea;
		border-radius: var(--radius-md);
		padding: var(--space-md);
		margin-bottom: var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.confirm-box p {
		margin: 0 0 var(--space-sm);
	}

	.confirm-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.edit-form {
		margin-bottom: var(--space-md);
	}

	.detail-body {
		font-size: var(--font-size-md);
		line-height: 1.6;
		white-space: pre-wrap;
		color: var(--color-text);
	}

	.rejection-note {
		margin-top: var(--space-md);
		background: #fdecea;
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.rejection-meta {
		color: var(--color-text-muted);
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

	.entry-content {
		margin: 0 0 2px;
		white-space: pre-wrap;
	}

	.entry-meta {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
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
