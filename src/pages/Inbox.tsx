import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem, InboxSource } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince } from '../lib/time';

type Filter = 'すべて' | InboxSource;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'すべて', label: 'すべて' },
  { value: 'slack', label: 'Slack' },
  { value: 'mail', label: 'メール' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 査読待ちの1行。Wikipedia の「最近の更新」の行の引用（リンクと素のテキストのみ）。 */
function ReviewRow({ item, onArchive }: { item: InboxItem; onArchive: () => void }) {
  const navigate = useNavigate();
  const meta = SOURCE_META[item.source];
  const { label: elapsed } = elapsedSince(item.receivedAt);
  return (
    <li className="my-1.5">
      （<a onClick={() => navigate(`/inbox/${item.id}`)}>査読</a> | <a onClick={onArchive}>アーカイブ</a>）
      　{meta.label}　<a onClick={() => navigate(`/inbox/${item.id}`)} className="font-bold">{item.title}</a>
      <span className="text-xs text-ink-sub">
        　{item.sender && `${item.sender}　·　`}
        {item.counterparty || '記事未選択'}　·　{elapsed}前
      </span>
    </li>
  );
}

/**
 * 特別:受信箱（/inbox）。Wikipedia の「最近の更新」＋巡回（パトロール）の拡張:
 * 現場の痕跡（メール・Slack）が「記事への更新候補」としてここに並び、
 * 巡回者（人間）が全件を査読（目視確認）してからAIが記事に反映する。
 * 機密情報がないことを保証できるのは人間のみ。
 */
export function Inbox() {
  const { inboxItems, archiveInboxItem, unarchiveInboxItem } = useStore();
  const [filter, setFilter] = useState<Filter>('すべて');

  const { reviewItems, processedItems, archivedItems } = useMemo(() => {
    const filtered = inboxItems.filter((i) => filter === 'すべて' || i.source === filter);
    const byDate = (a: InboxItem, b: InboxItem) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    return {
      reviewItems: filtered.filter((i) => i.status === '要確認').sort(byDate),
      processedItems: filtered
        .filter((i) => i.status === '処理済み')
        .sort((a, b) => new Date(b.processedAt ?? b.receivedAt).getTime() - new Date(a.processedAt ?? a.receivedAt).getTime()),
      archivedItems: filtered.filter((i) => i.status === 'アーカイブ').sort(byDate),
    };
  }, [inboxItems, filter]);

  const navigate = useNavigate();

  return (
    <div>
      <h1 className="wiki-h1">特別:受信箱</h1>
      <p className="text-[13px] text-ink-sub">全件、人が査読してからAIに渡ります。</p>

      <p className="mt-2 border-b border-line-light pb-1 text-[13px]">
        表示:{' '}
        {FILTERS.map((f, i) => (
          <span key={f.value}>
            {i > 0 && ' | '}
            {filter === f.value ? <b>{f.label}</b> : <a onClick={() => setFilter(f.value)}>{f.label}</a>}
          </span>
        ))}
      </p>

      <h2 className="wiki-h2">査読待ち（{reviewItems.length}）</h2>
      {reviewItems.length === 0 ? (
        <p className="text-[13px] text-ink-sub">査読待ちはありません。</p>
      ) : (
        <ul className="list-none pl-0">
          {reviewItems.map((i) => (
            <ReviewRow key={i.id} item={i} onArchive={() => archiveInboxItem(i.id)} />
          ))}
        </ul>
      )}

      {processedItems.length > 0 && (
        <>
          <h2 className="wiki-h2">処理記録（{processedItems.length}）</h2>
          <div className="overflow-x-auto">
          <table className="wikitable">
            <thead>
              <tr>
                <th>日時</th>
                <th>痕跡</th>
                <th>記事</th>
                <th>結果</th>
              </tr>
            </thead>
            <tbody>
              {processedItems.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap tabular-nums">{i.processedAt ? formatTime(i.processedAt) : ''}</td>
                  <td>
                    {SOURCE_META[i.source].label}　<a onClick={() => navigate(`/inbox/${i.id}`)}>{i.title}</a>
                  </td>
                  <td className="whitespace-nowrap">{i.counterparty || '—'}</td>
                  <td>{i.analysisNote ?? 'Wiki更新なし'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {archivedItems.length > 0 && (
        <>
          <h2 className="wiki-h2">アーカイブ（{archivedItems.length}）</h2>
          <ul className="list-none pl-0 text-[13px]">
            {archivedItems.map((i) => (
              <li key={i.id} className="my-1">
                （<a onClick={() => unarchiveInboxItem(i.id)}>査読待ちに戻す</a>）
                <a onClick={() => navigate(`/inbox/${i.id}`)}>{i.title}</a>
                <span className="text-xs text-ink-sub">　AIに渡していません</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
