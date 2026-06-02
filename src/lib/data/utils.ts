import { TODAY } from './mock';
import type { Triage, Vital } from './types';

const MS_PER_DAY = 86_400_000;

/** 金額を「¥1,800万」「¥980万」のように表示 */
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

/** バイタル値の状態（正常/注意/警告） */
export function vitalStatus(v: Vital): 'normal' | 'caution' | 'alert' {
	if (v.value >= v.low) return 'normal';
	if (v.value >= v.low - 15) return 'caution';
	return 'alert';
}

export const triageLabel: Record<Triage, string> = {
	critical: '要対応',
	warning: '注意',
	stable: '順調'
};

export const triageOrder: Record<Triage, number> = {
	critical: 0,
	warning: 1,
	stable: 2
};

export const channelIcon: Record<string, string> = {
	訪問: '🚪',
	オンライン: '💻',
	電話: '📞',
	メール: '✉️'
};
