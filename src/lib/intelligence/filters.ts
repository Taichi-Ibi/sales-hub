import type { DataSource, EventLog } from './types.js';

/**
 * 複合フィルタ条件。未指定（undefined / null / 空）の項目は無視される。
 * 指定された全条件はAND結合で評価される (Task 18.2 / Property 17)。
 */
export interface EventLogFilter {
	startDate?: Date | null;
	endDate?: Date | null;
	sources?: DataSource[];
	dealId?: string | null;
	keyword?: string;
}

function matchesKeyword(log: EventLog, keyword: string): boolean {
	const kw = keyword.trim().toLowerCase();
	if (kw.length === 0) return true;
	return `${log.title} ${log.body}`.toLowerCase().includes(kw);
}

/**
 * EventLog配列を複合条件でフィルタリングする純粋関数。
 * 期間（開始日・終了日）・データソース種別・Deal・キーワード（本文部分一致）で
 * 絞り込み、すべての条件を同時に満たすものだけを返す。
 */
export function filterEventLogs(logs: EventLog[], filter: EventLogFilter): EventLog[] {
	return logs.filter((log) => {
		if (filter.startDate && log.timestamp.getTime() < filter.startDate.getTime()) return false;
		if (filter.endDate && log.timestamp.getTime() > filter.endDate.getTime()) return false;
		if (filter.sources && filter.sources.length > 0 && !filter.sources.includes(log.source))
			return false;
		if (filter.dealId && log.dealId !== filter.dealId) return false;
		if (filter.keyword !== undefined && !matchesKeyword(log, filter.keyword)) return false;
		return true;
	});
}
