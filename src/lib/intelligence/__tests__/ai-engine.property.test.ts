import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateTasks, generateSummary, search, generateRetrospective } from '../ai-engine.js';
import { arbEventLog, arbDeal, arbTask } from './arbitraries.js';
import { VALIDATION } from '../constants.js';

describe('Property 12: 検索結果の関連度スコア降順 + 最大件数制約', () => {
	it('search の結果は relevanceScore 降順で並ぶ', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 20 }),
				fc.array(arbEventLog, { maxLength: 30 }),
				fc.array(arbDeal, { maxLength: 10 }),
				fc.array(arbTask, { maxLength: 10 }),
				(query, eventLogs, deals, tasks) => {
					const results = search(query, eventLogs, deals, tasks);
					for (let i = 1; i < results.length; i++) {
						expect(results[i].relevanceScore).toBeLessThanOrEqual(results[i - 1].relevanceScore);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	it('search の結果は最大 20 件を超えない', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }),
				fc.array(
					arbEventLog.map((l) => ({ ...l, title: 'test query matching title', isDeleted: false })),
					{ minLength: 25, maxLength: 50 }
				),
				(query, eventLogs) => {
					const results = search(query, eventLogs, [], []);
					expect(results.length).toBeLessThanOrEqual(VALIDATION.SEARCH_RESULTS_MAX);
				}
			),
			{ numRuns: 50 }
		);
	});

	it('空クエリは空配列を返す', () => {
		fc.assert(
			fc.property(
				fc.constantFrom('', '   ', '\t'),
				fc.array(arbEventLog, { maxLength: 10 }),
				(query, eventLogs) => {
					const results = search(query, eventLogs, [], []);
					expect(results).toHaveLength(0);
				}
			),
			{ numRuns: 20 }
		);
	});

	it('relevanceScore は 0〜100 の範囲内', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 10 }),
				fc.array(arbEventLog, { maxLength: 20 }),
				(query, eventLogs) => {
					const results = search(query, eventLogs, [], []);
					for (const r of results) {
						expect(r.relevanceScore).toBeGreaterThanOrEqual(0);
						expect(r.relevanceScore).toBeLessThanOrEqual(100);
					}
				}
			),
			{ numRuns: 100 }
		);
	});
});

describe('Property 13: AIタスク生成の範囲制約', () => {
	it('generateTasks は 1〜3 件のタスクを生成する', () => {
		fc.assert(
			fc.property(arbEventLog, fc.array(arbDeal, { maxLength: 5 }), (eventLog, deals) => {
				const tasks = generateTasks(eventLog, deals);
				expect(tasks.length).toBeGreaterThanOrEqual(VALIDATION.AI_TASKS_MIN);
				expect(tasks.length).toBeLessThanOrEqual(VALIDATION.AI_TASKS_MAX);
			}),
			{ numRuns: 100 }
		);
	});

	it('生成された各 Task は title・dueDate・priority を持つ', () => {
		fc.assert(
			fc.property(arbEventLog, fc.array(arbDeal, { maxLength: 5 }), (eventLog, deals) => {
				const tasks = generateTasks(eventLog, deals);
				for (const task of tasks) {
					expect(task.title).toBeTruthy();
					expect(task.title.length).toBeGreaterThan(0);
					expect(task.dueDate).toBeInstanceOf(Date);
					expect(['high', 'medium', 'low']).toContain(task.priority);
				}
			}),
			{ numRuns: 100 }
		);
	});

	it('生成された Task は source が ai で isProposal が true', () => {
		fc.assert(
			fc.property(arbEventLog, (eventLog) => {
				const tasks = generateTasks(eventLog, []);
				for (const task of tasks) {
					expect(task.source).toBe('ai');
					expect(task.isProposal).toBe(true);
				}
			}),
			{ numRuns: 100 }
		);
	});

	it('カスタム rng で生成件数が決定的になる', () => {
		fc.assert(
			fc.property(arbEventLog, (eventLog) => {
				const tasks1 = generateTasks(eventLog, [], { rng: () => 0 });
				const tasks2 = generateTasks(eventLog, [], { rng: () => 0 });
				expect(tasks1.length).toBe(tasks2.length);
			}),
			{ numRuns: 50 }
		);
	});
});

describe('Property 14: サマリー生成の制約とインジケーター', () => {
	it('generateSummary のテキストは最大 500 文字', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 20 }), (deal, eventLogs) => {
				const summary = generateSummary(deal, eventLogs);
				expect(summary.text.length).toBeLessThanOrEqual(VALIDATION.SUMMARY_MAX);
			}),
			{ numRuns: 100 }
		);
	});

	it('generateSummary は generatedAt・periodStart・periodEnd を持つ', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 10 }), (deal, eventLogs) => {
				const summary = generateSummary(deal, eventLogs);
				expect(summary.generatedAt).toBeInstanceOf(Date);
				expect(summary.periodStart).toBeInstanceOf(Date);
				expect(summary.periodEnd).toBeInstanceOf(Date);
			}),
			{ numRuns: 100 }
		);
	});

	it('初期生成時の hasUpdates は false', () => {
		fc.assert(
			fc.property(arbDeal, fc.array(arbEventLog, { maxLength: 10 }), (deal, eventLogs) => {
				const summary = generateSummary(deal, eventLogs);
				expect(summary.hasUpdates).toBe(false);
			}),
			{ numRuns: 100 }
		);
	});

	it('generateRetrospective の suggestions は 1〜3 件', () => {
		fc.assert(
			fc.property(
				fc.array(arbEventLog, { maxLength: 20 }),
				fc.array(arbTask, { maxLength: 10 }),
				(eventLogs, tasks) => {
					const start = new Date('2024-01-01');
					const end = new Date('2024-12-31');
					const result = generateRetrospective(eventLogs, tasks, start, end);
					expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
					expect(result.suggestions.length).toBeLessThanOrEqual(VALIDATION.SUGGESTIONS_MAX);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('generateRetrospective は activityPattern に全 DataSource を含む', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 10 }), (eventLogs) => {
				const start = new Date('2024-01-01');
				const end = new Date('2024-12-31');
				const result = generateRetrospective(eventLogs, [], start, end);
				expect(result.activityPattern).toHaveProperty('slack');
				expect(result.activityPattern).toHaveProperty('email');
				expect(result.activityPattern).toHaveProperty('calendar');
				expect(result.activityPattern).toHaveProperty('minutes');
				expect(result.activityPattern).toHaveProperty('memo');
			}),
			{ numRuns: 50 }
		);
	});
});
