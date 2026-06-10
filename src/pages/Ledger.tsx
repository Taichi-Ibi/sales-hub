import { useMemo, useState } from 'react';
import type { Action, Category, Risk } from '../types';
import { LEDGER_STATUSES, useStore } from '../store/StoreContext';
import { ActionCard } from '../components/ActionCard';
import { dueBucket, type DueBucket } from '../lib/time';

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

const RISK_RANK: Record<Risk, number> = { 高: 0, 低: 1 };

/** 緊急度の並び（期限昇順 → 高リスク優先 → 古い順）。トップ3の選定に使う。 */
function urgencyCmp(a: Action, b: Action): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.risk !== b.risk) return RISK_RANK[a.risk] - RISK_RANK[b.risk];
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** セクション見出し（Slack 風の小見出し＋件数ピル）。 */
function SectionHeader({
  title,
  count,
  dot,
  note,
}: {
  title: string;
  count: number;
  dot: string;
  note?: string;
}) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 first:mt-0">
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
      <h2 className="text-sm font-bold tracking-wide text-ink">{title}</h2>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
        {count}
      </span>
      {note && <span className="text-xs text-ink-sub">{note}</span>}
    </div>
  );
}

export function Ledger() {
  const { actions, ledgerMode, setLedgerMode } = useStore();
  const [category, setCategory] = useState<Category | 'すべて'>('すべて');
  const [risk, setRisk] = useState<Risk | 'すべて'>('すべて');
  const [sort, setSort] = useState<SortOrder>('old');
  const [showLater, setShowLater] = useState(false);

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

  // 期限の緊急度でグループ分け（今日まで / 明日まで / それ以降）。
  const groups = useMemo(() => {
    const g: Record<DueBucket, Action[]> = { today: [], tomorrow: [], later: [] };
    for (const a of filtered) g[dueBucket(a.dueDate)].push(a);
    return g;
  }, [filtered]);

  // 「全て重要でも、まずトップ3」: 表示中のうち最も緊急な3件を強調する。
  const priorityRank = useMemo(() => {
    const ranked = [...filtered].sort(urgencyCmp);
    return new Map(ranked.slice(0, 3).map((a, i) => [a.id, i + 1] as const));
  }, [filtered]);

  const hasFilter = category !== 'すべて' || risk !== 'すべて';
  // デモ用の空表示は、台帳が空でなくても確認できるようにする。
  const showEmpty = ledgerMode === 'empty' || (ledgerMode === 'normal' && ledger.length === 0);
  const focusCount = groups.today.length + groups.tomorrow.length;

  /** フォーカス（今日 / 明日まで）の1セクションを描画。 */
  const renderFocus = (bucket: 'today' | 'tomorrow', title: string, dot: string) => {
    const list = groups[bucket];
    if (list.length === 0) return null;
    return (
      <section>
        <SectionHeader title={title} count={list.length} dot={dot} />
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <ActionCard key={a.id} action={a} from="/" priority={priorityRank.get(a.id)} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-2">
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
      <p className="mb-4 text-sm text-ink-sub">
        今日・明日までに対応すべきことから。それ以降は下に格納しています。
      </p>

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
        <>
          {/* フォーカス: 今日 / 明日まで */}
          {renderFocus('today', '今日中', 'bg-danger')}
          {renderFocus('tomorrow', '明日まで', 'bg-warn')}

          {/* 今日・明日に対応必須が無いときの達成表示。 */}
          {focusCount === 0 && (
            <div className="rounded-lg border border-good/30 bg-good/5 px-4 py-6 text-center">
              <p className="text-base font-semibold text-ink">
                <span aria-hidden>🎉 </span>今日・明日までの締切はありません
              </p>
              <p className="mt-1 text-sm text-ink-sub">差し迫ったアクションはなし。落ち着いて進められます。</p>
            </div>
          )}

          {/* それ以降: 既定はグレーアウトして格納。トグルで展開。 */}
          {groups.later.length > 0 && (
            <section className="mt-7">
              <button
                onClick={() => setShowLater((v) => !v)}
                aria-expanded={showLater}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink-sub transition-colors hover:text-ink"
              >
                <span aria-hidden className={`transition-transform ${showLater ? 'rotate-90' : ''}`}>
                  ❯
                </span>
                それ以降
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                  {groups.later.length}
                </span>
                <span className="ml-auto text-xs">{showLater ? '隠す' : '表示'}</span>
              </button>
              {showLater && (
                <div className="mt-2 flex flex-col gap-2">
                  {groups.later.map((a) => (
                    <ActionCard
                      key={a.id}
                      action={a}
                      from="/"
                      priority={priorityRank.get(a.id)}
                      muted={!priorityRank.has(a.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {hasFilter && filtered.length > 0 && (
        <p className="mt-4 text-xs text-ink-sub">{filtered.length}件を表示中</p>
      )}
    </div>
  );
}
