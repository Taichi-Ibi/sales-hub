import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	canAdvancePhase,
	computeDealHandoff,
	computeHandoffOverview,
	getPhaseHandoffItems
} from '../handoff.js';
import { detectHandoffGaps, detectPhaseChange } from '../ai-engine.js';
import { arbDeal, arbEventLog } from './arbitraries.js';
import { DEAL_PHASES } from '../constants.js';

describe('Property: 申し送りチェックリスト（DealHandoff）', () => {
	it('satisfiedCount + missingItems.length === requiredCount', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const h = computeDealHandoff(deal, logs);
				expect(h.satisfiedCount + h.missingItems.length).toBe(h.requiredCount);
				expect(h.items.length).toBe(h.requiredCount);
			}),
			{ numRuns: 200 }
		);
	});

	it('fulfillmentRate は 0〜100', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const h = computeDealHandoff(deal, logs);
				expect(h.fulfillmentRate).toBeGreaterThanOrEqual(0);
				expect(h.fulfillmentRate).toBeLessThanOrEqual(100);
			}),
			{ numRuns: 200 }
		);
	});

	it('isComplete は missingItems が空であることと同値', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const h = computeDealHandoff(deal, logs);
				expect(h.isComplete).toBe(h.missingItems.length === 0);
			}),
			{ numRuns: 200 }
		);
	});

	it('要件が無いフェーズ（closed_won）は常に完了・充足率100', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 10 }), (deal, logs) => {
				const h = computeDealHandoff({ ...deal, phase: 'closed_won' }, logs);
				expect(h.requiredCount).toBe(0);
				expect(h.isComplete).toBe(true);
				expect(h.fulfillmentRate).toBe(100);
			}),
			{ numRuns: 100 }
		);
	});

	it('破棄・却下・他案件のログは充足判定に影響しない', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const relevant = logs.map((l) => ({ ...l, dealId: deal.id }));
				const noisy = [
					...relevant,
					...logs.map((l) => ({ ...l, dealId: deal.id, isDeleted: true })),
					...logs.map((l) => ({ ...l, dealId: deal.id, status: 'rejected' as const })),
					...logs.map((l) => ({ ...l, dealId: 'OTHER_DEAL' }))
				];
				const base = computeDealHandoff(deal, relevant);
				const withNoise = computeDealHandoff(deal, noisy);
				expect(withNoise.satisfiedCount).toBe(base.satisfiedCount);
			}),
			{ numRuns: 150 }
		);
	});

	it('計算は決定的（同入力→同結果）', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 15 }), (deal, logs) => {
				expect(computeDealHandoff(deal, logs)).toEqual(computeDealHandoff(deal, logs));
			}),
			{ numRuns: 100 }
		);
	});
});

describe('Property: 勝ち筋メーター（HandoffOverview）', () => {
	it('leakCount は各案件の未充足項目の総和', () => {
		fc.assert(
			fc.property(
				fc.array(arbDeal, { maxLength: 6 }),
				fc.array(arbEventLog, { maxLength: 20 }),
				(deals, logs) => {
					const ov = computeHandoffOverview(deals, logs);
					const expected = deals.reduce(
						(sum, d) => sum + computeDealHandoff(d, logs).missingItems.length,
						0
					);
					expect(ov.leakCount).toBe(expected);
				}
			),
			{ numRuns: 150 }
		);
	});

	it('fulfillmentRate は 0〜100、clean + atRisk は要件あり/なしを跨いで totalDeals を超えない', () => {
		fc.assert(
			fc.property(
				fc.array(arbDeal, { maxLength: 6 }),
				fc.array(arbEventLog, { maxLength: 20 }),
				(deals, logs) => {
					const ov = computeHandoffOverview(deals, logs);
					expect(ov.fulfillmentRate).toBeGreaterThanOrEqual(0);
					expect(ov.fulfillmentRate).toBeLessThanOrEqual(100);
					expect(ov.totalDeals).toBe(deals.length);
					expect(ov.cleanDealCount + ov.atRiskDealCount).toBeLessThanOrEqual(ov.totalDeals);
					expect(ov.perDeal.length).toBe(deals.length);
				}
			),
			{ numRuns: 150 }
		);
	});

	it('漏れゼロ ⇔ 全案件が完了している', () => {
		fc.assert(
			fc.property(
				fc.array(arbDeal, { maxLength: 6 }),
				fc.array(arbEventLog, { maxLength: 20 }),
				(deals, logs) => {
					const ov = computeHandoffOverview(deals, logs);
					const allComplete = ov.perDeal.every((d) => d.handoff.isComplete);
					expect(ov.leakCount === 0).toBe(allComplete);
				}
			),
			{ numRuns: 150 }
		);
	});
});

describe('Property: ゲートとAI指摘の整合', () => {
	it('canAdvancePhase は isComplete と一致する', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				expect(canAdvancePhase(deal, logs)).toBe(computeDealHandoff(deal, logs).isComplete);
			}),
			{ numRuns: 200 }
		);
	});

	it('detectHandoffGaps は未完了のときだけ指摘を返す', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const h = computeDealHandoff(deal, logs);
				const gap = detectHandoffGaps(deal, logs);
				if (h.isComplete) {
					expect(gap).toBeNull();
				} else {
					expect(gap).not.toBeNull();
					expect(gap!.missingItems.length).toBe(h.missingItems.length);
				}
			}),
			{ numRuns: 200 }
		);
	});

	it('detectPhaseChange は申し送り未完了の案件には前進を提案しない', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, logs) => {
				const related = logs.map((l) => ({ ...l, dealId: deal.id, isDeleted: false }));
				const proposal = detectPhaseChange(deal, related);
				if (proposal !== null) {
					expect(canAdvancePhase(deal, related)).toBe(true);
				}
			}),
			{ numRuns: 200 }
		);
	});

	it('全フェーズに対し getPhaseHandoffItems は配列を返す', () => {
		for (const phase of DEAL_PHASES) {
			expect(Array.isArray(getPhaseHandoffItems(phase))).toBe(true);
		}
	});
});
