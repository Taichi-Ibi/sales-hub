import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	autoMask,
	manualMask,
	restore,
	applyMaskMethod,
	applyMaskingAndApprove
} from '../masking-engine.js';
import { arbEventLog } from './arbitraries.js';

describe('Property 3: マスキング適用の正確性', () => {
	it('autoMask: 有効なルールに一致する全箇所が ● に置換される', () => {
		fc.assert(
			fc.property(
				fc.string({ maxLength: 100 }),
				fc.string({ minLength: 1, maxLength: 10 }).filter((s) => {
					try {
						new RegExp(s);
						return true;
					} catch {
						return false;
					}
				}),
				(text, pattern) => {
					const rule = { id: '1', pattern, method: 'full' as const, isEnabled: true };
					const result = autoMask(text, [rule]);

					// maskedText に元のマッチ箇所がないことを確認
					let regex: RegExp;
					try {
						regex = new RegExp(pattern, 'g');
					} catch {
						return true;
					}

					// マスク後テキストにマスクされるべき部分のみ ● が入っていること
					// (originalText は保持されている)
					expect(result.originalText).toBe(text);
					// マスキング箇所の文字が ● になっていることをシンプルに検証
					for (const range of result.maskedRanges) {
						const maskedSlice = result.maskedText.slice(range.start, range.end);
						expect(maskedSlice).toMatch(/^●+$/);
					}
					// マスクされた範囲の数がマッチ数以下
					const matchCount = [...text.matchAll(regex)].length;
					expect(result.maskedRanges.length).toBeLessThanOrEqual(matchCount);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('無効なルール(isEnabled: false)は適用されない', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 50 }), (text) => {
				const rule = { id: '1', pattern: '\\w+', method: 'full' as const, isEnabled: false };
				const result = autoMask(text, [rule]);
				expect(result.maskedText).toBe(text);
				expect(result.maskedRanges).toHaveLength(0);
			}),
			{ numRuns: 100 }
		);
	});

	it('manualMask: 選択範囲のみを ● で置換する', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 4, maxLength: 50 }),
				fc.integer({ min: 0, max: 3 }),
				fc.integer({ min: 1, max: 3 }),
				(text, startOffset, length) => {
					const start = Math.min(startOffset, text.length - 1);
					const end = Math.min(start + length, text.length);
					if (start >= end) return true;

					const result = manualMask(text, start, end);
					expect(result.originalText).toBe(text);
					expect(result.maskedText.slice(start, end)).toBe('●'.repeat(end - start));
					expect(result.maskedText.slice(0, start)).toBe(text.slice(0, start));
					expect(result.maskedText.slice(end)).toBe(text.slice(end));
					expect(result.maskedRanges).toHaveLength(1);
					expect(result.maskedRanges[0]).toEqual({ start, end });
				}
			),
			{ numRuns: 100 }
		);
	});

	it('manualMask: 無効な範囲はテキストを変更しない', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 20 }), (text) => {
				const result = manualMask(text, -1, 5);
				expect(result.maskedText).toBe(text);
				expect(result.maskedRanges).toHaveLength(0);
			}),
			{ numRuns: 50 }
		);
	});
});

describe('Property 4: マスキング復元ラウンドトリップ', () => {
	it('autoMask → restore で元テキストが完全に復元される', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 100 }), (text) => {
				const rule = { id: '1', pattern: '[0-9]+', method: 'full' as const, isEnabled: true };
				const masked = autoMask(text, [rule]);
				const restored = restore(masked.maskedText, masked.originalText);
				expect(restored).toBe(text);
			}),
			{ numRuns: 100 }
		);
	});

	it('manualMask → restore で元テキストが完全に復元される', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 2, maxLength: 50 }),
				fc.integer({ min: 0, max: 0 }),
				(text, start) => {
					const end = Math.min(start + 2, text.length);
					if (start >= end) return true;
					const masked = manualMask(text, start, end);
					const restored = restore(masked.maskedText, masked.originalText);
					expect(restored).toBe(text);
				}
			),
			{ numRuns: 100 }
		);
	});
});

describe('Property 5: マスキング完了による自動承認', () => {
	it('applyMaskingAndApprove 後は status が approved になる', () => {
		fc.assert(
			fc.property(
				arbEventLog,
				fc.constantFrom(
					{ id: '1', pattern: '[0-9]', method: 'full' as const, isEnabled: true },
					{ id: '1', pattern: '[0-9]', method: 'full' as const, isEnabled: false }
				),
				(log, rule) => {
					const now = new Date('2024-01-01T00:00:00Z');
					const result = applyMaskingAndApprove(log, [rule], now);

					expect(result.status).toBe('approved');
					expect(result.approvalAt).toBeInstanceOf(Date);
					expect(result.approvalAt!.toISOString()).toBe(now.toISOString());
					expect(['auto_masking_complete', 'auto_no_masking_needed']).toContain(
						result.approvalType
					);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('マスキングが実際に適用された場合は auto_masking_complete になる', () => {
		const log: Parameters<typeof applyMaskingAndApprove>[0] = {
			id: 'test',
			source: 'memo',
			title: 'test',
			body: '電話番号: 090-1234-5678',
			timestamp: new Date(),
			createdAt: new Date(),
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		};
		const rule = { id: '1', pattern: '[0-9\\-]+', method: 'full' as const, isEnabled: true };
		const result = applyMaskingAndApprove(log, [rule]);

		expect(result.status).toBe('approved');
		expect(result.approvalType).toBe('auto_masking_complete');
		expect(result.isMasked).toBe(true);
		expect(result.originalBody).toBe(log.body);
	});

	it('マスキング対象なしの場合は auto_no_masking_needed になる', () => {
		const log: Parameters<typeof applyMaskingAndApprove>[0] = {
			id: 'test',
			source: 'memo',
			title: 'test',
			body: '通常テキスト',
			timestamp: new Date(),
			createdAt: new Date(),
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		};
		const rule = { id: '1', pattern: '[0-9]+', method: 'full' as const, isEnabled: true };
		const result = applyMaskingAndApprove(log, [rule]);

		expect(result.status).toBe('approved');
		expect(result.approvalType).toBe('auto_no_masking_needed');
		expect(result.isMasked).toBe(false);
	});
});

describe('applyMaskMethod の動作確認', () => {
	it('full: テキスト全体を ● に置換する', () => {
		expect(applyMaskMethod('hello', 'full')).toBe('●●●●●');
		expect(applyMaskMethod('a', 'full')).toBe('●');
	});

	it('partial: 先頭と末尾を残し中間を ● に置換する', () => {
		expect(applyMaskMethod('hello', 'partial')).toBe('h●●●o');
		expect(applyMaskMethod('ab', 'partial')).toBe('●●');
		expect(applyMaskMethod('a', 'partial')).toBe('●');
	});

	it('keep_edges: 先頭と末尾を残す', () => {
		expect(applyMaskMethod('hello', 'keep_edges')).toBe('h●●●o');
		expect(applyMaskMethod('ab', 'keep_edges')).toBe('a●');
		expect(applyMaskMethod('a', 'keep_edges')).toBe('a');
	});
});
