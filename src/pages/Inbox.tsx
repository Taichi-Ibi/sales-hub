import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem, InboxSource } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince, nextHourlyRun, NOW } from '../lib/time';
import { Button } from '../components/Button';

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

function isCurrentEvent(item: InboxItem): boolean {
  if (!item.eventAt) return false;
  const start = new Date(item.eventAt).getTime();
  const end = item.eventEnd ? new Date(item.eventEnd).getTime() : start + 3600_000;
  return NOW.getTime() >= start && NOW.getTime() < end;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - NOW.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}分後`;
  const hrs = Math.round(diff / 3600000);
  if (hrs < 24) return `${hrs}時間後`;
  return `${Math.round(diff / 86400000)}日後`;
}

/**
 * アーカイブ・AI Ready 用コンパクト1行表示。
 * actionButton があれば右上に絶対配置で表示。
 */
function CompactRow({
  item,
  actionButton,
  muted = false,
}: {
  item: InboxItem;
  actionButton?: React.ReactNode;
  muted?: boolean;
}) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const { label: elapsed } = elapsedSince(item.receivedAt);
  return (
    <div className="group relative">
      <button
        onClick={() => navigate(`/inbox/${item.id}`)}
        className={`flex w-full items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-left transition-all hover:bg-surface ${muted ? 'opacity-40 hover:opacity-70' : ''}`}
        aria-label={`${meta.label} ${item.title} を開く`}
      >
        <span className="shrink-0 text-base" aria-hidden>{meta.icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {item.title}
          {item.memo && <span className="ml-1.5 text-ink-sub/60">📝</span>}
        </span>
        {item.counterparty && (
          <span className="shrink-0 text-xs font-semibold text-ink">{item.counterparty}</span>
        )}
        <span className="w-16 shrink-0 text-right tabular-nums text-xs text-ink-sub">
          {item.eventAt ? formatEventTime(item.eventAt) : `${elapsed}前`}
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

/** 未来の予定用コンパクト1行表示。グレー・薄め。 */
function FutureRow({ item, onCancel: _onCancel }: { item: InboxItem; onCancel: () => void }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  return (
    <button
      onClick={() => navigate(`/inbox/${item.id}`)}
      className="flex w-full items-center gap-2 rounded-lg border border-line/50 bg-surface/50 px-4 py-2 text-left opacity-60 transition-all hover:opacity-100"
      aria-label={`${meta.label} ${item.title} を開く`}
    >
      <span className="shrink-0 text-base" aria-hidden>{meta.icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink-sub">
        {item.eventType && <span className="mr-1 text-ink-sub/70">{EVENT_TYPE_LABEL[item.eventType]}</span>}
        {item.title}
      </span>
      <span className="w-16 shrink-0 text-right tabular-nums text-xs font-semibold text-accent">
        {item.eventAt ? timeUntil(item.eventAt) : ''}
      </span>
    </button>
  );
}

function Row({ item, onCancel }: { item: InboxItem; onCancel: () => void }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const done = item.status === 'タスクあり';
  const { label: elapsed } = elapsedSince(item.receivedAt);
  const cancelable = item.status === '未処理';
  const isCurrent = isCurrentEvent(item);
  const cardBg = isCurrent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-line';

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
    if (swipeDx <= -SWIPE_CANCEL_THRESHOLD) onCancel();
    setSwipeDx(0);
  };

  const showArchiveLabel = swipeDx < -5;

  return (
    <div
      className="group relative overflow-hidden rounded-lg"
      onTouchStart={cancelable ? handleTouchStart : undefined}
      onTouchMove={cancelable ? handleTouchMove : undefined}
      onTouchEnd={cancelable ? handleTouchEnd : undefined}
    >
      {/* Swipe-reveal: アーカイブ（モバイルのみ・スワイプ中に出現）*/}
      {cancelable && (
        <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-r-lg bg-ink/70 md:hidden">
          <span className={`text-xs font-semibold text-white transition-opacity duration-100 ${showArchiveLabel ? 'opacity-100' : 'opacity-0'}`}>
            アーカイブ
          </span>
        </div>
      )}

      <div
        style={{
          transform: `translateX(${swipeDx}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <button
          onClick={() => navigate(`/inbox/${item.id}`)}
          className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all hover:brightness-95 ${cardBg} ${done ? 'opacity-40' : item.aiReady ? 'opacity-65 hover:opacity-100' : ''}`}
          aria-label={`${meta.label} ${item.title} を開く`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg" aria-hidden>
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            {/* タイトル行 */}
            <div className="flex items-center gap-1.5">
              <p className={`truncate text-[15px] font-bold text-ink ${done ? 'font-medium' : ''}`}>
                {item.title}
                {item.memo && <span className="ml-1.5 text-sm font-normal text-ink-sub/60">📝</span>}
              </p>
              {isCurrent && (
                <span className="shrink-0 rounded bg-good px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  進行中
                </span>
              )}
            </div>
            {/* サブ行 */}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-sub">
              {item.eventType && <span>{EVENT_TYPE_LABEL[item.eventType]}</span>}
              {item.eventAt && (
                <span className="tabular-nums text-ink-sub/60">{elapsed}前</span>
              )}
              {item.source === 'mail' && (
                <>
                  <span>From: {item.sender}</span>
                  {item.mailTo && <><span aria-hidden>/</span><span>To: {item.mailTo}</span></>}
                </>
              )}
              {item.source === 'slack' && item.sender && <span>{item.sender}</span>}
              {item.counterparty && (
                <><span aria-hidden>·</span><span className="font-semibold text-ink">{item.counterparty}</span></>
              )}
            </p>
            {(item.participants?.length || item.location) && (
              <p className="mt-0.5 truncate text-xs text-ink-sub/70">
                {item.participants?.length ? <span>👥 {item.participants.join('、')}</span> : null}
                {!!item.participants?.length && item.location ? <span aria-hidden>　</span> : null}
                {item.location ? <span>📍 {item.location}</span> : null}
              </p>
            )}
            {/* バッジ（time の前に置いて右端を time のみにする）*/}
            {(item.aiReady || done) && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.aiReady && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    ✨ AI Ready
                  </span>
                )}
                {done && <span className="text-xs font-medium text-good">✔ {item.status}</span>}
              </div>
            )}
          </div>
          {/* 時刻（固定幅・最後のflex子でFutureRowと右端を揃える）*/}
          <span className="w-16 shrink-0 self-start text-right tabular-nums text-xs text-ink-sub">
            {item.eventAt && isCurrent
              ? `${formatEventTime(item.eventAt)}–${item.eventEnd ? formatEventTime(item.eventEnd).split(' ')[1] : ''}`
              : item.eventAt
                ? formatEventTime(item.eventAt)
                : `${elapsed}前`}
          </span>
        </button>
      </div>

      {/* Desktop: アーカイブ — 右上に hover 表示 */}
      {cancelable && (
        <button
          onClick={onCancel}
          className="absolute right-1.5 top-1.5 hidden size-5 items-center justify-center rounded-full text-xs text-ink-sub/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-ink/10 hover:text-ink md:flex"
          aria-label={`${item.title} をアーカイブ`}
          title="アーカイブ"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Inbox（IS向け受信箱）。Slack/メール/予定の原文がここに集まる。 */
export function Inbox() {
  const { inboxItems, analysisRunning, runAiAnalysis, cancelInboxItem, unarchiveInboxItem } = useStore();
  const [filter, setFilter] = useState<Filter>('すべて');
  const [showAiReady, setShowAiReady] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  const { timeLabel: nextRunTime, minutesUntil } = nextHourlyRun(new Date());

  const { regularItems, nextFuture, furtherFuture, pendingItems, cancelledItems } = useMemo(() => {
    const filtered = inboxItems.filter((i) => filter === 'すべて' || i.source === filter);
    const byDate = (a: InboxItem, b: InboxItem) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();

    const active = filtered.filter((i) => !i.aiReady && i.status !== 'キャンセル');
    const futureSchedule = active
      .filter((i) => i.source === 'schedule' && i.eventAt && new Date(i.eventAt).getTime() > NOW.getTime())
      .sort((a, b) => new Date(a.eventAt!).getTime() - new Date(b.eventAt!).getTime()); // nearest first
    const futureIds = new Set(futureSchedule.map((i) => i.id));
    const regular = active.filter((i) => !futureIds.has(i.id)).sort(byDate);

    return {
      regularItems: regular,
      nextFuture: futureSchedule[0] ?? null,
      furtherFuture: futureSchedule.slice(1),
      pendingItems: filtered
        .filter((i) => i.aiReady && i.status !== 'タスクあり' && i.status !== 'キャンセル')
        .sort(byDate),
      cancelledItems: filtered.filter((i) => i.status === 'キャンセル').sort(byDate),
    };
  }, [inboxItems, filter]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold text-ink">受信箱</h1>
        <div className="relative" ref={infoRef}>
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
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowInfo(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-line bg-white p-3 shadow-md">
                <p className="text-sm text-ink-sub">
                  Slack・メール・予定が届きます。分かち書き → タップでマスキング → タスク化します。
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI解析コントロール */}
      <div className="mb-4 overflow-hidden rounded-lg border border-gold/50 bg-gold/20">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="shrink-0 text-sm" aria-hidden>🤖</span>
          {pendingItems.length > 0 ? (
            <button
              onClick={() => setShowAiReady((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium text-ink"
              aria-expanded={showAiReady}
            >
              <span className="truncate">解析待ち {pendingItems.length}件</span>
              <span aria-hidden className={`shrink-0 text-[10px] transition-transform ${showAiReady ? 'rotate-90' : ''}`}>❯</span>
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs text-ink-sub">解析待ちなし</span>
          )}
          <span className="hidden shrink-0 text-xs text-ink-sub sm:inline">次回 {nextRunTime}（あと{minutesUntil}分）</span>
          <Button
            variant="secondary"
            className="shrink-0 !py-1 !text-xs"
            disabled={analysisRunning || pendingItems.length === 0}
            onClick={runAiAnalysis}
          >
            {analysisRunning ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
                解析中…
              </span>
            ) : (
              '今すぐ解析'
            )}
          </Button>
        </div>
        {/* 解析待ちアイテム（トグル展開）— 1行表示 */}
        {showAiReady && pendingItems.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-gold/40 px-3 pb-3 pt-2">
            {pendingItems.map((i) => (
              <CompactRow key={i.id} item={i} />
            ))}
          </div>
        )}
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

      {/* 未来の予定（コンパクト1行・グレー）— 進行中より上 */}
      {(nextFuture || furtherFuture.length > 0) && (
        <div className="mb-2 flex flex-col gap-1">
          {nextFuture && (
            <FutureRow key={nextFuture.id} item={nextFuture} onCancel={() => cancelInboxItem(nextFuture.id)} />
          )}
          {furtherFuture.length > 0 && (
            <>
              <button
                onClick={() => setShowFuture((v) => !v)}
                className="flex w-full items-center gap-1.5 px-1 text-xs text-ink-sub/50 transition-colors hover:text-ink-sub"
                aria-expanded={showFuture}
              >
                <span aria-hidden className={`text-[10px] transition-transform ${showFuture ? 'rotate-90' : ''}`}>❯</span>
                それ以降 {furtherFuture.length}件
              </button>
              {showFuture && furtherFuture.map((i) => (
                <FutureRow key={i.id} item={i} onCancel={() => cancelInboxItem(i.id)} />
              ))}
            </>
          )}
        </div>
      )}

      {regularItems.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">受信した原文はありません</p>
          <p className="mt-1 text-sm text-ink-sub">Slack・メール・予定が届くとここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {regularItems.map((i) => (
            <Row key={i.id} item={i} onCancel={() => cancelInboxItem(i.id)} />
          ))}
        </div>
      )}

      {/* アーカイブ済み */}
      {cancelledItems.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className="flex w-full items-center gap-2 text-xs text-ink-sub/60 transition-colors hover:text-ink-sub"
            aria-expanded={showCancelled}
          >
            <span aria-hidden className={`text-[10px] transition-transform ${showCancelled ? 'rotate-90' : ''}`}>❯</span>
            アーカイブ {cancelledItems.length}件
          </button>
          {showCancelled && (
            <div className="mt-2 flex flex-col gap-1">
              {cancelledItems.map((i) => (
                <CompactRow
                  key={i.id}
                  item={i}
                  muted
                  actionButton={
                    <button
                      onClick={() => unarchiveInboxItem(i.id)}
                      className="flex size-5 items-center justify-center rounded-full bg-surface text-xs text-ink-sub/60 hover:bg-white hover:text-ink"
                      aria-label={`${i.title} を受信箱に戻す`}
                      title="受信箱に戻す"
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
