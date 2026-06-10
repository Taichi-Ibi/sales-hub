import type { DataSource, EventLog, EventLogStatus, TaskStatus, TaskPriority } from './types.js';

/**
 * 画面表示用のラベル・アイコン・CSS クラスのマッピング。
 * 複数ルートで重複定義されていたものをここに集約する。
 */

/** データソースを表す絵文字アイコン。 */
export const sourceIcons: Record<DataSource, string> = {
	slack: '💬',
	email: '✉️',
	calendar: '📅',
	minutes: '📝',
	memo: '🗒️'
};

/** データソースの日本語ラベル（フィルタや差出人表示で使う）。 */
export const sourceLabel: Record<DataSource, string> = {
	slack: 'Slack',
	email: 'メール',
	calendar: 'カレンダー',
	minutes: '議事録',
	memo: 'メモ'
};

/**
 * メッセージの差出人として表示する名前を返す。
 * Slack は送信者名、メールは差出人のローカル部、それ以外はソース名。
 */
export function messageSender(log: EventLog): string {
	if (log.slackSender) return log.slackSender;
	if (log.emailFrom) return log.emailFrom.split('@')[0];
	return sourceLabel[log.source];
}

/** Event_Log の承認ステータスの日本語ラベル。 */
export const eventLogStatusLabel: Record<EventLogStatus, string> = {
	pending: '未承認',
	approved: '承認済',
	rejected: '却下'
};

/** Event_Log の承認ステータスの CSS クラス。 */
export const eventLogStatusClass: Record<EventLogStatus, string> = {
	pending: 'status-pending',
	approved: 'status-approved',
	rejected: 'status-rejected'
};

/** タスクステータスの日本語ラベル。 */
export const taskStatusLabel: Record<TaskStatus, string> = {
	not_started: '未着手',
	in_progress: '進行中',
	completed: '完了'
};

/** 優先度の日本語ラベル。 */
export const priorityLabel: Record<TaskPriority, string> = {
	high: '高',
	medium: '中',
	low: '低'
};
