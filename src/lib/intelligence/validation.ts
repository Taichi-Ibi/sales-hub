import type { EventLog, TaskStatus } from './types.js';

export function isBlank(s: string): boolean {
	return /^[\s\u3000]*$/.test(s);
}

const VALID_TASK_TRANSITIONS = new Set<string>([
	'not_started→in_progress',
	'in_progress→completed',
	'completed→not_started'
]);

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
	return VALID_TASK_TRANSITIONS.has(`${from}→${to}`);
}

export function isAllowedEmailDomain(emailAddress: string, allowedDomains: string[]): boolean {
	const atIdx = emailAddress.lastIndexOf('@');
	if (atIdx === -1) return false;
	const domain = emailAddress.slice(atIdx + 1).toLowerCase();
	return allowedDomains.some((d) => {
		const allowed = d.toLowerCase();
		return domain === allowed || domain.endsWith('.' + allowed);
	});
}

export function canRejectEventLog(log: EventLog): boolean {
	return log.status !== 'rejected' && !log.isDeleted;
}

export function validateRejectionReason(reason: string): boolean {
	return !isBlank(reason);
}
