/**
 * 申し送りチェックリスト（Handoff）モデル
 *
 * このプロダクトの勝ち条件は「申し送りが構造的に漏れないこと」。
 * その勝ち負けを **製品自身が測れる** ようにするための中核ロジック。
 *
 * 各フェーズには「次へ進む前に必ず残っているべき申し送り項目」が定義されている。
 * 項目が満たされているかは、案件に紐づく Event_Log（破棄・却下を除く）から決定的に判定する。
 * これにより「漏れている申し送り = 現フェーズの未充足項目」を数えられる。
 *
 * 純粋関数のみ。副作用なし・テスト対象。
 */
import type { DataSource, Deal, DealPhase, EventLog } from './types.js';
import { DEAL_PHASES } from './constants.js';

type LogPredicate = (logs: EventLog[]) => boolean;

const hasSource =
	(...sources: DataSource[]): LogPredicate =>
	(logs) =>
		logs.some((l) => sources.includes(l.source));

const hasCalendarWithAttendees =
	(min: number): LogPredicate =>
	(logs) =>
		logs.some((l) => l.source === 'calendar' && (l.attendees?.length ?? 0) >= min);

const hasAnnotation: LogPredicate = (logs) => logs.some((l) => l.annotations.length > 0);

export interface HandoffItemDef {
	id: string;
	/** 申し送り項目名 */
	label: string;
	/** どうすれば埋まるか（行動を1つに絞ったヒント） */
	hint: string;
	satisfiedBy: LogPredicate;
}

/**
 * フェーズごとの「次へ渡す前に揃っているべき申し送り」。
 * closed_won は終端なので申し送り要件を持たない。
 */
export const PHASE_HANDOFF: Record<DealPhase, HandoffItemDef[]> = {
	qualification: [
		{
			id: 'qual-contact',
			label: '顧客との接点記録',
			hint: 'Slack かメールのやり取りを案件に紐づける',
			satisfiedBy: hasSource('slack', 'email')
		},
		{
			id: 'qual-hearing',
			label: '初回ヒアリングの議事録',
			hint: '案件詳細から議事録を残す',
			satisfiedBy: hasSource('minutes')
		}
	],
	issue_identification: [
		{
			id: 'issue-hearing',
			label: '課題ヒアリングの議事録',
			hint: '課題を聞いた打ち合わせの議事録を残す',
			satisfiedBy: hasSource('minutes')
		},
		{
			id: 'issue-share',
			label: '特定した課題の社内共有',
			hint: 'Slack で共有するか、イベントに追記を残す',
			satisfiedBy: (logs) => hasSource('slack')(logs) || hasAnnotation(logs)
		}
	],
	value_proposition: [
		{
			id: 'value-proposal',
			label: '提案・見積の送付',
			hint: '提案メールを案件に紐づける',
			satisfiedBy: hasSource('email')
		},
		{
			id: 'value-meeting',
			label: '提案の打ち合わせ',
			hint: '提案プレゼンの予定を登録する',
			satisfiedBy: hasSource('calendar')
		}
	],
	decision_maker: [
		{
			id: 'dm-meeting',
			label: '意思決定者を含む面談',
			hint: '決裁者が参加する打ち合わせを設定する',
			satisfiedBy: hasCalendarWithAttendees(2)
		},
		{
			id: 'dm-minutes',
			label: '意思決定者の反応の記録',
			hint: '面談後の議事録を残す',
			satisfiedBy: hasSource('minutes')
		}
	],
	risk_elimination: [
		{
			id: 'risk-list',
			label: '懸念・リスクの洗い出し',
			hint: '議事録かメモにリスクを書き出す',
			satisfiedBy: hasSource('minutes', 'memo')
		},
		{
			id: 'risk-agree',
			label: 'リスク対応方針の合意',
			hint: '対応方針をメールで確認する',
			satisfiedBy: hasSource('email')
		}
	],
	contract_agreement: [
		{
			id: 'contract-terms',
			label: '契約条件のメール確認',
			hint: '契約条件のメールを案件に紐づける',
			satisfiedBy: hasSource('email')
		},
		{
			id: 'contract-minutes',
			label: '最終条件のすり合わせ議事録',
			hint: '契約確認MTGの議事録を残す',
			satisfiedBy: hasSource('minutes')
		}
	],
	administration: [
		{
			id: 'admin-docs',
			label: '発注・事務書類の授受',
			hint: '発注書のメールを案件に紐づける',
			satisfiedBy: hasSource('email')
		}
	],
	closed_won: []
};

export interface HandoffItemState {
	id: string;
	label: string;
	hint: string;
	satisfied: boolean;
}

export interface DealHandoff {
	dealId: string;
	phase: DealPhase;
	items: HandoffItemState[];
	satisfiedCount: number;
	requiredCount: number;
	missingItems: HandoffItemState[];
	/** 0〜100。要件が無い（終端）フェーズは 100 とみなす。 */
	fulfillmentRate: number;
	isComplete: boolean;
}

export function getPhaseHandoffItems(phase: DealPhase): HandoffItemDef[] {
	return PHASE_HANDOFF[phase] ?? [];
}

/** 案件に紐づき、集計対象となる（破棄・却下を除く）Event_Log を抽出する。 */
export function relatedAggregableLogs(dealId: string, eventLogs: EventLog[]): EventLog[] {
	return eventLogs.filter((l) => l.dealId === dealId && !l.isDeleted && l.status !== 'rejected');
}

/** 案件単体の申し送り充足状態を計算する。 */
export function computeDealHandoff(deal: Deal, eventLogs: EventLog[]): DealHandoff {
	const logs = relatedAggregableLogs(deal.id, eventLogs);
	const items: HandoffItemState[] = getPhaseHandoffItems(deal.phase).map((def) => ({
		id: def.id,
		label: def.label,
		hint: def.hint,
		satisfied: def.satisfiedBy(logs)
	}));
	const missingItems = items.filter((i) => !i.satisfied);
	const satisfiedCount = items.length - missingItems.length;
	const requiredCount = items.length;
	const fulfillmentRate =
		requiredCount === 0 ? 100 : Math.round((satisfiedCount / requiredCount) * 100);
	return {
		dealId: deal.id,
		phase: deal.phase,
		items,
		satisfiedCount,
		requiredCount,
		missingItems,
		fulfillmentRate,
		isComplete: missingItems.length === 0
	};
}

export interface HandoffOverview {
	/** 漏れている申し送りの総数（全案件の未充足項目の合計）＝勝ち筋メーターの主役。 */
	leakCount: number;
	/** 申し送りに漏れがある案件数。 */
	atRiskDealCount: number;
	/** 申し送りが揃っている案件数。 */
	cleanDealCount: number;
	totalDeals: number;
	/** フェーズ移行時の充足率（全案件の充足項目 / 要件項目）。0〜100。 */
	fulfillmentRate: number;
	perDeal: Array<{ deal: Deal; handoff: DealHandoff }>;
}

/** 全案件を横断した勝ち筋（申し送り漏れ）の俯瞰を計算する。 */
export function computeHandoffOverview(deals: Deal[], eventLogs: EventLog[]): HandoffOverview {
	const perDeal = deals.map((deal) => ({ deal, handoff: computeDealHandoff(deal, eventLogs) }));
	const leakCount = perDeal.reduce((sum, d) => sum + d.handoff.missingItems.length, 0);
	const atRiskDealCount = perDeal.filter(
		(d) => !d.handoff.isComplete && d.handoff.requiredCount > 0
	).length;
	const cleanDealCount = perDeal.filter((d) => d.handoff.isComplete).length;
	const totalRequired = perDeal.reduce((s, d) => s + d.handoff.requiredCount, 0);
	const totalSatisfied = perDeal.reduce((s, d) => s + d.handoff.satisfiedCount, 0);
	const fulfillmentRate =
		totalRequired === 0 ? 100 : Math.round((totalSatisfied / totalRequired) * 100);
	return {
		leakCount,
		atRiskDealCount,
		cleanDealCount,
		totalDeals: deals.length,
		fulfillmentRate,
		perDeal
	};
}

/** to が from より後段（前進）の遷移かどうか。 */
export function isForwardTransition(from: DealPhase, to: DealPhase): boolean {
	return DEAL_PHASES.indexOf(to) > DEAL_PHASES.indexOf(from);
}

/**
 * 現フェーズの申し送りが完了していれば次へ進める（＝ゲートを開ける）。
 * 「漏れていたら次に進ませない」という思想の実装。
 */
export function canAdvancePhase(deal: Deal, eventLogs: EventLog[]): boolean {
	return computeDealHandoff(deal, eventLogs).isComplete;
}
