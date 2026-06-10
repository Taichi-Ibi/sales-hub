import type { AppSettings, Deal, EventLog, OperationLog, Task, TaskStatus } from './types.js';
import { STORAGE_KEYS, VALIDATION } from './constants.js';
import {
	deserializeDeals,
	deserializeEventLogs,
	deserializeOperationLogs,
	deserializeTasks,
	safeSave,
	safeLoad
} from './serializer.js';
import { generateSeedData, getInitialSettings, isSeeded, markSeeded } from './seed-data.js';
import {
	type IntelligenceState,
	type ApplyDeps,
	type UpdateDealOpts,
	applyAddAnnotation,
	applyAddComment,
	applyAddDeal,
	applyAddEventLog,
	applyAddEventLogSafe,
	applyAddTask,
	applyApproveEventLog,
	applyApproveTask,
	applyDeleteEventLog,
	applyRejectEventLog,
	applyRejectTask,
	applyUpdateDeal,
	applyUpdateEventLog,
	applyUpdateTaskStatus,
	applyUpdateSettings
} from './store-logic.js';

function getRawItem(key: string): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(key);
}

/** localStorage が実際に読み書き可能かを検査する（Safari プライベートモード等で例外になる）。 */
function isStorageAvailable(): boolean {
	try {
		if (typeof localStorage === 'undefined') return false;
		const probe = '__si_probe__';
		localStorage.setItem(probe, '1');
		localStorage.removeItem(probe);
		return true;
	} catch {
		return false;
	}
}

let eventLogs = $state<EventLog[]>([]);
let deals = $state<Deal[]>([]);
let tasks = $state<Task[]>([]);
let settings = $state<AppSettings>(getInitialSettings());
let operationLogs = $state<OperationLog[]>([]);

/**
 * ストレージ関連の警告状態。
 * - `unavailable`: localStorage が利用不可（メモリのみで動作）
 * - `quota`: 保存容量超過（一部データが永続化されていない）
 * - `null`: 正常
 *
 * エクスポートする $state は再代入不可のため、オブジェクトのプロパティを in-place 更新する。
 */
const storageStatus = $state<{ warning: 'unavailable' | 'quota' | null }>({ warning: null });

function getState(): IntelligenceState {
	return { eventLogs, deals, tasks, settings, operationLogs };
}

// In-place mutation so exported $state variables are never reassigned
function applyState(next: IntelligenceState): void {
	eventLogs.splice(0, Infinity, ...next.eventLogs);
	deals.splice(0, Infinity, ...next.deals);
	tasks.splice(0, Infinity, ...next.tasks);
	settings.maskingRules = next.settings.maskingRules;
	settings.allowedDomains = next.settings.allowedDomains;
	settings.assignmentRules = next.settings.assignmentRules;
	settings.isAdmin = next.settings.isAdmin;
	operationLogs.splice(0, Infinity, ...next.operationLogs);
}

let _saveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSave(): void {
	if (_saveTimer !== undefined) clearTimeout(_saveTimer);
	_saveTimer = setTimeout(() => {
		const ok = [
			safeSave(STORAGE_KEYS.EVENT_LOGS, eventLogs),
			safeSave(STORAGE_KEYS.DEALS, deals),
			safeSave(STORAGE_KEYS.TASKS, tasks),
			safeSave(STORAGE_KEYS.SETTINGS, settings),
			safeSave(STORAGE_KEYS.OPERATION_LOGS, operationLogs)
		].every(Boolean);
		// localStorage 自体が使えない場合は unavailable を優先表示する
		if (storageStatus.warning !== 'unavailable') {
			storageStatus.warning = ok ? null : 'quota';
		}
		_saveTimer = undefined;
	}, VALIDATION.SAVE_DEBOUNCE_MS);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initializeFromStorage(): void {
	if (!isStorageAvailable()) {
		storageStatus.warning = 'unavailable';
	}
	const rawEventLogs = getRawItem(STORAGE_KEYS.EVENT_LOGS);
	const rawDeals = getRawItem(STORAGE_KEYS.DEALS);
	const rawTasks = getRawItem(STORAGE_KEYS.TASKS);
	const rawOperationLogs = getRawItem(STORAGE_KEYS.OPERATION_LOGS);

	eventLogs.splice(0, Infinity, ...(rawEventLogs ? deserializeEventLogs(rawEventLogs) : []));
	deals.splice(0, Infinity, ...(rawDeals ? deserializeDeals(rawDeals) : []));
	tasks.splice(0, Infinity, ...(rawTasks ? deserializeTasks(rawTasks) : []));
	const loadedSettings = safeLoad<AppSettings>(STORAGE_KEYS.SETTINGS, getInitialSettings());
	settings.maskingRules = loadedSettings.maskingRules;
	settings.allowedDomains = loadedSettings.allowedDomains;
	settings.assignmentRules = loadedSettings.assignmentRules;
	settings.isAdmin = loadedSettings.isAdmin;
	operationLogs.splice(
		0,
		Infinity,
		...(rawOperationLogs ? deserializeOperationLogs(rawOperationLogs) : [])
	);

	if (!isSeeded() && eventLogs.length === 0) {
		const seed = generateSeedData();
		eventLogs.splice(0, Infinity, ...seed.eventLogs);
		deals.splice(0, Infinity, ...seed.deals);
		tasks.splice(0, Infinity, ...seed.tasks);
		settings.maskingRules = seed.settings.maskingRules;
		settings.allowedDomains = seed.settings.allowedDomains;
		settings.assignmentRules = seed.settings.assignmentRules;
		settings.isAdmin = seed.settings.isAdmin;
		markSeeded();
		scheduleSave();
	}
}

export function clearAllData(): void {
	eventLogs.splice(0, Infinity);
	deals.splice(0, Infinity);
	tasks.splice(0, Infinity);
	const initial = getInitialSettings();
	settings.maskingRules = initial.maskingRules;
	settings.allowedDomains = initial.allowedDomains;
	settings.assignmentRules = initial.assignmentRules;
	settings.isAdmin = initial.isAdmin;
	operationLogs.splice(0, Infinity);
	safeSave(STORAGE_KEYS.EVENT_LOGS, []);
	safeSave(STORAGE_KEYS.DEALS, []);
	safeSave(STORAGE_KEYS.TASKS, []);
	safeSave(STORAGE_KEYS.SETTINGS, getInitialSettings());
	safeSave(STORAGE_KEYS.OPERATION_LOGS, []);
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(STORAGE_KEYS.SEED_INITIALIZED);
	}
}

export function addEventLog(log: EventLog, deps?: ApplyDeps): void {
	applyState(applyAddEventLog(getState(), log, deps));
	scheduleSave();
}

export function addEventLogSafe(log: EventLog, deps?: ApplyDeps): void {
	applyState(applyAddEventLogSafe(getState(), log, deps));
	scheduleSave();
}

export function updateEventLog(id: string, updates: Partial<EventLog>, deps?: ApplyDeps): void {
	applyState(applyUpdateEventLog(getState(), id, updates, deps));
	scheduleSave();
}

export function deleteEventLog(id: string, deps?: ApplyDeps): void {
	applyState(applyDeleteEventLog(getState(), id, deps));
	scheduleSave();
}

export function addAnnotation(id: string, content: string, deps?: ApplyDeps): void {
	applyState(applyAddAnnotation(getState(), id, content, deps));
	scheduleSave();
}

export function addComment(id: string, content: string, deps?: ApplyDeps): void {
	applyState(applyAddComment(getState(), id, content, deps));
	scheduleSave();
}

export function rejectEventLog(
	id: string,
	reason: string,
	rejectedBy: string,
	deps?: ApplyDeps
): void {
	applyState(applyRejectEventLog(getState(), id, reason, rejectedBy, deps));
	scheduleSave();
}

export function approveEventLog(id: string, deps?: ApplyDeps): void {
	applyState(applyApproveEventLog(getState(), id, deps));
	scheduleSave();
}

export function addDeal(deal: Deal, deps?: ApplyDeps): void {
	applyState(applyAddDeal(getState(), deal, deps));
	scheduleSave();
}

export function updateDeal(id: string, updates: Partial<Deal>, opts?: UpdateDealOpts): void {
	applyState(applyUpdateDeal(getState(), id, updates, opts));
	scheduleSave();
}

export function addTask(task: Task, deps?: ApplyDeps): void {
	applyState(applyAddTask(getState(), task, deps));
	scheduleSave();
}

export function approveTask(id: string, deps?: ApplyDeps): void {
	applyState(applyApproveTask(getState(), id, deps));
	scheduleSave();
}

export function rejectTask(id: string, deps?: ApplyDeps): void {
	applyState(applyRejectTask(getState(), id, deps));
	scheduleSave();
}

export function updateTaskStatus(id: string, newStatus: TaskStatus, deps?: ApplyDeps): void {
	applyState(applyUpdateTaskStatus(getState(), id, newStatus, deps));
	scheduleSave();
}

export function saveSettings(newSettings: AppSettings): void {
	applyState(applyUpdateSettings(getState(), newSettings));
	scheduleSave();
}

/**
 * 論理削除済みの Event_Log を物理削除する。容量超過時の削除候補として提示する。
 * @returns 削除した件数
 */
export function purgeDeletedEventLogs(): number {
	const removed = eventLogs.filter((l) => l.isDeleted).length;
	if (removed === 0) return 0;
	eventLogs.splice(0, Infinity, ...eventLogs.filter((l) => !l.isDeleted));
	// 即時保存を試み、成功すれば quota 警告を解除する
	const ok = safeSave(STORAGE_KEYS.EVENT_LOGS, eventLogs);
	if (ok && storageStatus.warning === 'quota') storageStatus.warning = null;
	return removed;
}

export { eventLogs, deals, tasks, settings, operationLogs, storageStatus };
