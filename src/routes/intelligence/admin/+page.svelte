<script lang="ts">
	import { settings, operationLogs, saveSettings } from '$lib/intelligence/store.svelte.js';
	import { VALIDATION } from '$lib/intelligence/constants.js';
	import { isBlank } from '$lib/intelligence/validation.js';
	import type {
		AppSettings,
		AssignmentRule,
		MaskingRule,
		OperationType
	} from '$lib/intelligence/types.js';

	// ─── Admin mode toggle (Req 23.5) ──────────────────────────────────────────
	function toggleAdmin() {
		persist({ ...snapshot(), isAdmin: !settings.isAdmin });
	}

	// ─── Helpers ────────────────────────────────────────────────────────────────
	function snapshot(): AppSettings {
		return {
			maskingRules: settings.maskingRules.map((r) => ({ ...r })),
			allowedDomains: [...settings.allowedDomains],
			assignmentRules: settings.assignmentRules.map((r) => ({ ...r })),
			isAdmin: settings.isAdmin
		};
	}

	let savedNotice = $state('');
	function persist(next: AppSettings, notice = '保存しました') {
		saveSettings(next);
		savedNotice = notice;
		setTimeout(() => (savedNotice = ''), 2500);
	}

	// ─── Masking rules (Task 20.1) ────────────────────────────────────────────
	const methodLabels: Record<MaskingRule['method'], string> = {
		full: '全置換',
		partial: '部分置換（中央のみ）',
		keep_edges: '両端を残す'
	};

	let newMaskPattern = $state('');
	let newMaskMethod = $state<MaskingRule['method']>('full');
	let maskError = $state('');

	function addMaskingRule() {
		maskError = '';
		if (isBlank(newMaskPattern)) {
			maskError = 'パターンを入力してください';
			return;
		}
		try {
			new RegExp(newMaskPattern);
		} catch {
			maskError = '正規表現として無効なパターンです';
			return;
		}
		const rule: MaskingRule = {
			id: crypto.randomUUID(),
			pattern: newMaskPattern.trim(),
			method: newMaskMethod,
			isEnabled: true
		};
		const next = snapshot();
		next.maskingRules = [...next.maskingRules, rule];
		persist(next, 'マスキングルールを追加しました');
		newMaskPattern = '';
		newMaskMethod = 'full';
	}

	function toggleMaskingRule(id: string) {
		const next = snapshot();
		next.maskingRules = next.maskingRules.map((r) =>
			r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
		);
		persist(next);
	}

	function deleteMaskingRule(id: string) {
		const next = snapshot();
		next.maskingRules = next.maskingRules.filter((r) => r.id !== id);
		persist(next, 'マスキングルールを削除しました');
	}

	// ─── Email domain rules (Task 20.1) ────────────────────────────────────────
	let newDomain = $state('');
	let domainError = $state('');

	function addDomain() {
		domainError = '';
		const domain = newDomain.trim().toLowerCase();
		if (isBlank(newDomain)) {
			domainError = 'ドメインを入力してください';
			return;
		}
		if (domain.length > VALIDATION.DOMAIN_MAX) {
			domainError = `ドメインは${VALIDATION.DOMAIN_MAX}文字以内で入力してください`;
			return;
		}
		if (settings.allowedDomains.length >= VALIDATION.ALLOWED_DOMAINS_MAX) {
			domainError = `許可ドメインは最大${VALIDATION.ALLOWED_DOMAINS_MAX}件までです`;
			return;
		}
		if (settings.allowedDomains.some((d) => d.toLowerCase() === domain)) {
			domainError = 'すでに登録済みのドメインです';
			return;
		}
		const next = snapshot();
		next.allowedDomains = [...next.allowedDomains, domain];
		persist(next, 'ドメインを追加しました');
		newDomain = '';
	}

	function deleteDomain(domain: string) {
		const next = snapshot();
		next.allowedDomains = next.allowedDomains.filter((d) => d !== domain);
		persist(next, 'ドメインを削除しました');
	}

	// ─── Assignment rules (Task 20.1) ──────────────────────────────────────────
	let newAssignKeyword = $state('');
	let newAssignAssignee = $state('');
	let assignError = $state('');

	function addAssignmentRule() {
		assignError = '';
		if (isBlank(newAssignKeyword) || isBlank(newAssignAssignee)) {
			assignError = 'キーワードと担当者の両方を入力してください';
			return;
		}
		const rule: AssignmentRule = {
			id: crypto.randomUUID(),
			keyword: newAssignKeyword.trim(),
			assignee: newAssignAssignee.trim()
		};
		const next = snapshot();
		next.assignmentRules = [...next.assignmentRules, rule];
		persist(next, '担当者ルールを追加しました');
		newAssignKeyword = '';
		newAssignAssignee = '';
	}

	function deleteAssignmentRule(id: string) {
		const next = snapshot();
		next.assignmentRules = next.assignmentRules.filter((r) => r.id !== id);
		persist(next, '担当者ルールを削除しました');
	}

	// ─── Operation logs (Task 20.2) ────────────────────────────────────────────
	const operationLabels: Record<OperationType, string> = {
		event_log_create: 'イベントログ作成',
		event_log_edit: 'イベントログ編集',
		event_log_delete: 'イベントログ削除',
		event_log_approve: 'イベントログ承認',
		event_log_reject: 'イベントログ却下',
		deal_update: '案件更新',
		task_create: 'タスク作成/更新',
		task_complete: 'タスク完了',
		task_delete: 'タスク削除',
		masking_execute: 'マスキング実行',
		masking_restore: 'マスキング復元'
	};

	const targetLabels: Record<string, string> = {
		event_log: 'イベントログ',
		deal: '案件',
		task: 'タスク'
	};

	let logFilterType = $state<OperationType | ''>('');
	let logFilterStart = $state('');
	let logFilterEnd = $state('');
	let logVisibleCount = $state(VALIDATION.PAGE_SIZE);

	const filteredLogs = $derived(
		operationLogs
			.filter((log) => {
				if (logFilterType && log.operationType !== logFilterType) return false;
				if (logFilterStart && log.operatedAt < new Date(logFilterStart + 'T00:00:00')) return false;
				if (logFilterEnd && log.operatedAt > new Date(logFilterEnd + 'T23:59:59')) return false;
				return true;
			})
			.sort((a, b) => b.operatedAt.getTime() - a.operatedAt.getTime())
	);

	const visibleLogs = $derived(filteredLogs.slice(0, logVisibleCount));

	// reset pagination when filters change
	$effect(() => {
		// reference filters so the effect re-runs on change
		void logFilterType;
		void logFilterStart;
		void logFilterEnd;
		logVisibleCount = VALIDATION.PAGE_SIZE;
	});

	function formatDateTime(date: Date): string {
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const operationTypeOptions = Object.keys(operationLabels) as OperationType[];
</script>

<svelte:head>
	<title>Admin Panel — Sales Intelligence</title>
</svelte:head>

<div class="admin">
	<div class="admin-header">
		<h1 class="page-title">Admin Panel</h1>
		<label class="admin-toggle">
			<input type="checkbox" checked={settings.isAdmin} onchange={toggleAdmin} />
			管理者モード（ナビゲーション表示）
		</label>
	</div>

	{#if savedNotice}
		<p class="save-notice" role="status">{savedNotice}</p>
	{/if}

	<!-- Masking rules -->
	<section class="card">
		<h2 class="section-title">自動マスキングルール</h2>
		<div class="form-inline">
			<input
				class="form-input grow"
				type="text"
				placeholder="正規表現パターン（例: \d{3}-\d{4}-\d{4}）"
				bind:value={newMaskPattern}
			/>
			<select class="form-select" bind:value={newMaskMethod}>
				{#each Object.entries(methodLabels) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
			<button class="btn-primary" onclick={addMaskingRule}>追加</button>
		</div>
		{#if maskError}<p class="error-text">{maskError}</p>{/if}

		{#if settings.maskingRules.length === 0}
			<p class="empty-message">マスキングルールが登録されていません</p>
		{:else}
			<ul class="rule-list">
				{#each settings.maskingRules as rule (rule.id)}
					<li class="rule-row">
						<code class="rule-pattern">{rule.pattern}</code>
						<span class="rule-method">{methodLabels[rule.method]}</span>
						<label class="rule-enabled">
							<input
								type="checkbox"
								checked={rule.isEnabled}
								onchange={() => toggleMaskingRule(rule.id)}
							/>
							{rule.isEnabled ? '有効' : '無効'}
						</label>
						<button class="btn-delete" onclick={() => deleteMaskingRule(rule.id)}>削除</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Email domain rules -->
	<section class="card">
		<h2 class="section-title">
			許可メールドメイン
			<span class="count-hint"
				>{settings.allowedDomains.length}/{VALIDATION.ALLOWED_DOMAINS_MAX}</span
			>
		</h2>
		<div class="form-inline">
			<input
				class="form-input grow"
				type="text"
				placeholder="example.com"
				maxlength={VALIDATION.DOMAIN_MAX}
				bind:value={newDomain}
			/>
			<button class="btn-primary" onclick={addDomain}>追加</button>
		</div>
		{#if domainError}<p class="error-text">{domainError}</p>{/if}

		{#if settings.allowedDomains.length === 0}
			<p class="empty-message">許可ドメインが登録されていません</p>
		{:else}
			<ul class="chip-list">
				{#each settings.allowedDomains as domain (domain)}
					<li class="chip">
						<span>{domain}</span>
						<button
							class="chip-remove"
							aria-label={`${domain} を削除`}
							onclick={() => deleteDomain(domain)}>×</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Assignment rules -->
	<section class="card">
		<h2 class="section-title">案件担当者ルール</h2>
		<div class="form-inline">
			<input
				class="form-input grow"
				type="text"
				placeholder="キーワード / ドメイン"
				bind:value={newAssignKeyword}
			/>
			<input
				class="form-input grow"
				type="text"
				placeholder="担当者名"
				bind:value={newAssignAssignee}
			/>
			<button class="btn-primary" onclick={addAssignmentRule}>追加</button>
		</div>
		{#if assignError}<p class="error-text">{assignError}</p>{/if}

		{#if settings.assignmentRules.length === 0}
			<p class="empty-message">担当者ルールが登録されていません</p>
		{:else}
			<ul class="rule-list">
				{#each settings.assignmentRules as rule (rule.id)}
					<li class="rule-row">
						<span class="rule-keyword">{rule.keyword}</span>
						<span class="rule-arrow">→</span>
						<span class="rule-assignee">{rule.assignee}</span>
						<button class="btn-delete" onclick={() => deleteAssignmentRule(rule.id)}>削除</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Operation logs (Task 20.2) -->
	<section class="card">
		<h2 class="section-title">操作ログ</h2>
		<div class="log-filters">
			<label class="filter-field">
				<span class="filter-label">操作種別</span>
				<select class="form-select" bind:value={logFilterType}>
					<option value="">すべて</option>
					{#each operationTypeOptions as type (type)}
						<option value={type}>{operationLabels[type]}</option>
					{/each}
				</select>
			</label>
			<label class="filter-field">
				<span class="filter-label">開始日</span>
				<input type="date" class="form-input" bind:value={logFilterStart} />
			</label>
			<label class="filter-field">
				<span class="filter-label">終了日</span>
				<input type="date" class="form-input" bind:value={logFilterEnd} />
			</label>
		</div>

		{#if filteredLogs.length === 0}
			<p class="empty-message">該当する操作ログはありません</p>
		{:else}
			<table class="log-table">
				<thead>
					<tr>
						<th>日時</th>
						<th>操作種別</th>
						<th>対象</th>
						<th>ユーザー</th>
					</tr>
				</thead>
				<tbody>
					{#each visibleLogs as log (log.id)}
						<tr>
							<td>{formatDateTime(log.operatedAt)}</td>
							<td>{operationLabels[log.operationType]}</td>
							<td>{targetLabels[log.targetType] ?? log.targetType}</td>
							<td>{log.operator}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="log-footer">
				<span class="log-count">
					{Math.min(logVisibleCount, filteredLogs.length)} / {filteredLogs.length} 件
				</span>
				{#if logVisibleCount < filteredLogs.length}
					<button class="btn-secondary" onclick={() => (logVisibleCount += VALIDATION.PAGE_SIZE)}>
						さらに表示
					</button>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.admin {
		max-width: 900px;
	}

	.admin-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.page-title {
		font-size: var(--font-size-2xl);
		color: var(--color-text-heading);
		margin: 0;
	}

	.admin-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		cursor: pointer;
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
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.count-hint {
		font-size: var(--font-size-xs);
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.save-notice {
		font-size: var(--font-size-sm);
		color: var(--color-success);
		background: #e6f4ea;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-sm);
		margin: 0 0 var(--space-md);
	}

	.form-inline {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		margin-bottom: var(--space-sm);
		flex-wrap: wrap;
	}

	.form-input {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
	}

	.form-input.grow {
		flex: 1;
		min-width: 160px;
	}

	.form-select {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: white;
	}

	.btn-primary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-brand);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-secondary {
		font-size: var(--font-size-sm);
		padding: var(--space-xs) var(--space-md);
		border: 1px solid var(--color-brand);
		background: white;
		color: var(--color-brand);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.btn-delete {
		font-size: var(--font-size-xs);
		padding: 2px var(--space-sm);
		border: 1px solid var(--color-error);
		background: white;
		color: var(--color-error);
		border-radius: var(--radius-sm);
		cursor: pointer;
		flex-shrink: 0;
	}

	.btn-delete:hover {
		background: var(--color-error);
		color: white;
	}

	.error-text {
		font-size: var(--font-size-sm);
		color: var(--color-error);
		margin: 0 0 var(--space-sm);
	}

	.empty-message {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.rule-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.rule-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg);
		border-radius: var(--radius-sm);
	}

	.rule-pattern {
		font-family: monospace;
		font-size: var(--font-size-sm);
		background: var(--color-surface);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		flex: 1;
		overflow-x: auto;
	}

	.rule-method {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.rule-enabled {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		flex-shrink: 0;
		cursor: pointer;
	}

	.rule-keyword {
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-weight: 500;
	}

	.rule-arrow {
		color: var(--color-text-muted);
	}

	.rule-assignee {
		font-size: var(--font-size-sm);
		color: var(--color-brand);
		font-weight: 600;
		flex: 1;
	}

	.chip-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.chip {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: var(--color-brand-light);
		color: var(--color-brand);
		font-size: var(--font-size-sm);
		padding: 2px var(--space-sm);
		border-radius: 12px;
	}

	.chip-remove {
		border: none;
		background: none;
		color: var(--color-brand);
		cursor: pointer;
		font-size: var(--font-size-md);
		line-height: 1;
		padding: 0;
	}

	.log-filters {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}

	.filter-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.filter-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	.log-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	.log-table th {
		text-align: left;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 2px solid var(--color-border);
	}

	.log-table td {
		padding: var(--space-xs) var(--space-sm);
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.log-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-md);
	}

	.log-count {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}
</style>
