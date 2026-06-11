import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem, InboxSource } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince, nextHourlyRun } from '../lib/time';
import { Button } from '../components/Button';

type Filter = 'すべて' | InboxSource;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'すべて', label: 'すべて' },
  { value: 'slack', label: `${SOURCE_META.slack.icon} Slack` },
  { value: 'mail', label: `${SOURCE_META.mail.icon} メール` },
  { value: 'minutes', label: `${SOURCE_META.minutes.icon} 議事録` },
];


function Row({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const done = item.status === 'タスクあり';
  const { label: elapsed } = elapsedSince(item.receivedAt);
  return (
    <button
      onClick={() => navigate(`/inbox/${item.id}`)}
      className={`flex w-full items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-left transition-all hover:bg-surface ${done ? 'opacity-40 hover:opacity-75' : item.aiReady ? 'opacity-65 hover:opacity-100' : ''}`}
      aria-label={`${meta.label} ${item.title} を開く`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg" aria-hidden>
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] ${item.status === '未処理' ? 'font-bold text-ink' : 'font-medium text-ink'}`}>
          {item.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-sub">
          <span className="truncate">{item.sender}</span>
          {item.counterparty && (
            <>
              <span aria-hidden>・</span>
              <span className="truncate font-medium text-ink">{item.counterparty}</span>
            </>
          )}
          <span aria-hidden>・</span>
          <span className="tabular-nums">{elapsed}前</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {item.aiReady && (
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            ✨ AI Ready
          </span>
        )}
        {done && (
          <span className="text-xs font-medium text-good">✔ {item.status}</span>
        )}
      </div>
      <span className="shrink-0 text-ink-sub" aria-hidden>
        ❯
      </span>
    </button>
  );
}

/** Inbox（IS向け受信箱）。Slack/メール/議事録の原文がここに集まる。 */
export function Inbox() {
  const { inboxItems, analysisRunning, runAiAnalysis } = useStore();
  const [filter, setFilter] = useState<Filter>('すべて');
  const [showAiReady, setShowAiReady] = useState(false);

  const { timeLabel: nextRunTime, minutesUntil } = nextHourlyRun(new Date());

  const pendingCount = useMemo(
    () => inboxItems.filter((i) => i.aiReady && i.status !== 'タスクあり').length,
    [inboxItems],
  );

  const { visible, hiddenCount } = useMemo(() => {
    const filtered = inboxItems.filter((i) => filter === 'すべて' || i.source === filter);
    // 未AI Ready → AI Ready（解析待ち） → タスクあり の順。同区分は新着順。
    const rank = (i: InboxItem) => (i.status === 'タスクあり' ? 2 : i.aiReady ? 1 : 0);
    const sorted = [...filtered].sort(
      (a, b) =>
        rank(a) - rank(b) || new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
    const hidden = sorted.filter((i) => i.aiReady);
    return {
      visible: showAiReady ? sorted : sorted.filter((i) => !i.aiReady),
      hiddenCount: hidden.length,
    };
  }, [inboxItems, filter, showAiReady]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">受信箱</h1>
      <p className="mb-4 text-sm text-ink-sub">
        Slack・メール・議事録の原文が届きます。分かち書き → タップでマスキング → タスク化します。
      </p>

      {/* AI解析コントロール */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/20 px-3 py-2">
        <span className="shrink-0 text-sm" aria-hidden>🤖</span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink">
          {pendingCount > 0
            ? <span className="font-medium">解析待ち {pendingCount}件</span>
            : <span className="text-ink-sub">解析待ちなし</span>
          }
          <span className="ml-2 text-ink-sub">次回 {nextRunTime}（あと{minutesUntil}分）</span>
        </span>
        <Button
          variant="secondary"
          className="shrink-0 !py-1 !text-xs"
          disabled={analysisRunning || pendingCount === 0}
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

      <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-0.5 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 ${filter === f.value ? 'bg-white font-medium text-ink shadow-sm' : 'text-ink-sub'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 && hiddenCount === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">受信した原文はありません</p>
          <p className="mt-1 text-sm text-ink-sub">Slack・メール・議事録が届くとここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((i) => (
            <Row key={i.id} item={i} />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAiReady((v) => !v)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2.5 text-sm text-ink-sub transition-colors hover:border-accent/40 hover:text-accent"
            >
              {showAiReady ? (
                <>▲ AI Ready 済みを隠す</>
              ) : (
                <>✨ AI Ready 済み {hiddenCount}件を表示 ▼</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
