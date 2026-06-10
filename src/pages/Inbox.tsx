import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem, InboxSource, InboxStatus } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince } from '../lib/time';

type Filter = 'すべて' | InboxSource;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'すべて', label: 'すべて' },
  { value: 'slack', label: `${SOURCE_META.slack.icon} Slack` },
  { value: 'mail', label: `${SOURCE_META.mail.icon} メール` },
  { value: 'minutes', label: `${SOURCE_META.minutes.icon} 議事録` },
];

const STATUS_CLASS: Record<InboxStatus, string> = {
  未処理: 'font-bold text-ink',
  マスキング中: 'font-medium text-warn',
  タスク化済み: 'font-medium text-good',
};

function Row({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const done = item.status === 'タスク化済み';
  const { label: elapsed } = elapsedSince(item.receivedAt);
  return (
    <button
      onClick={() => navigate(`/inbox/${item.id}`)}
      className={`flex w-full items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-left transition-all hover:bg-surface ${done ? 'opacity-65 hover:opacity-100' : ''}`}
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
          <span>{meta.label}</span>
          <span aria-hidden>・</span>
          <span className="truncate">{item.sender}</span>
          <span aria-hidden>・</span>
          <span className="tabular-nums">{elapsed}前</span>
        </p>
      </div>
      <span className={`shrink-0 text-xs ${STATUS_CLASS[item.status]}`}>
        {done ? '✔ ' : ''}
        {item.status}
      </span>
      <span className="shrink-0 text-ink-sub" aria-hidden>
        ❯
      </span>
    </button>
  );
}

/** Inbox（IS向け受信箱）。Slack/メール/議事録の原文がここに集まる。 */
export function Inbox() {
  const { inboxItems } = useStore();
  const [filter, setFilter] = useState<Filter>('すべて');

  const list = useMemo(() => {
    const filtered = inboxItems.filter((i) => filter === 'すべて' || i.source === filter);
    // 未処理・作業中を上に、同区分では新着順。
    const rank = (i: InboxItem) => (i.status === 'タスク化済み' ? 1 : 0);
    return [...filtered].sort(
      (a, b) =>
        rank(a) - rank(b) || new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }, [inboxItems, filter]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Inbox</h1>
      <p className="mb-4 text-sm text-ink-sub">
        Slack・メール・議事録の原文が届きます。分かち書き → タップでマスキング →
        AIが経緯を読み取ってタスク化し、台帳へ送ります。
      </p>

      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-0.5 text-sm">
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

      {list.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">受信した原文はありません</p>
          <p className="mt-1 text-sm text-ink-sub">Slack・メール・議事録が届くとここに表示されます</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </div>
      )}
    </div>
  );
}
