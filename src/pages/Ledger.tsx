import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Action, Category, Risk } from '../types';
import {
  APPROVAL_STATUSES,
  ARCHIVE_STATUSES,
  LEDGER_STATUSES,
  useStore,
} from '../store/StoreContext';
import { ActionCard } from '../components/ActionCard';
import { CategoryTag } from '../components/Badge';
import { Button } from '../components/Button';
import { dueBucket, type DueBucket } from '../lib/time';

const CATEGORIES: Category[] = ['法務', '契約', '期限付き返信', '対応漏れ'];

type SortOrder = 'old' | 'new';

// 台帳は1画面に集約し、タブで切り替える:
//   要対応(todo)    = 未確認/対応中（自分が動かす）
//   依頼中(waiting) = FS承認待ち/承認済み（他人待ち・送信可）
//   完了(done)      = 送信済み/棄却（ログ）
type TabKey = 'todo' | 'waiting' | 'done';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todo', label: '要対応' },
  { key: 'waiting', label: '依頼中' },
  { key: 'done', label: '完了' },
];

/** タブをURLに持たせる（?tab=…）。詳細から戻ってもタブが保たれる。 */
function tabPath(tab: TabKey): string {
  return tab === 'todo' ? '/ledger' : `/ledger?tab=${tab}`;
}

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

/** 要対応タブ（旧S1）。今日・明日のフォーカスとトップ3の強調。 */
function TodoTab() {
  const { actions, ledgerMode } = useStore();
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
            <ActionCard key={a.id} action={a} from="/ledger" priority={priorityRank.get(a.id)} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
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
                      from="/ledger"
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
    </>
  );
}

/** 依頼中タブ（旧S4 FS承認待ち）。FS待ちと送信可能（承認済み）の案件。 */
function WaitingTab() {
  const { actions, demoApproveByFS, send } = useStore();

  const list = useMemo(
    () => actions.filter((a) => APPROVAL_STATUSES.includes(a.status)),
    [actions],
  );

  return (
    <>
      <p className="mb-4 text-sm text-ink-sub">
        FSへ承認を依頼した案件。承認されるとここから送信できます。
      </p>
      {list.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">依頼中の案件はありません</p>
          <p className="mt-1 text-sm text-ink-sub">高リスク案件をFSへ回すとここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              from={tabPath('waiting')}
              footer={
                a.status === 'FS承認待ち' ? (
                  <Button variant="secondary" onClick={() => demoApproveByFS(a.id)}>
                    （デモ）FSが承認する
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-good">承認済み（送信可能）</span>
                    <Button variant="primary" className="ml-auto" onClick={() => send(a.id)}>
                      送信する
                    </Button>
                  </div>
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

type DoneFilter = 'すべて' | '送信済み' | '棄却';

/** 完了タブ（旧S5 完了済み）。送信済み／棄却のログ。 */
function DoneTab() {
  const { actions } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DoneFilter>('すべて');

  const list = useMemo(() => {
    return actions
      .filter((a) => ARCHIVE_STATUSES.includes(a.status))
      .filter((a) => filter === 'すべて' || a.status === filter);
  }, [actions, filter]);

  return (
    <>
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
                onClick={() => navigate(`/action/${a.id}`, { state: { from: tabPath('done') } })}
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
    </>
  );
}

/** アクション台帳（S1）。要対応・依頼中・完了の3タブを1画面に集約した作業場。 */
export function Ledger() {
  const { actions, ledgerMode, setLedgerMode } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = tabParam === 'waiting' || tabParam === 'done' ? tabParam : 'todo';

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      todo: actions.filter((a) => LEDGER_STATUSES.includes(a.status)).length,
      waiting: actions.filter((a) => APPROVAL_STATUSES.includes(a.status)).length,
      done: actions.filter((a) => ARCHIVE_STATUSES.includes(a.status)).length,
    }),
    [actions],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold text-ink">Action Hub</h1>
        {/* デモ用: 表示状態の切替（§13 で許可）。要対応タブのみ対象。 */}
        {tab === 'todo' && (
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
        )}
      </div>

      {/* タブ: 要対応（自分が動かす）/ 依頼中（他人待ち）/ 完了（ログ） */}
      <div
        role="tablist"
        aria-label="台帳の表示切替"
        className="mb-4 flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-sm"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(t.key === 'todo' ? {} : { tab: t.key }, { replace: true })}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 sm:flex-none ${
                active ? 'bg-white font-medium text-ink shadow-sm' : 'text-ink-sub'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                  active ? 'bg-surface text-ink-sub' : 'bg-white text-ink-sub'
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'todo' ? <TodoTab /> : tab === 'waiting' ? <WaitingTab /> : <DoneTab />}
    </div>
  );
}
