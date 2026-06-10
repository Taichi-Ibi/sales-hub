import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { groupByThread, getThreadMessages } from '../thread-grouper.js';
import { arbEventLog, arbSlackThreadedEventLog, arbEmailThreadedEventLog } from './arbitraries.js';

describe('Property 2: スレッドグループ化の正確性', () => {
	it('同一 thread_ts を持つ Slack メッセージ2件以上は同一 ThreadGroup に入る', () => {
		fc.assert(
			fc.property(
				fc.uuid(),
				fc.array(arbSlackThreadedEventLog('thread-123'), { minLength: 2, maxLength: 5 }),
				(_threadTs, messages) => {
					const groups = groupByThread(messages);
					expect(groups).toHaveLength(1);
					expect(groups[0].source).toBe('slack');
					expect(groups[0].messageCount).toBe(messages.length);
					const allIds = getThreadMessages(groups[0]).map((m) => m.id);
					for (const msg of messages) {
						expect(allIds).toContain(msg.id);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	it('異なる thread_ts は別 ThreadGroup になる', () => {
		fc.assert(
			fc.property(
				fc.array(arbSlackThreadedEventLog('thread-A'), { minLength: 2, maxLength: 3 }),
				fc.array(arbSlackThreadedEventLog('thread-B'), { minLength: 2, maxLength: 3 }),
				(groupA, groupB) => {
					const groups = groupByThread([...groupA, ...groupB]);
					expect(groups).toHaveLength(2);
					const ids = groups.map((g) => g.id);
					expect(ids).toContain('slack:thread-A');
					expect(ids).toContain('slack:thread-B');
				}
			),
			{ numRuns: 100 }
		);
	});

	it('メールの References チェーンが同一 ThreadGroup に入る', () => {
		fc.assert(
			fc.property(
				fc.uuid(),
				fc.array(arbEmailThreadedEventLog('root-msg-id'), { minLength: 2, maxLength: 5 }),
				(_rootId, messages) => {
					const groups = groupByThread(messages);
					expect(groups).toHaveLength(1);
					expect(groups[0].source).toBe('email');
					expect(groups[0].messageCount).toBe(messages.length);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('スレッド識別子を持たない単独メッセージは ThreadGroup に含まれない', () => {
		fc.assert(
			fc.property(
				fc.array(
					arbEventLog.map((log) => ({
						...log,
						source: 'memo' as const,
						threadTs: undefined,
						messageId: undefined,
						inReplyTo: undefined,
						references: undefined,
						isDeleted: false
					})),
					{ minLength: 1, maxLength: 5 }
				),
				(standalones) => {
					const groups = groupByThread(standalones);
					expect(groups).toHaveLength(0);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('グループ内1件のみのものは ThreadGroup 化されない', () => {
		fc.assert(
			fc.property(arbSlackThreadedEventLog('only-one'), (singleMsg) => {
				const groups = groupByThread([singleMsg]);
				expect(groups).toHaveLength(0);
			}),
			{ numRuns: 100 }
		);
	});

	it('getThreadMessages はメッセージを timestamp 昇順で返す', () => {
		fc.assert(
			fc.property(
				fc.array(arbSlackThreadedEventLog('ts-order'), { minLength: 2, maxLength: 5 }),
				(messages) => {
					const groups = groupByThread(messages);
					if (groups.length === 0) return;
					const msgs = getThreadMessages(groups[0]);
					for (let i = 1; i < msgs.length; i++) {
						expect(msgs[i].timestamp.getTime()).toBeGreaterThanOrEqual(
							msgs[i - 1].timestamp.getTime()
						);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	it('isDeleted なメッセージは除外される', () => {
		fc.assert(
			fc.property(
				fc.array(arbSlackThreadedEventLog('deleted-test'), { minLength: 2, maxLength: 5 }),
				(messages) => {
					const withDeleted = messages.map((m) => ({ ...m, isDeleted: true }));
					const groups = groupByThread(withDeleted);
					expect(groups).toHaveLength(0);
				}
			),
			{ numRuns: 100 }
		);
	});
});
