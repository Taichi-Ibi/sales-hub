import type { EventLog, ThreadGroup } from './types.js';

function resolveEmailThreadKey(log: EventLog): string {
	if (log.references && log.references.length > 0) return log.references[0];
	if (log.inReplyTo) return log.inReplyTo;
	return log.messageId ?? log.id;
}

export function groupByThread(eventLogs: EventLog[]): ThreadGroup[] {
	const buckets = new Map<string, EventLog[]>();

	for (const log of eventLogs) {
		if (log.isDeleted) continue;

		let key: string | null = null;

		if (log.source === 'slack' && log.threadTs) {
			key = `slack:${log.threadTs}`;
		} else if (
			log.source === 'email' &&
			(log.inReplyTo || (log.references && log.references.length > 0) || log.messageId)
		) {
			const rootId = resolveEmailThreadKey(log);
			key = `email:${rootId}`;
		}

		if (key === null) continue;

		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key)!.push(log);
	}

	const groups: ThreadGroup[] = [];

	for (const [key, messages] of buckets) {
		if (messages.length < 2) continue;

		const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		groups.push({
			id: key,
			source: key.startsWith('slack:') ? 'slack' : 'email',
			parentMessage: sorted[0],
			replies: sorted.slice(1),
			latestMessageAt: sorted[sorted.length - 1].timestamp,
			messageCount: sorted.length,
			representativeDate: sorted[0].timestamp
		});
	}

	return groups;
}

export function getThreadMessages(threadGroup: ThreadGroup): EventLog[] {
	return [threadGroup.parentMessage, ...threadGroup.replies];
}

/** スレッド内メッセージを時系列昇順で返す（表示用）。 */
export function getThreadMessagesSorted(threadGroup: ThreadGroup): EventLog[] {
	return getThreadMessages(threadGroup).sort(
		(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
	);
}
