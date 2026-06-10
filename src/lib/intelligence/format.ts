/**
 * 日時表示の共通フォーマッタ。各ルートで重複していた toLocaleString 呼び出しを集約する。
 * ロケールは ja-JP 固定。
 */

/** 月日のみ（例: 6/10）。undefined は「—」で表す。 */
export function formatDate(date: Date | undefined): string {
	if (!date) return '—';
	return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

/** 月日 + 時刻（例: 6/10 14:30）。 */
export function formatDateTime(date: Date): string {
	return date.toLocaleString('ja-JP', {
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Slack 風の相対時刻。チャットの読みやすさを優先した表記。
 * - 1分未満: 「たった今」
 * - 1時間未満: 「N分前」
 * - 今日: 「14:30」
 * - 昨日: 「昨日 14:30」
 * - それ以前: 「6/10」
 */
export function formatRelative(date: Date, now: Date = new Date()): string {
	const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
	if (diffMin >= 0 && diffMin < 1) return 'たった今';
	if (diffMin >= 1 && diffMin < 60) return `${diffMin}分前`;

	const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
	if (date.toDateString() === now.toDateString()) return time;

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return `昨日 ${time}`;

	return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

/** 年月日 + 時刻（例: 2026/6/10 14:30）。操作ログなど年が必要な箇所向け。 */
export function formatDateTimeWithYear(date: Date): string {
	return date.toLocaleString('ja-JP', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
