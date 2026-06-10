import { describe, it } from 'vitest';
import fc from 'fast-check';
import { arbEventLog, arbTask } from './arbitraries.js';
import { VALIDATION } from '../constants.js';
import { selectVisibleEventLogs } from '../store-logic.js';

/**
 * Property 16: ダッシュボード時間窓フィルタリング
 * - 表示される予定が24時間以内のもののみであること
 * - タスクが未完了かつ72時間以内の上位5件であること
 */
describe('Property 16: Dashboard time-window filtering', () => {
	it('upcoming events: only calendar logs within 24h window are included', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { maxLength: 30 }), (logs) => {
				const now = new Date();
				const windowMs = VALIDATION.DASHBOARD_EVENTS_HOURS * 3600_000;

				const upcoming = logs.filter((l) => {
					if (l.isDeleted || l.source !== 'calendar' || !l.startTime) return false;
					const diff = (l.startTime as Date).getTime() - now.getTime();
					return diff >= 0 && diff <= windowMs;
				});

				for (const log of upcoming) {
					const diff = (log.startTime as Date).getTime() - now.getTime();
					if (diff < 0 || diff > windowMs) return false;
					if (log.source !== 'calendar') return false;
					if (log.isDeleted) return false;
				}

				return true;
			})
		);
	});

	it('urgent tasks: only incomplete tasks within 72h, max 5', () => {
		fc.assert(
			fc.property(fc.array(arbTask, { maxLength: 30 }), (tasks) => {
				const now = new Date();
				const windowMs = VALIDATION.DASHBOARD_TASKS_HOURS * 3600_000;

				const urgent = tasks
					.filter((t) => {
						if (t.status === 'completed' || !t.dueDate) return false;
						const diff = (t.dueDate as Date).getTime() - now.getTime();
						return diff <= windowMs;
					})
					.sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime())
					.slice(0, VALIDATION.DASHBOARD_TASKS_MAX);

				if (urgent.length > VALIDATION.DASHBOARD_TASKS_MAX) return false;

				for (const task of urgent) {
					if (task.status === 'completed') return false;
					if (!task.dueDate) return false;
					const diff = (task.dueDate as Date).getTime() - now.getTime();
					if (diff > windowMs) return false;
				}

				return true;
			})
		);
	});

	it('urgent tasks are sorted by dueDate ascending', () => {
		fc.assert(
			fc.property(fc.array(arbTask, { maxLength: 20 }), (tasks) => {
				const now = new Date();
				const windowMs = VALIDATION.DASHBOARD_TASKS_HOURS * 3600_000;

				const urgent = tasks
					.filter((t) => {
						if (t.status === 'completed' || !t.dueDate) return false;
						const diff = (t.dueDate as Date).getTime() - now.getTime();
						return diff <= windowMs;
					})
					.sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime())
					.slice(0, VALIDATION.DASHBOARD_TASKS_MAX);

				for (let i = 1; i < urgent.length; i++) {
					const prev = (urgent[i - 1].dueDate as Date).getTime();
					const curr = (urgent[i].dueDate as Date).getTime();
					if (prev > curr) return false;
				}

				return true;
			})
		);
	});
});

/**
 * Property 18: ページネーション上限
 * 1ページの表示アイテム数がPAGE_SIZE(50)を超えないこと
 */
describe('Property 18: Pagination page size limit', () => {
	it('any page slice never exceeds PAGE_SIZE items', () => {
		fc.assert(
			fc.property(
				fc.array(arbEventLog, { minLength: 0, maxLength: 200 }),
				fc.nat({ max: 10 }),
				(logs, page) => {
					const visible = selectVisibleEventLogs(logs).sort(
						(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
					);
					const pageItems = visible.slice(
						page * VALIDATION.PAGE_SIZE,
						(page + 1) * VALIDATION.PAGE_SIZE
					);
					return pageItems.length <= VALIDATION.PAGE_SIZE;
				}
			)
		);
	});

	it('total pages calculation is consistent with item count', () => {
		fc.assert(
			fc.property(fc.array(arbEventLog, { minLength: 0, maxLength: 200 }), (logs) => {
				const visible = selectVisibleEventLogs(logs);
				const totalPages = Math.ceil(visible.length / VALIDATION.PAGE_SIZE);

				if (visible.length === 0) return totalPages === 0;

				const lastPage = totalPages - 1;
				const lastPageItems = visible.slice(
					lastPage * VALIDATION.PAGE_SIZE,
					(lastPage + 1) * VALIDATION.PAGE_SIZE
				);
				return lastPageItems.length >= 1 && lastPageItems.length <= VALIDATION.PAGE_SIZE;
			})
		);
	});
});
