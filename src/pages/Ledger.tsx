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
import { dueBucket, NOW, type DueBucket } from '../lib/time';

const CATEGORIES: Category[] = ['法務', '契約', '期限付き返信', '対応漏れ'];

type SortOrder = 'old' | 'new';

// 「今日」はナレッジベースに対する日次ビュー。タブで切り替える:
//   やる(todo)    = 未確認/対応中（自分が動かす）
//   待ち(waiting) = FS承認待ち/承認済み（他人待ち・送信可）
//   済み(done)    = 送信済み/棄却（ログ）
type TabKey = 'todo' | 'waiting' | 'done';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todo', label: 'やる' },
  { key: 'waiting', label: '待ち' },
  { key: 'done', label: '済み' },
];

/** タブをURLに持たせる（?tab=…）。詳細から戻ってもタブが保たれる。 */
function tabPath(tab: TabKey): string {
  return tab === 'todo' ? '/' : `/?tab=${tab}`;
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

const RISK_RANK: Record<Risk, number> = { 高: 0, 低: 1 };

/** 緊急度の並び（期限昇順 → 高リスク優先 → 古い順）。トップ3の選定に使う。 */
function urgencyCmp(a: Action, b: Action): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  if (a.risk !== b.risk) return RISK_RANK[a.risk] - RISK_RANK[b.risk];
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** セクション見出し（小見出し＋件数）。 */
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 first:mt-0">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      <span className="text-xs font-semibold tabular-nums text-ink-sub">{count}</span>
    </div>
  );
}

/** やるタブ。今日・明日のフォーカスとトップ3の強調。 */
function TodoTab() {
  const { actions } = useStore();
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
  const focusCount = groups.today.length + groups.tomorrow.length;

  /** フォーカス（今日 / 明日まで）の1セクションを描画。 */
  const renderFocus = (bucket: 'today' | 'tomorrow', title: string) => {
    const list = groups[bucket];
    if (list.length === 0) return null;
    return (
      <section>
        <SectionHeader title={title} count={list.length} />
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <ActionCard key={a.id} action={a} from="/" priority={priorityRank.get(a.id)} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
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
      {ledger.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">未対応のタスクはありません</p>
          <p className="mt-1 text-sm text-ink-sub">AIが新しいタスクを抽出するとここに表示されます</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-16 text-center">
          <p className="text-base font-medium text-ink">条件に合うタスクはありません</p>
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
          {renderFocus('today', '今日中')}
          {renderFocus('tomorrow', '明日まで')}

          {/* 今日・明日に対応必須が無いときの達成表示。 */}
          {focusCount === 0 && (
            <p className="rounded-lg border border-line bg-surface px-4 py-5 text-center text-sm text-ink-sub">
              今日・明日までの締切はありません
            </p>
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
    </>
  );
}

/** 待ちタブ。FS待ちと送信可能（承認済み）の案件。 */
function WaitingTab() {
  const { actions, demoApproveByFS, send } = useStore();

  const list = useMemo(
    () => actions.filter((a) => APPROVAL_STATUSES.includes(a.status)),
    [actions],
  );

  return (
    <>
      {list.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">他人待ちのタスクはありません</p>
          <p className="mt-1 text-sm text-ink-sub">高リスクタスクをFSへ回すとここに表示されます</p>
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

/** 済みタブ。送信済み／棄却のログ。 */
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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * まもなく開始する会議のバナー（動線B:「この案件、今どうなってる？」）。
 * カレンダー連動で2時間以内に始まる予定を出し、1クリックで事前ブリーフへ。
 * 突然始まる商談でも、経緯と論点に5秒で追いつけるようにする。
 */
function UpcomingMeetingBanner() {
  const { inboxItems } = useStore();
  const navigate = useNavigate();

  const upcoming = inboxItems
    .filter((i) => {
      if (i.source !== 'schedule' || i.status !== '待機中' || !i.eventAt) return false;
      const start = new Date(i.eventAt).getTime();
      return start >= NOW.getTime() && start <= NOW.getTime() + 2 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.eventAt!.localeCompare(b.eventAt!));

  if (upcoming.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {upcoming.map((m) => {
        const start = new Date(m.eventAt!);
        const minutesUntil = Math.round((start.getTime() - NOW.getTime()) / (60 * 1000));
        const timeLabel = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
        return (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3"
          >
            <span aria-hidden className="shrink-0 text-lg">🕥</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                まもなく開始　<span className="tabular-nums">{timeLabel}</span>　{m.title}
              </p>
              <p className="mt-0.5 text-xs text-ink-sub">
                あと{minutesUntil}分{m.location ? `　·　📍 ${m.location}` : ''}
              </p>
            </div>
            <Button
              variant="primary"
              className="shrink-0"
              onClick={() => navigate(`/meetings/${m.id}`, { state: { from: '/' } })}
            >
              事前ブリーフを開く ❯
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** 「今日」（ホーム）。やる・待ち・済みの3タブを1画面に集約した作業場。 */
export function Ledger() {
  const { actions } = useStore();
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
        <h1 className="text-xl font-semibold text-ink">今日</h1>
        <span className="text-sm tabular-nums text-ink-sub">
          {NOW.getMonth() + 1}/{NOW.getDate()}（{WEEKDAYS[NOW.getDay()]}）
        </span>
      </div>

      {/* まもなく開始する会議（カレンダー連動 → 事前ブリーフ） */}
      <UpcomingMeetingBanner />

      {/* タブ: やる（自分が動かす）/ 待ち（他人待ち）/ 済み（ログ） */}
      <div
        role="tablist"
        aria-label="今日の表示切替"
        className="mb-4 flex items-center gap-3 overflow-x-auto text-sm"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(t.key === 'todo' ? {} : { tab: t.key }, { replace: true })}
              className={`flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                active ? 'font-medium text-ink' : 'text-ink-sub hover:text-ink'
              }`}
            >
              {t.label}
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
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
