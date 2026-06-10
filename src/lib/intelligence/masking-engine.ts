import type { EventLog, MaskingResult, MaskingRule } from './types.js';

export function applyMaskMethod(text: string, method: 'full' | 'partial' | 'keep_edges'): string {
	switch (method) {
		case 'full':
			return '●'.repeat(text.length);
		case 'partial':
			if (text.length <= 2) return '●'.repeat(text.length);
			return text[0] + '●'.repeat(text.length - 2) + text[text.length - 1];
		case 'keep_edges':
			if (text.length <= 1) return text;
			if (text.length === 2) return text[0] + '●';
			return text[0] + '●'.repeat(text.length - 2) + text[text.length - 1];
	}
}

export function autoMask(text: string, rules: MaskingRule[]): MaskingResult {
	const matches: Array<{ start: number; end: number; method: MaskingRule['method'] }> = [];

	for (const rule of rules) {
		if (!rule.isEnabled || rule.pattern.trim() === '') continue;

		let regex: RegExp;
		try {
			regex = new RegExp(rule.pattern, 'g');
		} catch {
			continue;
		}

		let m: RegExpExecArray | null;
		while ((m = regex.exec(text)) !== null) {
			if (m[0].length === 0) {
				regex.lastIndex++;
				continue;
			}
			matches.push({ start: m.index, end: m.index + m[0].length, method: rule.method });
		}
	}

	// 後ろから置換して index ずれを防ぐ
	matches.sort((a, b) => a.start - b.start || b.end - a.end);

	let masked = text;
	const maskedRanges: Array<{ start: number; end: number }> = [];

	for (let i = matches.length - 1; i >= 0; i--) {
		const { start, end, method } = matches[i];
		const segment = masked.slice(start, end);
		const replaced = applyMaskMethod(segment, method);
		masked = masked.slice(0, start) + replaced + masked.slice(end);
		maskedRanges.unshift({ start, end });
	}

	return { maskedText: masked, originalText: text, maskedRanges };
}

export function manualMask(text: string, start: number, end: number): MaskingResult {
	if (start < 0 || end > text.length || start >= end) {
		return { maskedText: text, originalText: text, maskedRanges: [] };
	}
	const replaced = '●'.repeat(end - start);
	return {
		maskedText: text.slice(0, start) + replaced + text.slice(end),
		originalText: text,
		maskedRanges: [{ start, end }]
	};
}

export function restore(_maskedText: string, originalText: string): string {
	return originalText;
}

export function applyMaskingAndApprove(
	log: EventLog,
	rules: MaskingRule[],
	now: Date = new Date()
): EventLog {
	const result = autoMask(log.body, rules);
	const wasMasked = result.maskedRanges.length > 0;

	return {
		...log,
		maskedBody: wasMasked ? result.maskedText : undefined,
		originalBody: wasMasked ? log.body : undefined,
		isMasked: wasMasked,
		status: 'approved',
		approvalType: wasMasked ? 'auto_masking_complete' : 'auto_no_masking_needed',
		approvalAt: now
	};
}
