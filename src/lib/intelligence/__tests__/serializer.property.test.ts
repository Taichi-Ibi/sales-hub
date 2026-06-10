import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	deserializeDeals,
	deserializeEventLogs,
	deserializeTasks,
	serializeDeals,
	serializeEventLogs,
	serializeTasks
} from '../serializer.js';
import { arbDeal, arbEventLog, arbTask } from './arbitraries.js';

describe('Property 1: シリアライズ・デシリアライズ ラウンドトリップ等価性', () => {
	it('EventLog の全フィールド(Date含む)がラウンドトリップ後に一致する', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 10 }), (logs) => {
				const json = serializeEventLogs(logs);
				const restored = deserializeEventLogs(json);

				expect(restored).toHaveLength(logs.length);
				for (let i = 0; i < logs.length; i++) {
					const original = logs[i];
					const result = restored[i];

					// Date フィールドは toISOString() で比較
					expect(result.timestamp).toBeInstanceOf(Date);
					expect(result.timestamp.toISOString()).toBe(original.timestamp.toISOString());
					expect(result.createdAt).toBeInstanceOf(Date);
					expect(result.createdAt.toISOString()).toBe(original.createdAt.toISOString());

					// 文字列フィールド
					expect(result.id).toBe(original.id);
					expect(result.source).toBe(original.source);
					expect(result.title).toBe(original.title);
					expect(result.body).toBe(original.body);
					expect(result.status).toBe(original.status);
					expect(result.isMasked).toBe(original.isMasked);
					expect(result.isRead).toBe(original.isRead);
					expect(result.isDeleted).toBe(original.isDeleted);

					// 配列フィールド
					expect(result.annotations).toHaveLength(original.annotations.length);
					expect(result.comments).toHaveLength(original.comments.length);
				}
			}),
			{ numRuns: 100 }
		);
	});

	it('Deal の全フィールドがラウンドトリップ後に一致する', () => {
		fc.assert(
			fc.property(fc.array(arbDeal, { maxLength: 10 }), (deals) => {
				const json = serializeDeals(deals);
				const restored = deserializeDeals(json);

				expect(restored).toHaveLength(deals.length);
				for (let i = 0; i < deals.length; i++) {
					expect(restored[i].id).toBe(deals[i].id);
					expect(restored[i].name).toBe(deals[i].name);
					expect(restored[i].phase).toBe(deals[i].phase);
					expect(restored[i].createdAt).toBeInstanceOf(Date);
					expect(restored[i].createdAt.toISOString()).toBe(deals[i].createdAt.toISOString());
					expect(restored[i].updatedAt).toBeInstanceOf(Date);
					expect(restored[i].updatedAt.toISOString()).toBe(deals[i].updatedAt.toISOString());
				}
			}),
			{ numRuns: 100 }
		);
	});

	it('Task の全フィールドがラウンドトリップ後に一致する', () => {
		fc.assert(
			fc.property(fc.array(arbTask, { maxLength: 10 }), (tasks) => {
				const json = serializeTasks(tasks);
				const restored = deserializeTasks(json);

				expect(restored).toHaveLength(tasks.length);
				for (let i = 0; i < tasks.length; i++) {
					expect(restored[i].id).toBe(tasks[i].id);
					expect(restored[i].title).toBe(tasks[i].title);
					expect(restored[i].status).toBe(tasks[i].status);
					expect(restored[i].priority).toBe(tasks[i].priority);
					expect(restored[i].createdAt).toBeInstanceOf(Date);
					expect(restored[i].createdAt.toISOString()).toBe(tasks[i].createdAt.toISOString());
					if (tasks[i].dueDate) {
						expect(restored[i].dueDate).toBeInstanceOf(Date);
						expect(restored[i].dueDate!.toISOString()).toBe(tasks[i].dueDate!.toISOString());
					}
				}
			}),
			{ numRuns: 100 }
		);
	});

	it('壊れたJSONは空配列を返す', () => {
		expect(deserializeEventLogs('not-json')).toEqual([]);
		expect(deserializeDeals('{')).toEqual([]);
		expect(deserializeTasks('null')).toEqual([]);
	});
});
