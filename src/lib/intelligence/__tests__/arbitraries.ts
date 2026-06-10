import fc from 'fast-check';
import type {
	Annotation,
	AppSettings,
	Comment,
	DataSource,
	Deal,
	DealPhase,
	EventLog,
	EventLogStatus,
	MaskingRule,
	OperationLog,
	OperationType,
	Task,
	TaskPriority,
	TaskStatus
} from '../types.js';
import { DEAL_PHASES } from '../constants.js';
import type { IntelligenceState } from '../store-logic.js';

export const arbDataSource: fc.Arbitrary<DataSource> = fc.constantFrom(
	'slack' as const,
	'email' as const,
	'calendar' as const,
	'minutes' as const,
	'memo' as const
);

export const arbDate: fc.Arbitrary<Date> = fc.date({
	min: new Date('2020-01-01T00:00:00.000Z'),
	max: new Date('2030-12-31T23:59:59.999Z'),
	noInvalidDate: true
});

export const arbEventLogStatus: fc.Arbitrary<EventLogStatus> = fc.constantFrom(
	'pending' as const,
	'approved' as const,
	'rejected' as const
);

const arbAnnotation: fc.Arbitrary<Annotation> = fc.record({
	id: fc.uuid(),
	content: fc.string({ minLength: 1, maxLength: 100 }),
	author: fc.string({ minLength: 1, maxLength: 50 }),
	createdAt: arbDate
});

const arbComment: fc.Arbitrary<Comment> = fc.record({
	id: fc.uuid(),
	content: fc.string({ minLength: 1, maxLength: 100 }),
	author: fc.string({ minLength: 1, maxLength: 50 }),
	createdAt: arbDate
});

export const arbEventLog: fc.Arbitrary<EventLog> = fc
	.record({
		id: fc.uuid(),
		source: arbDataSource,
		title: fc.string({ minLength: 1, maxLength: 50 }),
		body: fc.string({ maxLength: 200 }),
		timestamp: arbDate,
		createdAt: arbDate,
		status: arbEventLogStatus,
		isMasked: fc.boolean(),
		isRead: fc.boolean(),
		isDeleted: fc.boolean(),
		annotations: fc.array(arbAnnotation, { maxLength: 3 }),
		comments: fc.array(arbComment, { maxLength: 3 })
	})
	.map((base) => ({ ...base }) as EventLog);

export const arbDealPhase: fc.Arbitrary<DealPhase> = fc.constantFrom(
	...(DEAL_PHASES as [DealPhase, ...DealPhase[]])
);

export const arbDeal: fc.Arbitrary<Deal> = fc.record({
	id: fc.uuid(),
	name: fc.string({ minLength: 1, maxLength: 50 }),
	phase: arbDealPhase,
	assignee: fc.string({ minLength: 1, maxLength: 50 }),
	createdAt: arbDate,
	updatedAt: arbDate,
	phaseHistory: fc.constant([])
});

export const arbTaskStatus: fc.Arbitrary<TaskStatus> = fc.constantFrom(
	'not_started' as const,
	'in_progress' as const,
	'completed' as const
);

export const arbTaskPriority: fc.Arbitrary<TaskPriority> = fc.constantFrom(
	'high' as const,
	'medium' as const,
	'low' as const
);

export const arbTask: fc.Arbitrary<Task> = fc.record({
	id: fc.uuid(),
	title: fc.string({ minLength: 1, maxLength: 50 }),
	status: arbTaskStatus,
	priority: arbTaskPriority,
	dueDate: arbDate,
	createdAt: arbDate,
	updatedAt: arbDate,
	source: fc.constantFrom('ai' as const, 'manual' as const),
	isProposal: fc.boolean()
});

export const arbMaskingRule: fc.Arbitrary<MaskingRule> = fc.record({
	id: fc.uuid(),
	pattern: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
		try {
			new RegExp(s);
			return true;
		} catch {
			return false;
		}
	}),
	method: fc.constantFrom('full' as const, 'partial' as const, 'keep_edges' as const),
	isEnabled: fc.boolean()
});

export function arbSlackThreadedEventLog(threadTs: string): fc.Arbitrary<EventLog> {
	return arbEventLog.map((log) => ({
		...log,
		source: 'slack' as const,
		threadTs,
		isDeleted: false
	}));
}

export function arbEmailThreadedEventLog(rootMsgId: string): fc.Arbitrary<EventLog> {
	return arbEventLog.map((log) => ({
		...log,
		source: 'email' as const,
		messageId: fc.sample(fc.uuid(), 1)[0],
		references: [rootMsgId],
		isDeleted: false
	}));
}

const OPERATION_TYPES: OperationType[] = [
	'event_log_create',
	'event_log_edit',
	'event_log_delete',
	'event_log_approve',
	'event_log_reject',
	'deal_update',
	'task_create',
	'task_complete',
	'task_delete',
	'masking_execute',
	'masking_restore'
];

export const arbOperationType: fc.Arbitrary<OperationType> = fc.constantFrom(
	...(OPERATION_TYPES as [OperationType, ...OperationType[]])
);

export const arbOperationLog: fc.Arbitrary<OperationLog> = fc.record({
	id: fc.uuid(),
	operationType: arbOperationType,
	operatedAt: arbDate,
	operator: fc.string({ minLength: 1, maxLength: 20 }),
	targetType: fc.constantFrom('event_log' as const, 'deal' as const, 'task' as const),
	targetId: fc.uuid()
});

export const arbAppSettings: fc.Arbitrary<AppSettings> = fc.record({
	maskingRules: fc.array(arbMaskingRule, { maxLength: 3 }),
	allowedDomains: fc.array(
		fc.string({ minLength: 3, maxLength: 30 }).filter((s) => s.includes('.')),
		{ maxLength: 5 }
	),
	assignmentRules: fc.constant([]),
	isAdmin: fc.boolean()
});

export const arbIntelligenceState: fc.Arbitrary<IntelligenceState> = fc.record({
	eventLogs: fc.array(arbEventLog, { maxLength: 5 }),
	deals: fc.array(arbDeal, { maxLength: 3 }),
	tasks: fc.array(arbTask, { maxLength: 5 }),
	settings: arbAppSettings,
	operationLogs: fc.array(arbOperationLog, { maxLength: 3 })
});

export const arbWhitespaceString: fc.Arbitrary<string> = fc.oneof(
	fc.constant(''),
	fc.constant(' '),
	fc.constant('  '),
	fc.constant('\t'),
	fc.constant('\n'),
	fc.constant('\u3000'),
	fc.constant('  \t  \n'),
	fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r', '\u3000') })
);
