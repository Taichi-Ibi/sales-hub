import type {
	DataSource,
	DataUpdateProposal,
	Deal,
	DealPhase,
	DealSummary,
	EventLog,
	PhaseChangeProposal,
	RetrospectiveResult,
	SearchResult,
	Task,
	TaskPriority
} from './types.js';
import { DEAL_PHASES, VALIDATION } from './constants.js';

export interface AIEngineDeps {
	rng?: () => number;
	now?: () => Date;
	uuid?: () => string;
}

function getRng(deps: AIEngineDeps): () => number {
	return deps.rng ?? Math.random;
}

function getNow(deps: AIEngineDeps): Date {
	return deps.now ? deps.now() : new Date();
}

function getUuid(deps: AIEngineDeps): string {
	return deps.uuid ? deps.uuid() : crypto.randomUUID();
}

interface TaskTemplate {
	titleFormat: (log: EventLog) => string;
	defaultPriority: TaskPriority;
}

const TEMPLATES: Record<DataSource, TaskTemplate[]> = {
	slack: [
		{ titleFormat: (l) => `${l.title}の内容を確認・返信する`, defaultPriority: 'medium' },
		{ titleFormat: (l) => `${l.title}に関連するタスクを整理する`, defaultPriority: 'low' }
	],
	email: [
		{ titleFormat: (l) => `${l.emailSubject ?? l.title}に返信する`, defaultPriority: 'high' },
		{ titleFormat: (l) => `${l.title}の対応事項をフォローする`, defaultPriority: 'medium' }
	],
	calendar: [
		{ titleFormat: (l) => `${l.eventName ?? l.title}の事前準備を行う`, defaultPriority: 'high' },
		{ titleFormat: (l) => `${l.eventName ?? l.title}の議事録を作成する`, defaultPriority: 'medium' }
	],
	minutes: [
		{ titleFormat: (l) => `${l.title}のアクションアイテムを実施する`, defaultPriority: 'high' },
		{
			titleFormat: (l) => `${l.title}の決定事項を関係者に共有する`,
			defaultPriority: 'medium'
		},
		{ titleFormat: (l) => `${l.title}のフォローアップを行う`, defaultPriority: 'low' }
	],
	memo: [
		{
			titleFormat: (l) => `${l.title}の内容を確認し次のアクションを決める`,
			defaultPriority: 'medium'
		}
	]
};

function addDays(date: Date, days: number): Date {
	const result = new Date(date.getTime());
	result.setDate(result.getDate() + days);
	return result;
}

export function generateTasks(eventLog: EventLog, _deals: Deal[], deps: AIEngineDeps = {}): Task[] {
	const rng = getRng(deps);
	const now = getNow(deps);

	const templates = TEMPLATES[eventLog.source];
	const count =
		Math.floor(rng() * (VALIDATION.AI_TASKS_MAX - VALIDATION.AI_TASKS_MIN + 1)) +
		VALIDATION.AI_TASKS_MIN;
	const selected = templates.slice(0, count);

	return selected.map((tmpl, i) => ({
		id: getUuid(deps),
		title: tmpl.titleFormat(eventLog),
		dealId: eventLog.dealId,
		status: 'not_started' as const,
		priority: tmpl.defaultPriority,
		dueDate: addDays(now, 3 + i),
		createdAt: now,
		updatedAt: now,
		source: 'ai' as const,
		isProposal: true
	}));
}

export function generateSummary(
	deal: Deal,
	eventLogs: EventLog[],
	deps: AIEngineDeps = {}
): DealSummary {
	const now = getNow(deps);
	const relatedLogs = eventLogs.filter((l) => l.dealId === deal.id && !l.isDeleted);

	const periodStart =
		relatedLogs.length > 0
			? new Date(Math.min(...relatedLogs.map((l) => l.timestamp.getTime())))
			: now;
	const periodEnd =
		relatedLogs.length > 0
			? new Date(Math.max(...relatedLogs.map((l) => l.timestamp.getTime())))
			: now;

	const lines: string[] = [
		`案件「${deal.name}」の現在フェーズ: ${deal.phase}。`,
		`関連するEvent_Logが${relatedLogs.length}件記録されています。`
	];

	if (relatedLogs.length > 0) {
		const recent = relatedLogs
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, 3);
		lines.push(`直近の活動: ${recent.map((l) => l.title).join('、')}`);
	}

	const text = lines.join('\n').slice(0, VALIDATION.SUMMARY_MAX);

	return { text, generatedAt: now, periodStart, periodEnd, hasUpdates: false };
}

function calculateRelevance(query: string, text: string): number {
	if (!query.trim()) return 0;
	const keywords = query
		.toLowerCase()
		.split(/\s+/)
		.filter((k) => k.length > 0);
	const lower = text.toLowerCase();
	let score = 0;
	for (const kw of keywords) {
		if (lower.includes(kw)) score += 50 / keywords.length;
	}
	return Math.min(100, Math.round(score));
}

export function search(
	query: string,
	eventLogs: EventLog[],
	deals: Deal[],
	tasks: Task[]
): SearchResult[] {
	if (!query.trim()) return [];

	const results: SearchResult[] = [];

	for (const log of eventLogs) {
		if (log.isDeleted) continue;
		const text = `${log.title} ${log.body}`;
		const score = calculateRelevance(query, text);
		if (score > 0) {
			results.push({
				type: 'event_log',
				id: log.id,
				title: log.title,
				excerpt: log.body.slice(0, 100),
				relevanceScore: score
			});
		}
	}

	for (const deal of deals) {
		const text = `${deal.name} ${deal.phase}`;
		const score = calculateRelevance(query, text);
		if (score > 0) {
			results.push({
				type: 'deal',
				id: deal.id,
				title: deal.name,
				excerpt: `フェーズ: ${deal.phase}`,
				relevanceScore: score
			});
		}
	}

	for (const task of tasks) {
		const text = task.title;
		const score = calculateRelevance(query, text);
		if (score > 0) {
			results.push({
				type: 'task',
				id: task.id,
				title: task.title,
				excerpt: `ステータス: ${task.status}`,
				relevanceScore: score
			});
		}
	}

	return results
		.sort((a, b) => b.relevanceScore - a.relevanceScore)
		.slice(0, VALIDATION.SEARCH_RESULTS_MAX);
}

export function detectPhaseChange(deal: Deal, eventLogs: EventLog[]): PhaseChangeProposal | null {
	const relatedLogs = eventLogs.filter((l) => l.dealId === deal.id && !l.isDeleted);
	if (relatedLogs.length === 0) return null;

	const currentIndex = DEAL_PHASES.indexOf(deal.phase);
	if (currentIndex < 0 || currentIndex >= DEAL_PHASES.length - 1) return null;

	const hasMinutes = relatedLogs.some((l) => l.source === 'minutes');
	const hasEmail = relatedLogs.some((l) => l.source === 'email');

	if (!hasMinutes && !hasEmail) return null;

	const proposedPhase: DealPhase = DEAL_PHASES[currentIndex + 1];
	const recentLog = relatedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

	return {
		dealId: deal.id,
		currentPhase: deal.phase,
		proposedPhase,
		reasoning: `「${recentLog.title}」の内容からフェーズ移行が示唆されます。`
	};
}

export function detectDataUpdate(eventLog: EventLog, deals: Deal[]): DataUpdateProposal[] {
	if (!eventLog.dealId) return [];

	const deal = deals.find((d) => d.id === eventLog.dealId);
	if (!deal) return [];

	const proposals: DataUpdateProposal[] = [];

	if (eventLog.source === 'email' && eventLog.emailFrom) {
		proposals.push({
			id: crypto.randomUUID(),
			dealId: deal.id,
			field: 'assignee',
			currentValue: deal.assignee,
			proposedValue: eventLog.emailFrom,
			sourceEventLogId: eventLog.id
		});
	}

	return proposals;
}

export function generateRetrospective(
	eventLogs: EventLog[],
	tasks: Task[],
	periodStart: Date,
	periodEnd: Date,
	deals: Deal[] = []
): RetrospectiveResult {
	const periodLogs = eventLogs.filter(
		(l) => !l.isDeleted && l.timestamp >= periodStart && l.timestamp <= periodEnd
	);

	const activityPattern: Record<DataSource, number> = {
		slack: 0,
		email: 0,
		calendar: 0,
		minutes: 0,
		memo: 0
	};
	for (const log of periodLogs) {
		activityPattern[log.source]++;
	}

	const completedTasks = tasks.filter((t) => t.status === 'completed');
	const pendingTasks = tasks.filter((t) => t.status !== 'completed');

	const suggestions: string[] = [];
	if (pendingTasks.length > completedTasks.length) {
		suggestions.push('未完了タスクが多いため、優先順位を見直すことを推奨します。');
	}
	if (activityPattern.minutes === 0 && periodLogs.length > 0) {
		suggestions.push('議事録の記録が少ないため、会議後の記録習慣をつけましょう。');
	}
	if (periodLogs.length === 0) {
		suggestions.push('活動記録がありません。日常の営業活動を記録してみましょう。');
	}

	const phaseChanges = deals
		.flatMap((d) => d.phaseHistory)
		.filter((h) => h.transitionAt >= periodStart && h.transitionAt <= periodEnd)
		.sort((a, b) => b.transitionAt.getTime() - a.transitionAt.getTime());

	if (phaseChanges.length === 0 && periodLogs.length > 0) {
		suggestions.push('期間内のフェーズ変更がありません。商談の進捗を確認しましょう。');
	}

	return {
		eventLogCount: periodLogs.length,
		taskCompletedCount: completedTasks.length,
		taskPendingCount: pendingTasks.length,
		phaseChanges,
		activityPattern,
		suggestions: suggestions.slice(0, VALIDATION.SUGGESTIONS_MAX)
	};
}
