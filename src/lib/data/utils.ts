import { events, PERIOD_START, projects, TODAY } from './mock';
import type { Attachment, CustomerRank, EventType, ProjectStatus, SalesEvent } from './types';

const MS_PER_DAY = 86_400_000;

// ============================================================
// 表示ヘルパー
// ============================================================

/** 金額を「¥1,800万」「¥1.2億」のように表示 */
export function yen(amount: number): string {
	if (amount >= 100_000_000) return `¥${(amount / 100_000_000).toFixed(1)}億`;
	if (amount >= 10_000) return `¥${Math.round(amount / 10_000).toLocaleString()}万`;
	return `¥${amount.toLocaleString()}`;
}

/** 2つの日付（YYYY-MM-DD）間の日数差 */
export function daysBetween(from: string, to: string = TODAY): number {
	return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

/** 「3日前」「本日」「2日後」のような相対表現 */
export function relativeDays(date: string): string {
	const d = daysBetween(date);
	if (d === 0) return '本日';
	if (d > 0) return `${d}日前`;
	return `${-d}日後`;
}

/** 期間内（from〜to）の日付かどうか */
export function inPeriod(date: string, from = PERIOD_START, to = TODAY): boolean {
	return date >= from && date <= to;
}

// ============================================================
// イベントソーシング — 状態はすべてイベント履歴から導出する
// ============================================================

/** イベント種別 → 案件ステータスへの写像（状態を変化させるイベント） */
const STATUS_BY_EVENT: Partial<Record<EventType, ProjectStatus>> = {
	案件作成: 'リード',
	ヒアリング: 'ヒアリング',
	提案提出: '提案',
	見積提出: '見積',
	契約締結: '受注',
	受注: '受注',
	開発開始: '開発',
	納品: '納品',
	失注: '失注'
};

/** 全イベントを時系列昇順で返す（同日は登録順を維持） */
export function sortedEvents(list: SalesEvent[]): SalesEvent[] {
	return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

/** 顧客のイベント（新しい順） */
export function customerEvents(customerId: string): SalesEvent[] {
	return events
		.filter((e) => e.customerId === customerId)
		.sort((a, b) => b.date.localeCompare(a.date));
}

/** 案件のイベント（新しい順） */
export function projectEvents(projectId: string): SalesEvent[] {
	return events
		.filter((e) => e.projectId === projectId)
		.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 案件の現在ステータスをイベント履歴から導出する。
 * 状態遷移イベントのうち最新のものを採用する。
 */
export function deriveProjectStatus(projectId: string): ProjectStatus {
	const evts = sortedEvents(events.filter((e) => e.projectId === projectId));
	let status: ProjectStatus = 'リード';
	for (const e of evts) {
		const next = STATUS_BY_EVENT[e.type];
		if (next) status = next;
	}
	return status;
}

const WON: ProjectStatus[] = ['受注', '開発', '納品'];

export function isWon(status: ProjectStatus): boolean {
	return WON.includes(status);
}
export function isLost(status: ProjectStatus): boolean {
	return status === '失注';
}
export function isOpen(status: ProjectStatus): boolean {
	return !isWon(status) && !isLost(status);
}

/** 受注イベント（amount を持つ） */
function wonEvents(list: SalesEvent[]): SalesEvent[] {
	return list.filter((e) => e.type === '受注' && typeof e.amount === 'number');
}

/** 顧客の売上累計（受注イベントの金額合計＝LTV相当） */
export function customerRevenue(customerId: string): number {
	return wonEvents(events.filter((e) => e.customerId === customerId)).reduce(
		(s, e) => s + (e.amount ?? 0),
		0
	);
}

/** 顧客の粗利率（受注金額で加重平均） */
export function customerMargin(customerId: string): number {
	const won = wonEvents(events.filter((e) => e.customerId === customerId));
	const total = won.reduce((s, e) => s + (e.amount ?? 0), 0);
	if (total === 0) return 0;
	const profit = won.reduce((s, e) => s + (e.amount ?? 0) * (e.margin ?? 0), 0);
	return Math.round(profit / total);
}

/** 顧客の最終接触日（最新イベントの日付） */
export function lastContact(customerId: string): string | null {
	const evts = customerEvents(customerId);
	return evts.length ? evts[0].date : null;
}

/** 顧客配下の案件一覧（導出ステータス付き） */
export function customerProjects(customerId: string) {
	return projects
		.filter((p) => p.customerId === customerId)
		.map((p) => ({ ...p, status: deriveProjectStatus(p.id) }));
}

/** 顧客のアクティブ（進行中）案件数 */
export function activeProjectCount(customerId: string): number {
	return customerProjects(customerId).filter((p) => isOpen(p.status)).length;
}

/** 案件に紐づく添付資料を種別ごとに収集 */
export function projectAttachments(
	projectId: string
): { event: SalesEvent; attachment: Attachment }[] {
	return projectEvents(projectId).flatMap((e) =>
		(e.attachments ?? []).map((attachment) => ({ event: e, attachment }))
	);
}

// ============================================================
// ダッシュボード集計（KGI / KPI / 補助指標）
// ============================================================

export interface DashboardMetrics {
	// KGI
	revenue: number; // 売上（今期の受注金額合計）
	margin: number; // 粗利率（今期、加重平均）
	// KPI
	dealCount: number; // 商談数（今期に動いた案件数）
	proposalCount: number; // 提案数（今期の提案提出イベント数）
	winRate: number; // 受注率（今期に決着した案件の勝率）
	avgDealSize: number; // 平均案件単価（今期受注案件の平均金額）
	// 補助指標
	newCustomers: number; // 新規顧客数（今期の顧客登録）
	activeCustomers: number; // アクティブ顧客数（直近90日に接点あり）
	pipeline: number; // パイプライン金額（進行中案件の想定売上合計）
}

export function dashboardMetrics(): DashboardMetrics {
	const periodEvents = events.filter((e) => inPeriod(e.date));

	// KGI: 売上・粗利率（今期受注）
	const wonInPeriod = periodEvents.filter((e) => e.type === '受注' && typeof e.amount === 'number');
	const revenue = wonInPeriod.reduce((s, e) => s + (e.amount ?? 0), 0);
	const profit = wonInPeriod.reduce((s, e) => s + (e.amount ?? 0) * (e.margin ?? 0), 0);
	const margin = revenue ? Math.round(profit / revenue) : 0;

	// KPI
	const dealIds = new Set(periodEvents.filter((e) => e.projectId).map((e) => e.projectId));
	const dealCount = dealIds.size;
	const proposalCount = periodEvents.filter((e) => e.type === '提案提出').length;
	const wonCount = periodEvents.filter((e) => e.type === '受注').length;
	const lostCount = periodEvents.filter((e) => e.type === '失注').length;
	const decided = wonCount + lostCount;
	const winRate = decided ? Math.round((wonCount / decided) * 100) : 0;
	const avgDealSize = wonCount ? Math.round(revenue / wonCount) : 0;

	// 補助指標
	const newCustomers = periodEvents.filter((e) => e.type === '顧客登録').length;
	const activeCustomers = new Set(
		events
			.filter((e) => daysBetween(e.date) <= 90 && daysBetween(e.date) >= 0)
			.map((e) => e.customerId)
	).size;
	const pipeline = projects
		.filter((p) => isOpen(deriveProjectStatus(p.id)))
		.reduce((s, p) => s + p.expectedAmount, 0);

	return {
		revenue,
		margin,
		dealCount,
		proposalCount,
		winRate,
		avgDealSize,
		newCustomers,
		activeCustomers,
		pipeline
	};
}

// ============================================================
// 表示用メタ
// ============================================================

/** 顧客ランクの説明 */
export const rankLabel: Record<CustomerRank, string> = {
	S: '最重要',
	A: '重要',
	B: '通常',
	C: '新規・育成'
};

/** 案件ステータス → バッジ配色クラス */
export const statusClass: Record<ProjectStatus, string> = {
	リード: 'neutral',
	ヒアリング: 'info',
	提案: 'info',
	見積: 'warn',
	受注: 'ok',
	開発: 'ok',
	納品: 'ok',
	失注: 'bad'
};

/** イベント種別 → アイコン */
export const eventIcon: Record<EventType, string> = {
	顧客登録: '🏢',
	担当者追加: '👤',
	初回接触: '🤝',
	電話: '📞',
	メール: '✉️',
	訪問: '🚪',
	定例会: '🗓️',
	案件作成: '📁',
	ヒアリング: '🎧',
	提案提出: '📑',
	見積提出: '🧾',
	契約締結: '✍️',
	受注: '🎉',
	失注: '🚫',
	開発開始: '🛠️',
	納品: '📦'
};

/** イベント種別 → 強調色クラス（タイムラインのドット） */
export const eventTone: Record<EventType, 'plain' | 'info' | 'ok' | 'warn' | 'bad'> = {
	顧客登録: 'plain',
	担当者追加: 'plain',
	初回接触: 'info',
	電話: 'info',
	メール: 'info',
	訪問: 'info',
	定例会: 'info',
	案件作成: 'plain',
	ヒアリング: 'info',
	提案提出: 'warn',
	見積提出: 'warn',
	契約締結: 'ok',
	受注: 'ok',
	失注: 'bad',
	開発開始: 'ok',
	納品: 'ok'
};

export const attachmentIcon: Record<Attachment['kind'], string> = {
	提案書: '📑',
	見積書: '🧾',
	契約書: '✍️',
	資料: '📎',
	議事録: '📝'
};
