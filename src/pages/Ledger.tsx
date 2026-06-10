import { useMemo, useState } from 'react';
import type { Category, Risk } from '../types';
import { LEDGER_STATUSES, useStore } from '../store/StoreContext';
import { ActionCard } from '../components/ActionCard';

const CATEGORIES: Category[] = ['法務', '契約', '期限付き返信', '対応漏れ'];

type SortOrder = 'old' | 'new';

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | 'すべて';
  options: { value: T | 'すべて'; label: string }[];
  onChange: (v: T | 'すべて') => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-sub">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | 'すべて')}
        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Skeleton() {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-14 animate-pulse rounded-md bg-line" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-line" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-line" />
        </div>
      </div>
    </div>
  );
}

export function Ledger() {
  const { actions, ledgerMode, setLedgerMode } = useStore();
  const [category, setCategory] = useState<Category | 'すべて'>('すべて');
  const [risk, setRisk] = useState<Risk | 'すべて'>('すべて');
  const [sort, setSort] = useState<SortOrder>('old');

  const ledger = useMemo(
    () => actions.filter((a) => LEDGER_STATUSES.includes(a.status)),
    [actions],
  );

  const filtered = useMemo(() => {
    const list = ledger.filter(
      (a) => (category === 'すべて' || a.category === category) && (risk === 'すべて' || a.risk === risk),
    );
    // 古い順 = createdAt が古い（経過が長い）ほど上。
    list.sort((a, b) => {
      const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'old' ? cmp : -cmp;
    });
    return list;
  }, [ledger, category, risk, sort]);

  const hasFilter = category !== 'すべて' || risk !== 'すべて';
  // デモ用の空表示は、台帳が空でなくても確認できるようにする。
  const showEmpty = ledgerMode === 'empty' || (ledgerMode === 'normal' && ledger.length === 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold text-ink">アクション台帳</h1>
        {/* デモ用: 表示状態の切替（§13 で許可） */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-xs">
          {(['normal', 'empty', 'loading'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLedgerMode(m)}
              className={`rounded-md px-2 py-1 ${ledgerMode === m ? 'bg-white font-medium text-ink shadow-sm' : 'text-ink-sub'}`}
            >
              {m === 'normal' ? '通常' : m === 'empty' ? '空' : '読込中'}
            </button>
          ))}
        </div>
      </div>

      {/* フィルタ/ソートバー */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          label="カテゴリ"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'すべて', label: 'すべて' },
            ...CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Select
          label="リスク"
          value={risk}
          onChange={setRisk}
          options={[
            { value: 'すべて', label: 'すべて' },
            { value: '高', label: '高' },
            { value: '低', label: '低' },
          ]}
        />
        <label className="ml-auto flex items-center gap-1.5 text-sm text-ink-sub">
          並び順
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="old">古い順</option>
            <option value="new">新しい順</option>
          </select>
        </label>
      </div>

      {/* 本体 */}
      {ledgerMode === 'loading' ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : showEmpty ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">未対応のアクションはありません</p>
          <p className="mt-1 text-sm text-ink-sub">新しいアクションが届くとここに表示されます</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-16 text-center">
          <p className="text-base font-medium text-ink">条件に合うアクションはありません</p>
          <button
            onClick={() => {
              setCategory('すべて');
              setRisk('すべて');
            }}
            className="mt-2 text-sm font-medium text-accent hover:underline"
          >
            フィルタを解除
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <ActionCard key={a.id} action={a} from="/" />
          ))}
        </div>
      )}

      {hasFilter && filtered.length > 0 && (
        <p className="mt-3 text-xs text-ink-sub">{filtered.length}件を表示中</p>
      )}
    </div>
  );
}
