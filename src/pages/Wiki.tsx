import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { InboxItem } from '../types';
import { WIKI_PAGES } from '../data/wiki';
import { CUSTOMER_PAGES } from '../data/customers';
import { PEOPLE_PAGES } from '../data/people';
import { SIGNAL_PAGES, SIGNAL_KIND_META } from '../data/signals';
import { useStore } from '../store/StoreContext';
import { DecisionStatusPill } from '../components/WikiParts';
import { ProjectListSection } from './Projects';
import { NOW, shortDate, elapsedSince } from '../lib/time';

// ナレッジ（wiki 層のハブ）。AIが維持するページ群を種類別タブで見る参照層。
// 動線（ダイジェスト・事前ブリーフ・案件ページ）の終点であり、ここから各詳細へ潜れる。

type TabKey = 'projects' | 'customers' | 'people' | 'meetings' | 'signals' | 'decisions';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'projects', label: '案件' },
  { key: 'customers', label: '顧客' },
  { key: 'people', label: '人物' },
  { key: 'meetings', label: '会議' },
  { key: 'signals', label: 'シグナル' },
  { key: 'decisions', label: '意思決定' },
];

function isTabKey(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

/** 会議の状態ラベル。議事録の目視ゲート通過状況を表す。 */
function meetingStatusLabel(item: InboxItem): { label: string; cls: string } {
  switch (item.status) {
    case '待機中':
      return { label: '予定', cls: 'text-ink-sub' };
    case '要確認':
      return { label: '議事録 確認待ち', cls: 'font-medium text-warn' };
    case '処理済み':
      return { label: '議事録 取込済み', cls: 'font-medium text-good' };
    default:
      return { label: item.status, cls: 'text-ink-sub' };
  }
}

function eventTimeLabel(item: InboxItem): string {
  if (!item.eventAt) return '';
  const d = new Date(item.eventAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CustomersTab() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-2">
      {CUSTOMER_PAGES.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate(`/wiki/customer/${c.id}`)}
          className={`flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left transition-all hover:bg-surface ${c.alerts.length > 0 ? 'bg-warn/10' : 'bg-white'}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
            <p className="mt-0.5 text-xs text-ink-sub">{c.industry}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {c.alerts.length > 0 && (
              <span className="inline-flex items-center rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                アラート
              </span>
            )}
            <span className="tabular-nums text-[10px] text-ink-sub">
              最終更新日 {elapsedSince(c.updatedAt).label}前
            </span>
          </div>
          <span className="shrink-0 text-xs text-ink-sub">案件 {c.relatedProjectIds.length}件</span>
        </button>
      ))}
    </div>
  );
}

function PeopleTab() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-2">
      {PEOPLE_PAGES.map((p) => (
        <button
          key={p.id}
          onClick={() => navigate(`/wiki/person/${p.id}`)}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-left transition-all hover:bg-surface"
        >
          <span aria-hidden className="shrink-0 text-base">👤</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{p.name}</p>
            <p className="mt-0.5 text-xs text-ink-sub">
              {p.affiliation}　·　{p.role}
            </p>
          </div>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${p.side === '社内' ? 'bg-surface text-ink-sub' : 'bg-accent-soft text-accent'}`}
          >
            {p.side}
          </span>
          <span className="shrink-0 text-xs text-ink-sub">案件 {p.relatedProjectIds.length}件</span>
        </button>
      ))}
    </div>
  );
}

function MeetingsTab() {
  const navigate = useNavigate();
  const { inboxItems } = useStore();

  const meetings = useMemo(
    () => inboxItems.filter((i) => i.source === 'schedule' && i.eventAt),
    [inboxItems],
  );
  const upcoming = meetings
    .filter((m) => new Date(m.eventEnd ?? m.eventAt!) >= NOW)
    .sort((a, b) => a.eventAt!.localeCompare(b.eventAt!));
  const past = meetings
    .filter((m) => new Date(m.eventEnd ?? m.eventAt!) < NOW)
    .sort((a, b) => b.eventAt!.localeCompare(a.eventAt!));

  const renderRows = (list: InboxItem[]) => (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
      {list.map((m) => {
        const status = meetingStatusLabel(m);
        return (
          <li key={m.id}>
            <button
              onClick={() => navigate(`/meetings/${m.id}`, { state: { from: '/wiki?tab=meetings' } })}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
            >
              <span aria-hidden className="shrink-0 text-base">📅</span>
              <span className="w-20 shrink-0 tabular-nums text-xs text-ink-sub">{eventTimeLabel(m)}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{m.title}</p>
              {m.eventType && (
                <span className="hidden shrink-0 rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-sub sm:inline">
                  {m.eventType}
                </span>
              )}
              <span className={`shrink-0 text-xs ${status.cls}`}>{status.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-5">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">これからの会議</h2>
          {renderRows(upcoming)}
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">終了した会議</h2>
          {renderRows(past)}
        </section>
      )}
    </div>
  );
}

function SignalsTab() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-2">
      {SIGNAL_PAGES.map((s) => {
        const meta = SIGNAL_KIND_META[s.kind];
        return (
          <button
            key={s.id}
            onClick={() => navigate(`/wiki/signal/${s.id}`)}
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-left transition-all hover:bg-surface"
          >
            <div className="flex items-center gap-2">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                <span aria-hidden>{meta.icon}</span> {s.kind}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{s.title}</p>
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {s.count}件
              </span>
              <span className={`shrink-0 text-xs font-medium ${s.trend === '増加' ? 'text-danger' : 'text-ink-sub'}`}>
                {s.trend === '増加' ? '↗' : s.trend === '減少' ? '↘' : '→'} {s.trend}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-sub">{s.summary}</p>
          </button>
        );
      })}
    </div>
  );
}

function DecisionsTab() {
  const navigate = useNavigate();
  const { decisions } = useStore();

  // 判断待ち（提案中）を期限昇順で上に、決定済み・撤回はその下に。
  const sorted = useMemo(() => {
    const rank = { 提案中: 0, 決定済み: 1, 撤回: 2 } as const;
    return [...decisions].sort((a, b) => {
      if (a.status !== b.status) return rank[a.status] - rank[b.status];
      return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
    });
  }, [decisions]);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
      {sorted.map((d) => (
        <li key={d.id}>
          <button
            onClick={() => navigate(`/decisions/${d.id}`, { state: { from: '/wiki?tab=decisions' } })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
          >
            <span aria-hidden className="shrink-0 text-base">⚖️</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d.title}</p>
              <p className="mt-0.5 text-xs text-ink-sub">
                {d.counterparty}　·　{d.owner}
              </p>
            </div>
            <DecisionStatusPill status={d.status} />
            <span className="hidden w-20 shrink-0 text-right text-xs text-ink-sub sm:inline">
              {d.status === '提案中'
                ? d.deadline
                  ? `期限 ${shortDate(d.deadline)}`
                  : ''
                : d.decidedAt ?? ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** ナレッジ（wiki ハブ）。タブはURLクエリに保持（?tab=…）。 */
export function Wiki() {
  const { inboxItems, decisions } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = isTabKey(tabParam) ? tabParam : 'projects';

  const counts: Record<TabKey, number> = {
    projects: WIKI_PAGES.length,
    customers: CUSTOMER_PAGES.length,
    people: PEOPLE_PAGES.length,
    meetings: inboxItems.filter((i) => i.source === 'schedule' && i.eventAt).length,
    signals: SIGNAL_PAGES.length,
    decisions: decisions.length,
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-ink">ナレッジ</h1>
      </div>

      {/* タブ: ページ種別（モバイルは横スクロール） */}
      <div
        role="tablist"
        aria-label="ナレッジの種別切替"
        className="mb-4 flex items-center gap-3 overflow-x-auto text-sm"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(t.key === 'projects' ? {} : { tab: t.key }, { replace: true })}
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

      {tab === 'projects' && <ProjectListSection />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'people' && <PeopleTab />}
      {tab === 'meetings' && <MeetingsTab />}
      {tab === 'signals' && <SignalsTab />}
      {tab === 'decisions' && <DecisionsTab />}
    </div>
  );
}
