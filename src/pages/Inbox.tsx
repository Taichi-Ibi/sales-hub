import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem, InboxSource } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince, nextHourlyRun, NOW } from '../lib/time';

const SWIPE_CANCEL_WIDTH = 96;
const SWIPE_CANCEL_THRESHOLD = 60;

type Filter = 'すべて' | InboxSource;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'すべて', label: 'すべて' },
  { value: 'slack', label: `${SOURCE_META.slack.icon} Slack` },
  { value: 'mail', label: `${SOURCE_META.mail.icon} メール` },
  { value: 'schedule', label: `${SOURCE_META.schedule.icon} 予定` },
];

const EVENT_TYPE_LABEL: Record<NonNullable<InboxItem['eventType']>, string> = {
  商談: '💼 商談',
  会食: '🍽 会食',
  移動: '🚅 移動',
  社内MTG: '🏢 社内MTG',
  その他: '📌 その他',
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isCurrentEvent(item: InboxItem): boolean {
  if (!item.eventAt) return false;
  const start = new Date(item.eventAt).getTime();
  const end = item.eventEnd ? new Date(item.eventEnd).getTime() : start + 3600_000;
  return NOW.getTime() >= start && NOW.getTime() < end;
}

/** 目視確認待ちカード。ロジックの警告（未マスクの疑い・案件不明）があれば前面に出す。 */
function ReviewCard({ item, onArchive }: { item: InboxItem; onArchive: () => void }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const { label: elapsed } = elapsedSince(item.receivedAt);
  const hasWarning = (item.attention ?? []).length > 0;

  const touchStartX = useRef(0);
  const [swipeDx, setSwipeDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeDx(Math.max(dx, -SWIPE_CANCEL_WIDTH));
  };
  const handleTouchEnd = () => {
    setDragging(false);
    if (swipeDx <= -SWIPE_CANCEL_THRESHOLD) onArchive();
    setSwipeDx(0);
  };

  const showArchiveLabel = swipeDx < -5;

  return (
    <div
      className="group relative overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe-reveal: アーカイブ（モバイルのみ）*/}
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-r-lg bg-ink/70 md:hidden">
        <span className={`text-xs font-semibold text-white transition-opacity duration-100 ${showArchiveLabel ? 'opacity-100' : 'opacity-0'}`}>
          アーカイブ
        </span>
      </div>

      <div
        style={{
          transform: `translateX(${swipeDx}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <button
          onClick={() => navigate(`/inbox/${item.id}`)}
          className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all hover:brightness-95 ${
            hasWarning ? 'border-warn/40 bg-amber-50' : 'border-line bg-white'
          }`}
          aria-label={`${meta.label} ${item.title} をレビューする`}
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-lg ${hasWarning ? 'bg-white' : 'bg-surface'}`} aria-hidden>
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-ink">
              {item.title}
              {item.memo && <span className="ml-1.5 text-sm font-normal text-ink-sub/60">📝</span>}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-sub">
              {item.source === 'mail' && <span>From: {item.sender}</span>}
              {item.source === 'slack' && item.sender && <span>{item.sender}</span>}
              {item.counterparty && (
                <><span aria-hidden>·</span><span className="font-semibold text-ink">{item.counterparty}</span></>
              )}
            </p>
            {(item.attention ?? []).map((r, i) => (
              <p key={i} className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-800">
                <span aria-hidden className="shrink-0">⚠</span>
                <span>{r}</span>
              </p>
            ))}
            {!hasWarning && (
              <p className="mt-1 flex items-center gap-1 text-xs text-good">
                <span aria-hidden>✓</span>自動マスク済み — 目視確認してAIに渡せます
              </p>
            )}
          </div>
          <span className="w-16 shrink-0 self-start text-right tabular-nums text-xs text-ink-sub">
            {elapsed}前
          </span>
        </button>
      </div>

      {/* Desktop: アーカイブ — 右上に hover 表示 */}
      <button
        onClick={onArchive}
        className="absolute right-1.5 top-1.5 hidden size-5 items-center justify-center rounded-full text-xs text-ink-sub/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-ink/10 hover:text-ink md:flex"
        aria-label={`${item.title} をアーカイブ`}
        title="アーカイブ（AIに渡さない）"
      >
        ×
      </button>
    </div>
  );
}

/** 待機中の予定。進行中は緑、未来はグレー。終了後にAIが解析する。 */
function WaitingRow({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const current = isCurrentEvent(item);
  return (
    <button
      onClick={() => navigate(`/inbox/${item.id}`)}
      className={`flex w-full items-center gap-2 rounded-lg border px-4 py-2 text-left transition-all ${
        current
          ? 'border-emerald-200 bg-emerald-50 hover:brightness-95'
          : 'border-line/50 bg-surface/50 opacity-70 hover:opacity-100'
      }`}
      aria-label={`${meta.label} ${item.title} を開く`}
    >
      <span className="shrink-0 text-base" aria-hidden>{meta.icon}</span>
      <span className={`min-w-0 flex-1 truncate text-sm ${current ? 'font-semibold text-ink' : 'text-ink-sub'}`}>
        {item.eventType && <span className="mr-1 text-ink-sub/70">{EVENT_TYPE_LABEL[item.eventType]}</span>}
        {item.title}
      </span>
      {current && (
        <span className="shrink-0 rounded bg-good px-1.5 py-0.5 text-[11px] font-semibold text-white">進行中</span>
      )}
      <span className="w-20 shrink-0 text-right tabular-nums text-xs text-ink-sub">
        {item.eventAt ? formatEventTime(item.eventAt) : ''}
      </span>
    </button>
  );
}

/** 処理ログの1行。承認→解析結果（タスク化 / タスクなし）を出す。 */
function ProcessedRow({ item, actionButton }: { item: InboxItem; actionButton?: React.ReactNode }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  return (
    <div className="group relative">
      <button
        onClick={() => navigate(`/inbox/${item.id}`)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-left transition-all hover:bg-surface"
        aria-label={`${meta.label} ${item.title} を開く`}
      >
        <span className="shrink-0 text-base" aria-hidden>{meta.icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {item.title}
          {item.memo && <span className="ml-1.5 text-ink-sub/60">📝</span>}
        </span>
        {item.counterparty && (
          <span className="hidden shrink-0 text-xs font-semibold text-ink sm:inline">{item.counterparty}</span>
        )}
        <span className={`shrink-0 text-xs font-medium ${item.resultActionId ? 'text-good' : 'text-ink-sub/70'}`}>
          {item.resultActionId ? '✔ タスク化' : `– ${item.analysisNote ?? 'タスクなし'}`}
        </span>
        <span className="w-12 shrink-0 text-right tabular-nums text-xs text-ink-sub">
          {item.processedAt ? formatTime(item.processedAt) : ''}
        </span>
      </button>
      {actionButton && (
        <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {actionButton}
        </div>
      )}
    </div>
  );
}

/** セクション見出し。 */
function SectionHeader({ title, count, dot, note }: { title: string; count: number; dot: string; note?: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 first:mt-0">
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
      <h2 className="text-sm font-bold tracking-wide text-ink">{title}</h2>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">{count}</span>
      {note && <span className="hidden text-xs text-ink-sub sm:inline">{note}</span>}
    </div>
  );
}

/**
 * 受信箱（マスキング目視ゲート）。
 * 機密情報がないことを保証できるのは人間のみ。すべてのアイテムは
 * 人が目視確認してからAIに渡る。ロジックの自動マスクと警告は目視を速くする補助。
 */
export function Inbox() {
  const { inboxItems, archiveInboxItem, unarchiveInboxItem } = useStore();
  const [filter, setFilter] = useState<Filter>('すべて');
  const [showProcessed, setShowProcessed] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { timeLabel: nextRunTime, minutesUntil } = nextHourlyRun(new Date(NOW));

  const { reviewItems, waitingItems, processedItems, archivedItems } = useMemo(() => {
    const filtered = inboxItems.filter((i) => filter === 'すべて' || i.source === filter);
    const byDate = (a: InboxItem, b: InboxItem) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    return {
      reviewItems: filtered.filter((i) => i.status === '要確認').sort(byDate),
      waitingItems: filtered
        .filter((i) => i.status === '待機中')
        .sort((a, b) => new Date(a.eventAt ?? a.receivedAt).getTime() - new Date(b.eventAt ?? b.receivedAt).getTime()),
      processedItems: filtered
        .filter((i) => i.status === '処理済み')
        .sort((a, b) => new Date(b.processedAt ?? b.receivedAt).getTime() - new Date(a.processedAt ?? a.receivedAt).getTime()),
      archivedItems: filtered.filter((i) => i.status === 'アーカイブ').sort(byDate),
    };
  }, [inboxItems, filter]);

  const processedToday = processedItems.length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-ink">受信箱</h1>
        <div className="relative">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="grid size-5 place-items-center rounded-full border border-line text-xs font-medium text-ink-sub transition-colors hover:border-accent/60 hover:text-accent"
            aria-label="受信箱の説明を表示"
            aria-expanded={showInfo}
          >
            i
          </button>
          {showInfo && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowInfo(false)} aria-hidden />
              <div className="absolute left-0 top-7 z-20 w-72 rounded-lg border border-line bg-white p-3 shadow-md">
                <p className="text-sm text-ink-sub">
                  機密情報がないことを保証できるのは人だけです。ロジックが自動マスク・案件判定まで下ごしらえしたうえで、全件、人が目視確認してからAIに渡します。
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 目視ゲートの状態。自動マスクは補助、通過判定は常に人 */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-sub">
        <span aria-hidden>🛡️</span>
        <span className="font-medium text-ink">全件 目視確認制</span>
        <span aria-hidden>·</span>
        <span>未確認のデータはAIに渡りません</span>
        <span aria-hidden>·</span>
        <span>今日 {processedToday}件確認済み</span>
        <span className="ml-auto hidden tabular-nums sm:inline">次回解析バッチ {nextRunTime}（あと{minutesUntil}分）</span>
      </div>

      <div className="mb-3 flex items-center gap-3 overflow-x-auto text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap transition-colors ${filter === f.value ? 'font-medium text-ink' : 'text-ink-sub hover:text-ink'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 目視確認待ち: 全件、人が確認してからAIに渡る */}
      {reviewItems.length > 0 ? (
        <section>
          <SectionHeader title="目視確認待ち" count={reviewItems.length} dot="bg-warn" note="確認するとAIに渡せます" />
          <div className="flex flex-col gap-2">
            {reviewItems.map((i) => (
              <ReviewCard key={i.id} item={i} onArchive={() => archiveInboxItem(i.id)} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-good/30 bg-good/5 px-4 py-5 text-center">
          <p className="text-base font-semibold text-ink">
            <span aria-hidden>🎉 </span>目視確認待ちはありません
          </p>
          <p className="mt-1 text-sm text-ink-sub">受信したデータはすべて確認済みです</p>
        </div>
      )}

      {/* 待機中: 予定・会議。終了後に議事録がゲートに入る */}
      {waitingItems.length > 0 && (
        <section>
          <SectionHeader title="予定" count={waitingItems.length} dot="bg-accent" note="終了後に議事録がゲートに入ります" />
          <div className="flex flex-col gap-1">
            {waitingItems.map((i) => (
              <WaitingRow key={i.id} item={i} />
            ))}
          </div>
        </section>
      )}

      {/* 処理ログ（ゲート通過→AI解析の記録） */}
      {processedItems.length > 0 && (
        <section>
          <div className="mb-2 mt-6 flex items-center gap-2">
            <button
              onClick={() => setShowProcessed((v) => !v)}
              aria-expanded={showProcessed}
              className="flex items-center gap-2 text-sm font-bold tracking-wide text-ink"
            >
              <span aria-hidden className={`text-[10px] text-ink-sub transition-transform ${showProcessed ? 'rotate-90' : ''}`}>❯</span>
              処理ログ
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {processedItems.length}
              </span>
            </button>
          </div>
          {showProcessed && (
            <div className="flex flex-col gap-1">
              {processedItems.map((i) => (
                <ProcessedRow key={i.id} item={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* アーカイブ済み */}
      {archivedItems.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex w-full items-center gap-2 text-xs text-ink-sub/60 transition-colors hover:text-ink-sub"
            aria-expanded={showArchived}
          >
            <span aria-hidden className={`text-[10px] transition-transform ${showArchived ? 'rotate-90' : ''}`}>❯</span>
            アーカイブ {archivedItems.length}件
          </button>
          {showArchived && (
            <div className="mt-2 flex flex-col gap-1">
              {archivedItems.map((i) => (
                <ProcessedRow
                  key={i.id}
                  item={i}
                  actionButton={
                    <button
                      onClick={() => unarchiveInboxItem(i.id)}
                      className="flex size-5 items-center justify-center rounded-full bg-surface text-xs text-ink-sub/60 hover:bg-white hover:text-ink"
                      aria-label={`${i.title} を要確認に戻す`}
                      title="要確認に戻す"
                    >
                      ↩
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
