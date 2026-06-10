import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isBlank, canRejectEventLog, validateRejectionReason } from '../validation.js';
import {
	applyAddEventLogSafe,
	applyRejectEventLog,
	applyAddMaskingRule,
	applyAddAllowedDomain
} from '../store-logic.js';
import { getInitialSettings } from '../seed-data.js';
import { arbEventLog, arbMaskingRule, arbWhitespaceString } from './arbitraries.js';
import type { IntelligenceState } from '../store-logic.js';
import type { EventLog } from '../types.js';

function emptyState(): IntelligenceState {
	return { eventLogs: [], deals: [], tasks: [], settings: getInitialSettings(), operationLogs: [] };
}

function makeMinutesLog(body: string): EventLog {
	return {
		id: 'test-id',
		source: 'minutes',
		title: 'テスト議事録',
		body,
		timestamp: new Date('2026-06-10T09:00:00Z'),
		createdAt: new Date('2026-06-10T09:00:00Z'),
		status: 'pending',
		isMasked: false,
		annotations: [],
		comments: [],
		isRead: false,
		isDeleted: false
	};
}

describe('Property 6: 空白文字入力の拒否', () => {
	it('isBlank: 空文字・空白のみでtrueを返す', () => {
		fc.assert(
			fc.property(arbWhitespaceString, (s) => {
				expect(isBlank(s)).toBe(true);
			}),
			{ numRuns: 200 }
		);
	});

	it('isBlank: 非空白文字を含む場合はfalseを返す', () => {
		fc.assert(
			fc.property(
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter((s) => s.replace(/[\s\u3000]/g, '').length > 0),
				(s) => {
					expect(isBlank(s)).toBe(false);
				}
			),
			{ numRuns: 200 }
		);
	});

	it('isBlank: 全角スペースもブランクと判定する', () => {
		expect(isBlank('\u3000')).toBe(true);
		expect(isBlank('\u3000\u3000\u3000')).toBe(true);
		expect(isBlank(' \u3000 ')).toBe(true);
	});

	it('議事録/メモの空白bodyでaddEventLogSafeはstate不変', () => {
		fc.assert(
			fc.property(arbWhitespaceString, (blankBody) => {
				const state = emptyState();
				const log = makeMinutesLog(blankBody);
				const result = applyAddEventLogSafe(state, log);
				expect(result.eventLogs.length).toBe(0);
			}),
			{ numRuns: 100 }
		);
	});

	it('memoの空白bodyでaddEventLogSafeはstate不変', () => {
		fc.assert(
			fc.property(arbWhitespaceString, (blankBody) => {
				const state = emptyState();
				const log: EventLog = { ...makeMinutesLog(blankBody), source: 'memo' };
				const result = applyAddEventLogSafe(state, log);
				expect(result.eventLogs.length).toBe(0);
			}),
			{ numRuns: 100 }
		);
	});

	it('却下理由が空白の場合rejectEventLogはstate不変', () => {
		fc.assert(
			fc.property(arbEventLog, arbWhitespaceString, (log, blankReason) => {
				const approvedLog = { ...log, status: 'approved' as const, isDeleted: false };
				const state: IntelligenceState = {
					...emptyState(),
					eventLogs: [approvedLog]
				};
				const result = applyRejectEventLog(state, log.id, blankReason, 'テスト');
				expect(result.eventLogs[0].status).toBe('approved');
			}),
			{ numRuns: 100 }
		);
	});

	it('却下済みへの重複却下はstate不変', () => {
		fc.assert(
			fc.property(arbEventLog, (log) => {
				const rejectedLog = {
					...log,
					status: 'rejected' as const,
					isDeleted: false,
					rejectionReason: '既却下'
				};
				const state: IntelligenceState = {
					...emptyState(),
					eventLogs: [rejectedLog]
				};
				const result = applyRejectEventLog(state, log.id, '再却下理由', 'テスト');
				expect(result.eventLogs[0].status).toBe('rejected');
				expect(result.eventLogs[0].rejectionReason).toBe('既却下');
			}),
			{ numRuns: 100 }
		);
	});

	it('canRejectEventLog: rejected/deletedはfalseを返す', () => {
		fc.assert(
			fc.property(arbEventLog, (log) => {
				const rejected = { ...log, status: 'rejected' as const };
				const deleted = { ...log, isDeleted: true };
				expect(canRejectEventLog(rejected)).toBe(false);
				expect(canRejectEventLog(deleted)).toBe(false);
			}),
			{ numRuns: 100 }
		);
	});

	it('validateRejectionReason: isBlankの逆関数', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 50 }), (reason) => {
				expect(validateRejectionReason(reason)).toBe(!isBlank(reason));
			}),
			{ numRuns: 200 }
		);
	});

	it('マスキングパターンが空白のapplyAddMaskingRuleはstate不変', () => {
		fc.assert(
			fc.property(arbMaskingRule, arbWhitespaceString, (rule, blankPattern) => {
				const blankRule = { ...rule, pattern: blankPattern };
				const state = emptyState();
				const result = applyAddMaskingRule(state, blankRule);
				expect(result.settings.maskingRules.length).toBe(0);
			}),
			{ numRuns: 100 }
		);
	});

	it('ドメインが空白のapplyAddAllowedDomainはstate不変', () => {
		fc.assert(
			fc.property(arbWhitespaceString, (blank) => {
				const state = emptyState();
				const result = applyAddAllowedDomain(state, blank);
				expect(result.settings.allowedDomains).toEqual(getInitialSettings().allowedDomains);
			}),
			{ numRuns: 100 }
		);
	});
});
