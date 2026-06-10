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

export function serializeEventLogs(logs: EventLog[]): string {
	return JSON.stringify(logs);
}

export function deserializeEventLogs(json: string): EventLog[] {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return (parsed as unknown[]).map(reviveDates) as EventLog[];
	} catch (e) {
		console.error('Failed to deserialize event logs:', e);
		return [];
	}
}

export function serializeDeals(deals: Deal[]): string {
	return JSON.stringify(deals);
}

export function deserializeDeals(json: string): Deal[] {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return (parsed as unknown[]).map(reviveDates) as Deal[];
	} catch (e) {
		console.error('Failed to deserialize deals:', e);
		return [];
	}
}

export function serializeTasks(tasks: Task[]): string {
	return JSON.stringify(tasks);
}

export function deserializeTasks(json: string): Task[] {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return (parsed as unknown[]).map(reviveDates) as Task[];
	} catch (e) {
		console.error('Failed to deserialize tasks:', e);
		return [];
	}
}

export function serializeOperationLogs(logs: OperationLog[]): string {
	return JSON.stringify(logs);
}

export function deserializeOperationLogs(json: string): OperationLog[] {
	try {
		const parsed: unknown = JSON.parse(json);
		if (!Array.isArray(parsed)) return [];
		return (parsed as unknown[]).map(reviveDates) as OperationLog[];
	} catch (e) {
		console.error('Failed to deserialize operation logs:', e);
		return [];
	}
}

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
