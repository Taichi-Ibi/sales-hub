// 表示用の小さなヘルパー（バッジ色・日時整形・イベントラベル）

import { MAIN_FLOW } from './types';
import type { EventType, LegalStatus, MainStatus, ResourceStatus } from './types';

/** ステッパー表示用: 現在ステータスが MAIN_FLOW の index i に到達/通過済みか */
export function MAIN_FLOW_PROGRESS(status: MainStatus, i: number): boolean {
	if (status === '受注' || status === '失注') return true; // クローズ済みは全工程通過
	return MAIN_FLOW.indexOf(status) >= i;
}

export function statusColor(s: MainStatus): string {
	switch (s) {
		case 'リード':
			return 'gray';
		case '商談':
			return 'blue';
		case '提案':
			return 'purple';
		case '受注':
			return 'green';
		case '失注':
			return 'red';
	}
}

export function legalColor(s: LegalStatus): string {
	switch (s) {
		case '未依頼':
			return 'gray';
		case '依頼中':
			return 'amber';
		case '承認':
			return 'green';
		case '差し戻し':
			return 'red';
	}
}

export function resourceColor(s: ResourceStatus): string {
	switch (s) {
		case '未登録':
			return 'gray';
		case '登録済':
			return 'blue';
		case '手配中':
			return 'amber';
		case '対応済':
			return 'green';
	}
}

const fmt = new Intl.DateTimeFormat('ja-JP', {
	month: 'numeric',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

export function formatDateTime(iso: string): string {
	return fmt.format(new Date(iso));
}

const fmtDate = new Intl.DateTimeFormat('ja-JP', {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric'
});
export function formatDate(iso: string): string {
	return fmtDate.format(new Date(iso));
}

export const EVENT_LABEL: Record<EventType, string> = {
	deal_created: '案件作成',
	status_changed: 'ステータス遷移',
	interaction_logged: 'やり取り記録',
	briefing_updated: '申し送り更新',
	confidential_set: '機密設定',
	legal_requested: '法務依頼',
	legal_resolved: '法務完了',
	resource_requested: 'リソース要件登録',
	resource_responded: 'リソース対応',
	pm_handoff: 'PMハンドオフ',
	deal_closed: 'クローズ'
};

export function eventColor(t: EventType): string {
	switch (t) {
		case 'deal_created':
			return 'blue';
		case 'legal_requested':
		case 'resource_requested':
			return 'amber';
		case 'legal_resolved':
		case 'resource_responded':
		case 'pm_handoff':
			return 'green';
		case 'deal_closed':
			return 'purple';
		case 'confidential_set':
			return 'red';
		default:
			return 'gray';
	}
}
