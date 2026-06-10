import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	computeUnreadCount,
	computePendingTaskCount,
	selectVisibleEventLogs,
	selectAggregableEventLogs,
	applyUpdateTaskStatus,
	applyUpdateDeal
} from '../store-logic.js';
import {
	generateSeedData,
	getInitialSettings,
	seedIfNeeded,
	type SeedState
} from '../seed-data.js';
import { canTransitionTaskStatus, isAllowedEmailDomain } from '../validation.js';
import {
	arbEventLog,
	arbDeal,
	arbTask,
	arbTaskStatus,
	arbDealPhase,
	arbIntelligenceState
} from './arbitraries.js';
import type { IntelligenceState } from '../store-logic.js';

function emptyState(): IntelligenceState {
	return { eventLogs: [], deals: [], tasks: [], settings: getInitialSettings(), operationLogs: [] };
}

function fixedDeps() {
	let counter = 0;
	return {
		now: () => new Date('2026-06-10T09:00:00Z'),
		uuid: () => `seed-uuid-${counter++}`
	};
}

// ─── Property 7: Badge件数の正確性 ────────────────────────────────────────────

describe('Property 7: Badge件数の正確性', () => {
	it('computeUnreadCount = !isRead && !isDeleted の件数', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 20 }), (logs) => {
				const expected = logs.filter((l) => !l.isRead && !l.isDeleted).length;
				expect(computeUnreadCount(logs)).toBe(expected);
			}),
			{ numRuns: 200 }
		);
	});

	it('computePendingTaskCount = status !== completed の件数', () => {
		fc.assert(
			fc.property(fc.array(arbTask, { maxLength: 20 }), (tasks) => {
				const expected = tasks.filter((t) => t.status !== 'completed').length;
				expect(computePendingTaskCount(tasks)).toBe(expected);
			}),
			{ numRuns: 200 }
		);
	});

	it('件数0件はcomputeUnreadCountが0を返す', () => {
		expect(computeUnreadCount([])).toBe(0);
		expect(computePendingTaskCount([])).toBe(0);
	});
});

// ─── Property 8: シードデータ投入の冪等性 ─────────────────────────────────────

describe('Property 8: シードデータ投入の冪等性', () => {
	it('seedIfNeeded(seedIfNeeded(state)) === seedIfNeeded(state)', () => {
		fc.assert(
			fc.property(fc.boolean(), (alreadySeeded) => {
				const deps = fixedDeps();
				const initial: SeedState = {
					eventLogs: [],
					deals: [],
					tasks: [],
					settings: getInitialSettings(),
					isSeeded: alreadySeeded
				};
				const once = seedIfNeeded(initial, deps);
				// Reset counter to simulate same deps for second call
				const deps2 = fixedDeps();
				const twice = seedIfNeeded(once, deps2);

				// Second call never changes event count (already seeded or no data change)
				expect(twice.eventLogs.length).toBe(once.eventLogs.length);
				expect(twice.deals.length).toBe(once.deals.length);
				expect(twice.tasks.length).toBe(once.tasks.length);
				expect(twice.isSeeded).toBe(once.isSeeded);
			}),
			{ numRuns: 20 }
		);
	});

	it('未シード状態では既存データがある場合にシードしない', () => {
		const deps = fixedDeps();
		const existingEventLog = fc.sample(arbEventLog, 1)[0];
		const stateWithData: SeedState = {
			eventLogs: [existingEventLog],
			deals: [],
			tasks: [],
			settings: getInitialSettings(),
			isSeeded: false
		};
		const result = seedIfNeeded(stateWithData, deps);
		expect(result.eventLogs.length).toBe(1);
		expect(result.isSeeded).toBe(false);
	});

	it('generateSeedDataは最低件数の制約を満たす', () => {
		const seed = generateSeedData(fixedDeps());
		const slack = seed.eventLogs.filter((l) => l.source === 'slack');
		const email = seed.eventLogs.filter((l) => l.source === 'email');
		const calendar = seed.eventLogs.filter((l) => l.source === 'calendar');

		expect(slack.length).toBeGreaterThanOrEqual(5);
		expect(email.length).toBeGreaterThanOrEqual(10);
		expect(calendar.length).toBeGreaterThanOrEqual(5);
		expect(seed.deals.length).toBe(4);

		// 2スレッド以上のSlack
		const slackThreads = new Set(slack.map((l) => l.threadTs).filter(Boolean));
		expect(slackThreads.size).toBeGreaterThanOrEqual(2);

		// メールスレッド: inReplyToを持つものが存在
		const emailThreaded = email.filter((l) => l.inReplyTo);
		expect(emailThreaded.length).toBeGreaterThanOrEqual(3);

		// 4件の案件が異なるフェーズ
		const phases = new Set(seed.deals.map((d) => d.phase));
		expect(phases.size).toBe(4);
	});
});

// ─── Property 9: メールドメインフィルタリング ──────────────────────────────────

describe('Property 9: メールドメインフィルタリング', () => {
	it('部分文字列ではなくサフィックス一致で判定する', () => {
		// "notbigcorp.com" は "bigcorp.com" の部分文字列だが許可しない
		expect(isAllowedEmailDomain('user@notbigcorp.com', ['bigcorp.com'])).toBe(false);
		// "mail.bigcorp.com" はサフィックス一致で許可
		expect(isAllowedEmailDomain('user@mail.bigcorp.com', ['bigcorp.com'])).toBe(true);
		// 完全一致も許可
		expect(isAllowedEmailDomain('user@bigcorp.com', ['bigcorp.com'])).toBe(true);
		// 空の許可リストは全て拒否
		expect(isAllowedEmailDomain('user@bigcorp.com', [])).toBe(false);
	});

	it('isAllowedEmailDomain property: サフィックス一致のみ許可', () => {
		fc.assert(
			fc.property(
				fc.emailAddress(),
				fc.array(fc.domain(), { minLength: 0, maxLength: 5 }),
				(email, domains) => {
					const domain = email.substring(email.lastIndexOf('@') + 1).toLowerCase();
					const expected = domains.some((d) => {
						const allowed = d.toLowerCase();
						return domain === allowed || domain.endsWith('.' + allowed);
					});
					expect(isAllowedEmailDomain(email, domains)).toBe(expected);
				}
			),
			{ numRuns: 300 }
		);
	});

	it('シードメールの受信メール(inReplyToなし)は許可ドメインから送信されている', () => {
		const seed = generateSeedData(fixedDeps());
		const { allowedDomains } = seed.settings;
		// スレッド起点メール (inReplyToなし) は外部クライアントからの受信メール
		const incomingEmails = seed.eventLogs.filter((l) => l.source === 'email' && !l.inReplyTo);

		for (const log of incomingEmails) {
			if (log.emailFrom) {
				expect(isAllowedEmailDomain(log.emailFrom, allowedDomains)).toBe(true);
			}
		}
	});
});

// ─── Property 10: ステータスに基づく表示制御 ───────────────────────────────────

describe('Property 10: ステータスに基づく表示制御', () => {
	it('論理削除されたEventLogはselectVisibleEventLogsから除外される', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 20 }), (logs) => {
				const visible = selectVisibleEventLogs(logs);
				expect(visible.every((l) => !l.isDeleted)).toBe(true);
			}),
			{ numRuns: 200 }
		);
	});

	it('selectVisibleEventLogsは非削除のみを返す', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 20 }), (logs) => {
				const visible = selectVisibleEventLogs(logs);
				const expected = logs.filter((l) => !l.isDeleted).length;
				expect(visible.length).toBe(expected);
			}),
			{ numRuns: 200 }
		);
	});

	it('却下済みEventLogはselectAggregableEventLogsから除外される', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 20 }), (logs) => {
				const aggregable = selectAggregableEventLogs(logs);
				expect(aggregable.every((l) => !l.isDeleted && l.status !== 'rejected')).toBe(true);
			}),
			{ numRuns: 200 }
		);
	});

	it('isDeleted=trueのログはunreadCountに加算されない', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 20 }), (logs) => {
				const deletedUnread = logs.filter((l) => l.isDeleted && !l.isRead).length;
				const count = computeUnreadCount(logs);
				const withoutDeleted = logs.filter((l) => !l.isDeleted && !l.isRead).length;
				expect(count).toBe(withoutDeleted);
				// ensure deleted items don't inflate the count
				if (deletedUnread > 0) {
					expect(count).toBeLessThan(logs.filter((l) => !l.isRead).length);
				}
			}),
			{ numRuns: 200 }
		);
	});
});

// ─── Property 11: タスクステータス遷移の妥当性 ────────────────────────────────

describe('Property 11: タスクステータス遷移の妥当性', () => {
	it('有効な3パターンの遷移のみtrue', () => {
		expect(canTransitionTaskStatus('not_started', 'in_progress')).toBe(true);
		expect(canTransitionTaskStatus('in_progress', 'completed')).toBe(true);
		expect(canTransitionTaskStatus('completed', 'not_started')).toBe(true);

		expect(canTransitionTaskStatus('not_started', 'completed')).toBe(false);
		expect(canTransitionTaskStatus('in_progress', 'not_started')).toBe(false);
		expect(canTransitionTaskStatus('completed', 'in_progress')).toBe(false);

		expect(canTransitionTaskStatus('not_started', 'not_started')).toBe(false);
		expect(canTransitionTaskStatus('in_progress', 'in_progress')).toBe(false);
		expect(canTransitionTaskStatus('completed', 'completed')).toBe(false);
	});

	it('applyUpdateTaskStatus: 有効遷移はstatusを更新する', () => {
		fc.assert(
			fc.property(arbTask, arbTaskStatus, (task, newStatus) => {
				const state: IntelligenceState = { ...emptyState(), tasks: [task] };
				const result = applyUpdateTaskStatus(state, task.id, newStatus);

				if (canTransitionTaskStatus(task.status, newStatus)) {
					expect(result.tasks[0].status).toBe(newStatus);
				} else {
					expect(result.tasks[0].status).toBe(task.status);
				}
			}),
			{ numRuns: 300 }
		);
	});

	it('applyUpdateTaskStatus: 無効遷移ではoperationLogsが増えない', () => {
		fc.assert(
			fc.property(arbTask, arbTaskStatus, (task, newStatus) => {
				fc.pre(!canTransitionTaskStatus(task.status, newStatus));
				const state: IntelligenceState = { ...emptyState(), tasks: [task] };
				const result = applyUpdateTaskStatus(state, task.id, newStatus);
				expect(result.operationLogs.length).toBe(0);
			}),
			{ numRuns: 200 }
		);
	});

	it('任意のstate: 有効遷移のみoperationLogsが増える', () => {
		fc.assert(
			fc.property(arbIntelligenceState, arbTaskStatus, (state, newStatus) => {
				if (state.tasks.length === 0) return;
				const task = state.tasks[0];
				const result = applyUpdateTaskStatus(state, task.id, newStatus);

				if (canTransitionTaskStatus(task.status, newStatus)) {
					expect(result.operationLogs.length).toBe(state.operationLogs.length + 1);
				} else {
					expect(result.operationLogs.length).toBe(state.operationLogs.length);
				}
			}),
			{ numRuns: 200 }
		);
	});
});

// ─── Property 15: フェーズ遷移履歴の記録 ─────────────────────────────────────

describe('Property 15: フェーズ遷移履歴の記録', () => {
	it('フェーズ変更時にphaseHistoryにエントリが追記される', () => {
		fc.assert(
			fc.property(arbDeal, arbDealPhase, arbDealPhase, (deal, fromPhase, toPhase) => {
				fc.pre(fromPhase !== toPhase);
				const dealWithPhase = { ...deal, phase: fromPhase };
				const state: IntelligenceState = { ...emptyState(), deals: [dealWithPhase] };
				const now = new Date('2026-06-10T09:00:00Z');

				const result = applyUpdateDeal(
					state,
					dealWithPhase.id,
					{ phase: toPhase },
					{
						now,
						operator: 'テストユーザー',
						changeType: 'manual'
					}
				);

				const updated = result.deals.find((d) => d.id === dealWithPhase.id);
				expect(updated?.phase).toBe(toPhase);
				expect(updated?.phaseHistory.length).toBe(dealWithPhase.phaseHistory.length + 1);

				const last = updated?.phaseHistory[updated.phaseHistory.length - 1];
				expect(last?.fromPhase).toBe(fromPhase);
				expect(last?.toPhase).toBe(toPhase);
				expect(last?.operator).toBe('テストユーザー');
				expect(last?.changeType).toBe('manual');
				expect(last?.transitionAt).toEqual(now);
			}),
			{ numRuns: 200 }
		);
	});

	it('ai_proposal_acceptedでの遷移もphaseHistoryに記録される', () => {
		fc.assert(
			fc.property(arbDeal, arbDealPhase, arbDealPhase, (deal, fromPhase, toPhase) => {
				fc.pre(fromPhase !== toPhase);
				const dealWithPhase = { ...deal, phase: fromPhase };
				const state: IntelligenceState = { ...emptyState(), deals: [dealWithPhase] };

				const result = applyUpdateDeal(
					state,
					dealWithPhase.id,
					{ phase: toPhase },
					{
						operator: 'AI',
						changeType: 'ai_proposal_accepted'
					}
				);

				const last = result.deals[0].phaseHistory[result.deals[0].phaseHistory.length - 1];
				expect(last?.changeType).toBe('ai_proposal_accepted');
			}),
			{ numRuns: 100 }
		);
	});

	it('提案却下 (フェーズ変更なし) ではphaseHistoryが変わらない', () => {
		fc.assert(
			fc.property(arbDeal, (deal) => {
				const state: IntelligenceState = { ...emptyState(), deals: [deal] };
				const historyLengthBefore = deal.phaseHistory.length;

				// Update without phase change (simulate rejection)
				const result = applyUpdateDeal(state, deal.id, { name: deal.name }, {});
				const updated = result.deals.find((d) => d.id === deal.id);

				expect(updated?.phase).toBe(deal.phase);
				expect(updated?.phaseHistory.length).toBe(historyLengthBefore);
			}),
			{ numRuns: 200 }
		);
	});

	it('フェーズ変更なしの更新ではphaseHistoryが変わらない', () => {
		fc.assert(
			fc.property(arbDeal, (deal) => {
				const state: IntelligenceState = { ...emptyState(), deals: [deal] };

				// Same phase in updates — no transition
				const result = applyUpdateDeal(state, deal.id, { phase: deal.phase }, {});
				const updated = result.deals.find((d) => d.id === deal.id);

				expect(updated?.phaseHistory.length).toBe(deal.phaseHistory.length);
			}),
			{ numRuns: 200 }
		);
	});
});
