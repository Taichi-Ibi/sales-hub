import type {
	AppSettings,
	Deal,
	EventLog,
	MaskingRule,
	OperationLog,
	OperationType,
	Task,
	TaskStatus
} from './types.js';
import { applyMaskingAndApprove } from './masking-engine.js';
import { canTransitionTaskStatus, canRejectEventLog, isBlank } from './validation.js';

export interface IntelligenceState {
	eventLogs: EventLog[];
	deals: Deal[];
	tasks: Task[];
	settings: AppSettings;
	operationLogs: OperationLog[];
}

export interface ApplyDeps {
	now?: Date;
	uuid?: () => string;
	operator?: string;
}

function resolveNow(deps?: ApplyDeps): Date {
	return deps?.now ?? new Date();
}

function makeUuid(deps?: ApplyDeps): string {
	return deps?.uuid ? deps.uuid() : crypto.randomUUID();
}

function makeOpLog(
	type: OperationType,
	targetType: OperationLog['targetType'],
	targetId: string,
	now: Date,
	operator: string,
	deps?: ApplyDeps
): OperationLog {
	return {
		id: makeUuid(deps),
		operationType: type,
		operatedAt: now,
		operator,
		targetType,
		targetId
	};
}

// ─── EventLog mutators ────────────────────────────────────────────────────────

export function applyAddEventLog(
	state: IntelligenceState,
	log: EventLog,
	deps?: ApplyDeps
): IntelligenceState {
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const processed = applyMaskingAndApprove(log, state.settings.maskingRules, now);
	const opLog = makeOpLog('event_log_create', 'event_log', processed.id, now, operator, deps);
	return {
		...state,
		eventLogs: [processed, ...state.eventLogs],
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyAddEventLogSafe(
	state: IntelligenceState,
	log: EventLog,
	deps?: ApplyDeps
): IntelligenceState {
	if ((log.source === 'minutes' || log.source === 'memo') && isBlank(log.body)) {
		return state;
	}
	return applyAddEventLog(state, log, deps);
}

export function applyUpdateEventLog(
	state: IntelligenceState,
	id: string,
	updates: Partial<EventLog>,
	deps?: ApplyDeps
): IntelligenceState {
	const log = state.eventLogs.find((l) => l.id === id);
	if (!log) return state;
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const updated = { ...log, ...updates };
	const opLog = makeOpLog('event_log_edit', 'event_log', id, now, operator, deps);
	return {
		...state,
		eventLogs: state.eventLogs.map((l) => (l.id === id ? updated : l)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyDeleteEventLog(
	state: IntelligenceState,
	id: string,
	deps?: ApplyDeps
): IntelligenceState {
	const log = state.eventLogs.find((l) => l.id === id);
	if (!log) return state;
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const updated = { ...log, isDeleted: true };
	const opLog = makeOpLog('event_log_delete', 'event_log', id, now, operator, deps);
	return {
		...state,
		eventLogs: state.eventLogs.map((l) => (l.id === id ? updated : l)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyRejectEventLog(
	state: IntelligenceState,
	id: string,
	reason: string,
	rejectedBy: string,
	deps?: ApplyDeps
): IntelligenceState {
	if (isBlank(reason)) return state;
	const log = state.eventLogs.find((l) => l.id === id);
	if (!log || !canRejectEventLog(log)) return state;
	const now = resolveNow(deps);
	const updated = {
		...log,
		status: 'rejected' as const,
		rejectedAt: now,
		rejectedBy,
		rejectionReason: reason
	};
	const opLog = makeOpLog('event_log_reject', 'event_log', id, now, rejectedBy, deps);
	return {
		...state,
		eventLogs: state.eventLogs.map((l) => (l.id === id ? updated : l)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyApproveEventLog(
	state: IntelligenceState,
	id: string,
	deps?: ApplyDeps
): IntelligenceState {
	const log = state.eventLogs.find((l) => l.id === id);
	if (!log) return state;
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const processed = applyMaskingAndApprove(log, state.settings.maskingRules, now);
	const opLog = makeOpLog('event_log_approve', 'event_log', id, now, operator, deps);
	return {
		...state,
		eventLogs: state.eventLogs.map((l) => (l.id === id ? processed : l)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

// ─── Deal mutators ────────────────────────────────────────────────────────────

export interface UpdateDealOpts extends ApplyDeps {
	changeType?: 'ai_proposal_accepted' | 'manual';
}

export function applyAddDeal(
	state: IntelligenceState,
	deal: Deal,
	deps?: ApplyDeps
): IntelligenceState {
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const opLog = makeOpLog('deal_update', 'deal', deal.id, now, operator, deps);
	return {
		...state,
		deals: [deal, ...state.deals],
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyUpdateDeal(
	state: IntelligenceState,
	id: string,
	updates: Partial<Deal>,
	opts?: UpdateDealOpts
): IntelligenceState {
	const deal = state.deals.find((d) => d.id === id);
	if (!deal) return state;
	const now = resolveNow(opts);
	const operator = opts?.operator ?? 'system';
	const newPhase = updates.phase;
	const phaseChanged = newPhase !== undefined && newPhase !== deal.phase;
	const phaseHistory = phaseChanged
		? [
				...deal.phaseHistory,
				{
					fromPhase: deal.phase,
					toPhase: newPhase,
					transitionAt: now,
					operator,
					changeType: opts?.changeType ?? 'manual'
				}
			]
		: deal.phaseHistory;
	const updated: Deal = { ...deal, ...updates, phaseHistory, updatedAt: now };
	const opLog = makeOpLog('deal_update', 'deal', id, now, operator, opts);
	return {
		...state,
		deals: state.deals.map((d) => (d.id === id ? updated : d)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

// ─── Task mutators ────────────────────────────────────────────────────────────

export function applyAddTask(
	state: IntelligenceState,
	task: Task,
	deps?: ApplyDeps
): IntelligenceState {
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const opLog = makeOpLog('task_create', 'task', task.id, now, operator, deps);
	return {
		...state,
		tasks: [task, ...state.tasks],
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyApproveTask(
	state: IntelligenceState,
	id: string,
	deps?: ApplyDeps
): IntelligenceState {
	const task = state.tasks.find((t) => t.id === id);
	if (!task || !task.isProposal) return state;
	const now = resolveNow(deps);
	const updated = { ...task, isProposal: false, updatedAt: now };
	return { ...state, tasks: state.tasks.map((t) => (t.id === id ? updated : t)) };
}

export function applyRejectTask(
	state: IntelligenceState,
	id: string,
	deps?: ApplyDeps
): IntelligenceState {
	const task = state.tasks.find((t) => t.id === id);
	if (!task || !task.isProposal) return state;
	const now = resolveNow(deps);
	const updated = { ...task, rejectedAt: now, updatedAt: now };
	return { ...state, tasks: state.tasks.map((t) => (t.id === id ? updated : t)) };
}

export function applyUpdateTaskStatus(
	state: IntelligenceState,
	id: string,
	newStatus: TaskStatus,
	deps?: ApplyDeps
): IntelligenceState {
	const task = state.tasks.find((t) => t.id === id);
	if (!task) return state;
	if (!canTransitionTaskStatus(task.status, newStatus)) return state;
	const now = resolveNow(deps);
	const operator = deps?.operator ?? 'system';
	const updated = { ...task, status: newStatus, updatedAt: now };
	const opType: OperationType = newStatus === 'completed' ? 'task_complete' : 'task_create';
	const opLog = makeOpLog(opType, 'task', id, now, operator, deps);
	return {
		...state,
		tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
		operationLogs: [opLog, ...state.operationLogs]
	};
}

export function applyAddOperationLog(
	state: IntelligenceState,
	opLog: OperationLog
): IntelligenceState {
	return { ...state, operationLogs: [opLog, ...state.operationLogs] };
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export function computeUnreadCount(eventLogs: EventLog[]): number {
	return eventLogs.filter((l) => !l.isRead && !l.isDeleted).length;
}

export function computePendingTaskCount(tasks: Task[]): number {
	return tasks.filter((t) => t.status !== 'completed').length;
}

export function selectVisibleEventLogs(eventLogs: EventLog[]): EventLog[] {
	return eventLogs.filter((l) => !l.isDeleted);
}

export function selectAggregableEventLogs(eventLogs: EventLog[]): EventLog[] {
	return eventLogs.filter((l) => !l.isDeleted && l.status !== 'rejected');
}

// ─── Settings mutators ────────────────────────────────────────────────────────

export function applyUpdateSettings(
	state: IntelligenceState,
	settings: AppSettings
): IntelligenceState {
	return { ...state, settings };
}

// ─── Masking rule helpers ─────────────────────────────────────────────────────

export function applyAddMaskingRule(
	state: IntelligenceState,
	rule: MaskingRule
): IntelligenceState {
	if (isBlank(rule.pattern)) return state;
	return {
		...state,
		settings: {
			...state.settings,
			maskingRules: [...state.settings.maskingRules, rule]
		}
	};
}

export function applyAddAllowedDomain(state: IntelligenceState, domain: string): IntelligenceState {
	if (isBlank(domain)) return state;
	return {
		...state,
		settings: {
			...state.settings,
			allowedDomains: [...state.settings.allowedDomains, domain]
		}
	};
}
