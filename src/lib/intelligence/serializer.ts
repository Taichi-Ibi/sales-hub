import type { EventLog, Deal, Task, OperationLog } from './types.js';

const DATE_FIELDS = new Set<string>([
	'timestamp',
	'createdAt',
	'updatedAt',
	'startTime',
	'endTime',
	'approvalAt',
	'rejectedAt',
	'dueDate',
	'transitionAt',
	'generatedAt',
	'periodStart',
	'periodEnd',
	'operatedAt'
]);

function reviveDates<T>(obj: T): T {
	if (obj === null || typeof obj !== 'object') return obj;
	if (obj instanceof Date) return obj;
	if (Array.isArray(obj)) return obj.map(reviveDates) as T;
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		if (DATE_FIELDS.has(key) && typeof value === 'string') {
			result[key] = new Date(value);
		} else if (typeof value === 'object' && value !== null) {
			result[key] = reviveDates(value);
		} else {
			result[key] = value;
		}
	}
	return result as T;
}

/**
 * JSON 配列をデシリアライズし、日時フィールドを Date に復元する汎用ヘルパー。
 * パース失敗・非配列の場合は空配列を返し、`label` を含むエラーをコンソールに出力する。
 */
function deserializeArray<T>(json: string, label: string): T[] {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return (parsed as unknown[]).map(reviveDates) as T[];
	} catch (e) {
		console.error(`Failed to deserialize ${label}:`, e);
		return [];
	}
}

export const serializeEventLogs = (logs: EventLog[]): string => JSON.stringify(logs);
export const deserializeEventLogs = (json: string): EventLog[] =>
	deserializeArray<EventLog>(json, 'event logs');

export const serializeDeals = (deals: Deal[]): string => JSON.stringify(deals);
export const deserializeDeals = (json: string): Deal[] => deserializeArray<Deal>(json, 'deals');

export const serializeTasks = (tasks: Task[]): string => JSON.stringify(tasks);
export const deserializeTasks = (json: string): Task[] => deserializeArray<Task>(json, 'tasks');

export const serializeOperationLogs = (logs: OperationLog[]): string => JSON.stringify(logs);
export const deserializeOperationLogs = (json: string): OperationLog[] =>
	deserializeArray<OperationLog>(json, 'operation logs');

export function safeSave(key: string, data: unknown): boolean {
	try {
		if (typeof localStorage === 'undefined') return false;
		localStorage.setItem(key, JSON.stringify(data));
		return true;
	} catch (e) {
		if (e instanceof DOMException && e.name === 'QuotaExceededError') {
			console.warn('localStorage quota exceeded for key:', key);
			return false;
		}
		console.error('localStorage save failed:', e);
		return false;
	}
}

export function safeLoad<T>(key: string, fallback: T): T {
	try {
		if (typeof localStorage === 'undefined') return fallback;
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		return JSON.parse(raw) as T;
	} catch (e) {
		console.error(`Failed to parse localStorage key "${key}":`, e);
		return fallback;
	}
}
