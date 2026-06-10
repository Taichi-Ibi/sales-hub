export type DataSource = 'slack' | 'email' | 'calendar' | 'minutes' | 'memo';
export type EventLogStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalType =
	| 'auto_masking_complete'
	| 'auto_manual_masking_complete'
	| 'auto_no_masking_needed';

export interface Annotation {
	id: string;
	content: string; // 最大1000文字
	author: string;
	createdAt: Date;
}

export interface Comment {
	id: string;
	content: string; // 最大500文字
	author: string;
	createdAt: Date;
}

export interface EventLog {
	id: string;
	source: DataSource;
	title: string; // 最大200文字
	body: string;
	timestamp: Date;
	createdAt: Date;

	// Slack固有
	slackSender?: string;
	slackChannel?: string;
	threadTs?: string;

	// メール固有
	emailFrom?: string;
	emailTo?: string;
	emailSubject?: string;
	messageId?: string;
	inReplyTo?: string;
	references?: string[];

	// カレンダー固有
	eventName?: string;
	startTime?: Date;
	endTime?: Date;
	attendees?: string[];
	location?: string;

	// 関連
	dealId?: string;

	// ステータス
	status: EventLogStatus;
	approvalType?: ApprovalType;
	approvalAt?: Date;
	rejectedBy?: string;
	rejectedAt?: Date;
	rejectionReason?: string;

	// マスキング
	maskedBody?: string;
	originalBody?: string;
	isMasked: boolean;

	// 追記・コメント (non-optional: 空配列で初期化)
	annotations: Annotation[];
	comments: Comment[];

	// 状態フラグ
	isRead: boolean;
	isDeleted: boolean;
}

export type DealPhase =
	| 'qualification'
	| 'issue_identification'
	| 'value_proposition'
	| 'decision_maker'
	| 'risk_elimination'
	| 'contract_agreement'
	| 'administration'
	| 'closed_won';

export interface PhaseTransition {
	fromPhase: DealPhase;
	toPhase: DealPhase;
	transitionAt: Date;
	operator: string;
	changeType: 'ai_proposal_accepted' | 'manual';
}

export interface DealSummary {
	text: string; // 最大500文字
	generatedAt: Date;
	periodStart: Date;
	periodEnd: Date;
	hasUpdates: boolean;
}

export interface Deal {
	id: string;
	name: string;
	phase: DealPhase;
	assignee: string;
	createdAt: Date;
	updatedAt: Date;
	summary?: DealSummary;
	phaseHistory: PhaseTransition[];
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
	id: string;
	title: string;
	dealId?: string;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate?: Date;
	createdAt: Date;
	updatedAt: Date;
	source: 'ai' | 'manual';
	isProposal: boolean;
	rejectedAt?: Date;
}

export interface ThreadGroup {
	id: string;
	source: 'slack' | 'email';
	parentMessage: EventLog;
	replies: EventLog[];
	latestMessageAt: Date;
	messageCount: number;
	representativeDate: Date;
}

export interface MaskingRule {
	id: string;
	pattern: string;
	method: 'full' | 'partial' | 'keep_edges';
	isEnabled: boolean;
}

export interface MaskingResult {
	maskedText: string;
	originalText: string;
	maskedRanges: Array<{ start: number; end: number }>;
}

export interface AssignmentRule {
	id: string;
	keyword: string;
	assignee: string;
}

export interface AppSettings {
	maskingRules: MaskingRule[];
	allowedDomains: string[]; // 最大50件
	assignmentRules: AssignmentRule[];
	isAdmin: boolean;
}

export type OperationType =
	| 'event_log_create'
	| 'event_log_edit'
	| 'event_log_delete'
	| 'event_log_approve'
	| 'event_log_reject'
	| 'deal_update'
	| 'task_create'
	| 'task_complete'
	| 'task_delete'
	| 'masking_execute'
	| 'masking_restore';

export interface OperationLog {
	id: string;
	operationType: OperationType;
	operatedAt: Date;
	operator: string;
	targetType: 'event_log' | 'deal' | 'task';
	targetId: string;
}

export interface SearchResult {
	type: 'event_log' | 'deal' | 'task';
	id: string;
	title: string;
	excerpt: string;
	relevanceScore: number; // 0〜100
}

export interface PhaseChangeProposal {
	dealId: string;
	currentPhase: DealPhase;
	proposedPhase: DealPhase;
	reasoning: string;
}

export interface DataUpdateProposal {
	id: string;
	dealId: string;
	field: string;
	currentValue: string;
	proposedValue: string;
	sourceEventLogId: string;
}

export interface RetrospectiveResult {
	eventLogCount: number;
	taskCompletedCount: number;
	taskPendingCount: number;
	phaseChanges: PhaseTransition[];
	activityPattern: Record<DataSource, number>;
	suggestions: string[]; // 1〜3件
}

export interface Reminder {
	taskId: string;
	isDismissed: boolean;
}
