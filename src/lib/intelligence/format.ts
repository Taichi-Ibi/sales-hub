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
