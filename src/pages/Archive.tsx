import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARCHIVE_STATUSES, useStore } from '../store/StoreContext';
import { CategoryTag } from '../components/Badge';

type Filter = 'すべて' | '送信済み' | '棄却';

export function Archive() {
  const { actions } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('すべて');

  const list = useMemo(() => {
    return actions
      .filter((a) => ARCHIVE_STATUSES.includes(a.status))
      .filter((a) => filter === 'すべて' || a.status === filter);
  }, [actions, filter]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">完了済み</h1>

      <div className="mb-4 flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-sm">
        {(['すべて', '送信済み', '棄却'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 ${filter === f ? 'bg-white font-medium text-ink shadow-sm' : 'text-ink-sub'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-16 text-center">
          <p className="text-base font-medium text-ink">該当する履歴はありません</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          {list.map((a, i) => {
            const sent = a.status === '送信済み';
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/action/${a.id}`, { state: { from: '/archive' } })}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span
                  className={`text-base ${sent ? 'text-good' : 'text-danger'}`}
                  aria-hidden
                >
                  {sent ? '✔' : '✖'}
                </span>
                <span className="w-12 shrink-0 text-sm tabular-nums text-ink-sub">
                  {a.completedDate}
                </span>
                <CategoryTag category={a.category} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {a.counterparty} {a.title}
                </span>
                <span className={`shrink-0 text-xs font-medium ${sent ? 'text-good' : 'text-danger'}`}>
                  （{a.status}）
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
