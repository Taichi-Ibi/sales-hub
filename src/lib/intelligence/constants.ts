import type { DealPhase } from './types.js';

export const VALIDATION = {
	EVENT_LOG_BODY_MAX: 10000,
	MEMO_BODY_MAX: 5000,
	SLACK_BODY_MAX: 4000,
	EMAIL_SUBJECT_MAX: 200,
	ANNOTATION_MAX: 1000,
	COMMENT_MAX: 500,
	SUMMARY_MAX: 500,
	DOMAIN_MAX: 253,

	ALLOWED_DOMAINS_MAX: 50,
	SEARCH_RESULTS_MAX: 20,
	AI_TASKS_MIN: 1,
	AI_TASKS_MAX: 3,
	SUGGESTIONS_MIN: 1,
	SUGGESTIONS_MAX: 3,
	PAGE_SIZE: 50,
	DASHBOARD_TASKS_MAX: 5,
	REMINDERS_MAX: 10,

	REMINDER_THRESHOLD_HOURS: 24,
	DASHBOARD_EVENTS_HOURS: 24,
	DASHBOARD_TASKS_HOURS: 72,
	REMINDER_CHECK_INTERVAL_SEC: 60,
	SAVE_DEBOUNCE_MS: 3000
} as const;

/** 現在の操作ユーザー（モック）。操作ログ・却下者・追記者の記録に使用する。 */
export const CURRENT_USER = '田中太郎';

export const STORAGE_KEYS = {
	EVENT_LOGS: 'si_event_logs',
	DEALS: 'si_deals',
	TASKS: 'si_tasks',
	SETTINGS: 'si_settings',
	OPERATION_LOGS: 'si_operation_logs',
	SEED_INITIALIZED: 'si_seed_initialized',
	DISMISSED_REMINDERS: 'si_dismissed_reminders'
} as const;

export const PHASE_LABELS: Record<DealPhase, string> = {
	qualification: '商談の見極め',
	issue_identification: '課題の特定',
	value_proposition: 'メリットの訴求',
	decision_maker: '意思決定者の賛同',
	risk_elimination: 'リスクの排除',
	contract_agreement: '契約合意',
	administration: '事務処理',
	closed_won: '受注成約完了'
};

export const DEAL_PHASES: DealPhase[] = [
	'qualification',
	'issue_identification',
	'value_proposition',
	'decision_maker',
	'risk_elimination',
	'contract_agreement',
	'administration',
	'closed_won'
];
