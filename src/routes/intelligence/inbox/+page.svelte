<script lang="ts">
	import { onMount } from 'svelte';
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
	import { groupByThread, getThreadMessagesSorted } from '$lib/intelligence/thread-grouper.js';
	import { selectVisibleEventLogs } from '$lib/intelligence/store-logic.js';
	import { filterEventLogs, type EventLogFilter } from '$lib/intelligence/filters.js';
	import { search, generateTasks } from '$lib/intelligence/ai-engine.js';
	import { isBlank } from '$lib/intelligence/validation.js';
	import { VALIDATION, CURRENT_USER } from '$lib/intelligence/constants.js';
	import { formatRelative, formatDateTime } from '$lib/intelligence/format.js';
	import {
		sourceIcons,
		sourceLabel,
		messageSender,
		eventLogStatusLabel as statusLabel,
		eventLogStatusClass as statusClass
	} from '$lib/intelligence/ui-labels.js';
	import { getInitials, avatarColor } from '$lib/intelligence/avatar.js';
	import type { DataSource, EventLog, SearchResult, ThreadGroup } from '$lib/intelligence/types.js';

	type SelectedItem = { type: 'event'; item: EventLog } | { type: 'thread'; item: ThreadGroup };

	const threadGroups = $derived(groupByThread(eventLogs));
	const visibleLogs = $derived(selectVisibleEventLogs(eventLogs));

	// ─── Live clock（相対時刻表示を1分ごとに更新） ──────────────────────────────────
	let now = $state(new Date());
	onMount(() => {
		const interval = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(interval);
	});

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

	const sourceOptions = (Object.keys(sourceLabel) as DataSource[]).map((value) => ({
		value,
		label: sourceLabel[value]
	}));

	const searchTypeIcon: Record<SearchResult['type'], string> = {
		event_log: '📥',
		deal: '💼',
		task: '✅'
	};

	const searchTypeLabel: Record<SearchResult['type'], string> = {
		event_log: 'メッセージ',
		deal: '案件',
		task: 'タスク'
	};

	/** 本文を1行プレビュー用に整形する（マスキング済みなら伏字版を使う）。 */
	function preview(log: EventLog): string {
		const text = (log.isMasked ? (log.maskedBody ?? log.body) : log.body) ?? '';
		return text.replace(/\s+/g, ' ').trim();
	}

	function toggleSource(source: DataSource) {
		if (selectedSources.has(source)) {
			selectedSources.delete(source);
		} else {
			selectedSources.add(source);
		}
		currentPage = 0;
	}

	function setView(flat: boolean) {
		if (isFlat === flat) return;
		isFlat = flat;
		currentPage = 0;
		selected = null;
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
		saveNotice = `保存しました（AIがタスクを${newTasks.length}件提案）`;
	}
</script>

<svelte:head>
	<title>インボックス — Sales Intelligence</title>
</svelte:head>

<!-- 色付きイニシャルのアバター。送信者名やチャンネル名を seed に使う。 -->
{#snippet avatar(seed: string, large: boolean)}
	<span
		class="avatar"
		class:avatar-lg={large}
		style="background-color: {avatarColor(seed)}"
		aria-hidden="true"
	>
		{getInitials(seed)}
	</span>
{/snippet}

<div class="inbox-layout" class:has-selection={selected !== null}>
	<div class="inbox-left">
		<div class="inbox-header">
			<div class="inbox-heading">
				<h1 class="page-title">インボックス</h1>
				<p class="page-lead">Slack・メール・議事録・メモを、ひとつの場所で。</p>
			</div>
			<button
				class="compose-btn"
				class:active={showNewLog}
				onclick={() => (showNewLog = !showNewLog)}
			>
				{showNewLog ? 'キャンセル' : '✏️ 新規作成'}
			</button>
		</div>

		<!-- AI Search (18.1) -->
		<div class="search-bar">
			<input
				class="search-input"
				type="search"
				placeholder="🔍 メッセージ・案件・タスクをまとめて検索"
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
							<input type="radio" bind:group={newLogSource} value="memo" /> 🗒️ メモ
						</label>
						<label class="radio-label">
							<input type="radio" bind:group={newLogSource} value="minutes" /> 📝 議事録
						</label>
					</div>
				</div>
				<div class="form-row">
					<label class="form-label" for="new-log-title">タイトル (任意)</label>
					<input
						id="new-log-title"
						class="form-input"
						type="text"
						placeholder="例: A社 定例MTGメモ"
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
						placeholder="内容を入力してください。保存するとAIが関連タスクを提案します。"
						maxlength={newLogMaxLen}
						bind:value={newLogBody}
					></textarea>
				</div>
				{#if newLogError}
					<p class="error-text">{newLogError}</p>
				{/if}
				<button class="btn-primary" onclick={saveNewLog}>保存する</button>
			</div>
		{/if}

		{#if saveNotice}
			<p class="save-notice">✓ {saveNotice}</p>
		{/if}

		{#if searchSubmitted}
			<!-- Search results (18.1) -->
			<div class="search-results">
				{#if searchResults.length === 0}
					<p class="empty-message">該当する結果がありません</p>
				{:else}
					<ul class="conv-list">
						{#each searchResults as result (result.type + result.id)}
							<li>
								<button
									class="conv-row"
									class:clickable={result.type === 'event_log'}
									onclick={() => openSearchResult(result)}
								>
									<span class="source-emoji">{searchTypeIcon[result.type]}</span>
									<div class="conv-body">
										<span class="conv-title">{result.title.slice(0, 50)}</span>
										<span class="conv-preview">{result.excerpt}</span>
										<span class="conv-tags">
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

			<!-- 表示切り替え（会話 / 時系列）と絞り込み -->
			<div class="view-toolbar">
				<div class="segmented" role="group" aria-label="表示の切り替え">
					<button class="seg-btn" class:active={!isFlat} onclick={() => setView(false)}>
						💬 会話ごと
					</button>
					<button class="seg-btn" class:active={isFlat} onclick={() => setView(true)}>
						🕒 時系列
					</button>
				</div>
				<button
					class="filter-toggle"
					class:active={showAdvancedFilter}
					onclick={() => (showAdvancedFilter = !showAdvancedFilter)}
				>
					絞り込み{anyFilterActive ? ' ●' : ''}
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
						<button class="search-clear" onclick={clearFilters}>絞り込みをクリア</button>
					{/if}
				</div>
			{/if}

			<!-- List -->
			{#if totalItems === 0}
				<p class="empty-message">
					{anyFilterActive ? '条件に合うメッセージはありません' : 'まだメッセージがありません'}
				</p>
			{:else if isFlat}
				<ul class="conv-list">
					{#each flatPageItems as log (log.id)}
						<li>
							<button
								class="conv-row"
								class:unread={!log.isRead}
								class:active={selected?.type === 'event' && selected.item.id === log.id}
								onclick={() => selectEvent(log)}
							>
								{@render avatar(messageSender(log), false)}
								<div class="conv-body">
									<div class="conv-top">
										<span class="conv-name">{messageSender(log)}</span>
										<span class="conv-time">{formatRelative(log.timestamp, now)}</span>
									</div>
									<span class="conv-title">{log.title}</span>
									{#if preview(log)}<span class="conv-preview">{preview(log)}</span>{/if}
									<span class="conv-tags">
										<span class="source-tag"
											>{sourceIcons[log.source]} {sourceLabel[log.source]}</span
										>
										{#if log.status !== 'pending'}
											<span class="status-badge {statusClass[log.status]}"
												>{statusLabel[log.status]}</span
											>
										{/if}
									</span>
								</div>
								{#if !log.isRead}<span class="unread-dot" aria-label="未読"></span>{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="conv-list">
					{#each threadPageItems as tg (tg.id)}
						<li>
							<button
								class="conv-row"
								class:unread={!tg.parentMessage.isRead}
								class:active={selected?.type === 'thread' && selected.item.id === tg.id}
								onclick={() => selectThread(tg)}
							>
								{@render avatar(messageSender(tg.parentMessage), false)}
								<div class="conv-body">
									<div class="conv-top">
										<span class="conv-name">{messageSender(tg.parentMessage)}</span>
										<span class="conv-time">{formatRelative(tg.latestMessageAt, now)}</span>
									</div>
									<span class="conv-title">{tg.parentMessage.title}</span>
									{#if preview(tg.parentMessage)}
										<span class="conv-preview">{preview(tg.parentMessage)}</span>
									{/if}
									<span class="conv-tags">
										<span class="source-tag">{sourceIcons[tg.source]} {sourceLabel[tg.source]}</span
										>
										<span class="thread-count">💬 {tg.messageCount}件の会話</span>
									</span>
								</div>
								{#if !tg.parentMessage.isRead}<span class="unread-dot" aria-label="未読"
									></span>{/if}
							</button>
						</li>
					{/each}
					<!-- standalone logs not in any thread -->
					{#each standalonePageItems as log (log.id)}
						{#if !threadPageItems.some((tg) => tg.parentMessage.id === log.id || tg.replies.some((r) => r.id === log.id))}
							<li>
								<button
									class="conv-row"
									class:unread={!log.isRead}
									class:active={selected?.type === 'event' && selected.item.id === log.id}
									onclick={() => selectEvent(log)}
								>
									{@render avatar(messageSender(log), false)}
									<div class="conv-body">
										<div class="conv-top">
											<span class="conv-name">{messageSender(log)}</span>
											<span class="conv-time">{formatRelative(log.timestamp, now)}</span>
										</div>
										<span class="conv-title">{log.title}</span>
										{#if preview(log)}<span class="conv-preview">{preview(log)}</span>{/if}
										<span class="conv-tags">
											<span class="source-tag"
												>{sourceIcons[log.source]} {sourceLabel[log.source]}</span
											>
											{#if log.status !== 'pending'}
												<span class="status-badge {statusClass[log.status]}"
													>{statusLabel[log.status]}</span
												>
											{/if}
										</span>
									</div>
									{#if !log.isRead}<span class="unread-dot" aria-label="未読"></span>{/if}
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
				<span class="detail-empty-icon">💬</span>
				<p>左の一覧からメッセージを選ぶと、ここに会話が表示されます。</p>
			</div>
		{:else if selectedEventLog}
			{@const log = selectedEventLog}
			<div class="detail-panel">
				<button class="mobile-back" onclick={() => (selected = null)}>← 一覧へ戻る</button>
				<div class="detail-header">
					{@render avatar(messageSender(log), true)}
					<div>
						<h2 class="detail-title">{log.title}</h2>
						<div class="detail-meta">
							<span class="detail-sender">{messageSender(log)}</span>
							<span>{formatDateTime(log.timestamp)}</span>
							<span class="source-tag">{sourceIcons[log.source]} {sourceLabel[log.source]}</span>
							<span class="status-badge {statusClass[log.status]}">{statusLabel[log.status]}</span>
							{#if log.dealId}
								{@const deal = deals.find((d) => d.id === log.dealId)}
								{#if deal}<span class="deal-tag">💼 {deal.name}</span>{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Action toolbar (16.2) -->
				<div class="detail-actions">
					<button
						class="action-btn"
						title="この記録に補足情報を追記します"
						onclick={() => openEdit('annotation')}>📌 追記</button
					>
					<button
						class="action-btn"
						title="この記録にコメントします"
						onclick={() => openEdit('comment')}>💬 コメント</button
					>
					{#if log.status !== 'rejected'}
						<button
							class="action-btn action-warn"
							title="この記録を却下します"
							onclick={() => openEdit('reject')}>🚫 却下</button
						>
					{:else}
						<span class="rejected-label">却下済み</span>
					{/if}
					<button
						class="action-btn action-danger"
						title="この記録を削除します"
						onclick={() => {
							showDeleteConfirm = true;
							editMode = 'none';
						}}
					>
						🗑 削除
					</button>
				</div>

				{#if showDeleteConfirm}
					<div class="confirm-box">
						<p>この記録を削除しますか？（あとから復元できます）</p>
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
						<h3>📌 追記</h3>
						{#each log.annotations as ann (ann.id)}
							<div class="entry">
								{@render avatar(ann.author, false)}
								<div class="entry-main">
									<p class="entry-meta">
										<strong>{ann.author}</strong> · {formatDateTime(ann.createdAt)}
									</p>
									<p class="entry-content">{ann.content}</p>
								</div>
							</div>
						{/each}
					</section>
				{/if}
				{#if log.comments.length > 0}
					<section class="detail-section">
						<h3>💬 コメント</h3>
						{#each log.comments as comment (comment.id)}
							<div class="entry">
								{@render avatar(comment.author, false)}
								<div class="entry-main">
									<p class="entry-meta">
										<strong>{comment.author}</strong> · {formatDateTime(comment.createdAt)}
									</p>
									<p class="entry-content">{comment.content}</p>
								</div>
							</div>
						{/each}
					</section>
				{/if}
			</div>
		{:else if selectedThread}
			{@const tg = selectedThread}
			{@const messages = getThreadMessagesSorted(tg)}
			<div class="detail-panel">
				<button class="mobile-back" onclick={() => (selected = null)}>← 一覧へ戻る</button>
				<div class="detail-header">
					{@render avatar(messageSender(tg.parentMessage), true)}
					<div>
						<h2 class="detail-title">{tg.parentMessage.title}</h2>
						<div class="detail-meta">
							<span class="source-tag">{sourceIcons[tg.source]} {sourceLabel[tg.source]}</span>
							<span>{tg.messageCount}件のメッセージ</span>
							<span>最終更新 {formatRelative(tg.latestMessageAt, now)}</span>
						</div>
					</div>
				</div>
				<div class="chat-messages">
					{#each messages as msg (msg.id)}
						<div class="chat-msg">
							{@render avatar(messageSender(msg), false)}
							<div class="chat-content">
								<div class="chat-head">
									<span class="chat-sender">{messageSender(msg)}</span>
									<span class="chat-time">{formatDateTime(msg.timestamp)}</span>
								</div>
								<div class="chat-bubble">
									{msg.isMasked ? (msg.maskedBody ?? msg.body) : msg.body}
								</div>
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
		width: 400px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		overflow-y: auto;
	}

	/* Mobile: collapse master-detail into a single column. The list and the
	   detail swap based on whether an item is selected (driven by .has-selection). */
	.mobile-back {
		display: none;
	}

	@media (max-width: 767px) {
		.inbox-layout {
			height: auto;
			gap: 0;
		}

		.inbox-left {
			width: 100%;
		}

		.inbox-detail {
			display: none;
		}

		.inbox-layout.has-selection .inbox-left {
			display: none;
		}

		.inbox-layout.has-selection .inbox-detail {
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

	.inbox-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.inbox-heading {
		min-width: 0;
	}

	.page-title {
		font-size: var(--font-size-xl);
		color: var(--color-text-heading);
		margin: 0;
	}

	.page-lead {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 2px 0 0;
	}

	.compose-btn {
		flex-shrink: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
		padding: var(--space-xs) var(--space-md);
		border: none;
		background: var(--color-brand);
		color: white;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.compose-btn:hover {
		background: var(--color-brand-hover);
	}

	.compose-btn.active {
		background: var(--color-text-muted);
	}

	/* ─── Avatar ─────────────────────────────────────────────────────────────── */
	.avatar {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: var(--font-size-sm);
		font-weight: 700;
		line-height: 1;
		user-select: none;
	}

	.avatar-lg {
		width: 44px;
		height: 44px;
		font-size: var(--font-size-lg);
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

	.conv-row.clickable:hover {
		background: var(--color-brand-light);
	}

	/* View toolbar: segmented control + filter toggle */
	.view-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.segmented {
		display: inline-flex;
		background: var(--color-bg);
		border-radius: var(--radius-sm);
		padding: 2px;
	}

	.seg-btn {
		font-size: var(--font-size-xs);
		padding: 4px var(--space-sm);
		border: none;
		background: none;
		color: var(--color-text-muted);
		border-radius: calc(var(--radius-sm) - 1px);
		cursor: pointer;
	}

	.seg-btn.active {
		background: white;
		color: var(--color-brand);
		font-weight: 600;
		box-shadow: var(--shadow-card);
	}

	.filter-toggle {
		font-size: var(--font-size-xs);
		padding: 4px var(--space-sm);
		border: 1px solid var(--color-border);
		background: white;
		color: var(--color-text);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.filter-toggle.active {
		background: var(--color-brand);
		color: white;
		border-color: var(--color-brand);
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

	/* ─── Conversation list (Slack channel-list style) ─────────────────────────── */
	.conv-list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		flex: 1;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
	}

	.conv-row {
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

	.conv-row:hover {
		background: var(--color-brand-light);
	}

	.conv-row.active {
		background: var(--color-brand-light);
		box-shadow: inset 3px 0 0 var(--color-brand);
	}

	.conv-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.conv-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.conv-name {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-heading);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conv-time {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.conv-title {
		font-size: var(--font-size-md);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conv-row.unread .conv-name,
	.conv-row.unread .conv-title {
		font-weight: 700;
		color: var(--color-text-heading);
	}

	.conv-preview {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conv-tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		margin-top: 2px;
	}

	.source-emoji {
		font-size: 18px;
		flex-shrink: 0;
		margin-top: 2px;
		width: 36px;
		text-align: center;
	}

	.source-tag {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		background: var(--color-bg);
		padding: 1px 6px;
		border-radius: 8px;
	}

	.unread-dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-brand);
		margin-top: 6px;
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
		padding: 1px 6px;
		border-radius: 8px;
		font-weight: 600;
		font-size: var(--font-size-xs);
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
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: var(--space-sm);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		padding: var(--space-lg);
		text-align: center;
	}

	.detail-empty-icon {
		font-size: 40px;
		opacity: 0.6;
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
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.detail-sender {
		font-weight: 600;
		color: var(--color-text-heading);
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
		flex-wrap: wrap;
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

	/* Annotation / comment entries — chat-row style with avatar */
	.entry {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.entry-main {
		flex: 1;
		min-width: 0;
	}

	.entry-content {
		margin: 2px 0 0;
		white-space: pre-wrap;
		font-size: var(--font-size-sm);
		color: var(--color-text);
		line-height: 1.5;
	}

	.entry-meta {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	/* ─── Thread chat view ─────────────────────────────────────────────────────── */
	.chat-messages {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.chat-msg {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-start;
	}

	.chat-content {
		flex: 1;
		min-width: 0;
	}

	.chat-head {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: 2px;
	}

	.chat-sender {
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--color-text-heading);
	}

	.chat-time {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.chat-bubble {
		font-size: var(--font-size-md);
		line-height: 1.6;
		white-space: pre-wrap;
		color: var(--color-text);
	}
</style>
