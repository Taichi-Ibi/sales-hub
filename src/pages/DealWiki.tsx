import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findDealEntry, snapshotsOf, type SnapshotMeta, type WikiSnapshot } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { applySnapshotPatch } from '../lib/snapshot';
import { shortDate } from '../lib/time';
import { MarkdownView, References } from '../components/MarkdownView';
import { UpdateTimeline } from '../components/WikiParts';

const META_LABELS: { key: keyof Pick<SnapshotMeta, 'phase' | 'confidence' | 'amount' | 'expected_close'>; label: string }[] = [
  { key: 'phase', label: 'フェーズ' },
  { key: 'confidence', label: '確度' },
  { key: 'amount', label: '金額' },
  { key: 'expected_close', label: 'クローズ予定' },
];

function metaValue(meta: SnapshotMeta, key: (typeof META_LABELS)[number]['key']): string {
  if (key === 'confidence') return `${meta.confidence}%`;
  if (key === 'expected_close') return shortDate(meta.expected_close);
  return String(meta[key]);
}

/** 前日比（frontmatter 4項目の差分表）。③助言がこの diff を入力にする。 */
function MetaDiff({ prev, cur }: { prev: WikiSnapshot; cur: WikiSnapshot }) {
  return (
    <table className="wikitable">
      <thead>
        <tr>
          <th>項目</th>
          <th className="tabular-nums">{shortDate(prev.date)}（昨日）</th>
          <th className="tabular-nums">{shortDate(cur.date)}（今日）</th>
        </tr>
      </thead>
      <tbody>
        {META_LABELS.map(({ key, label }) => {
          const before = metaValue(prev.meta, key);
          const after = metaValue(cur.meta, key);
          const changed = before !== after;
          return (
            <tr key={key}>
              <td>{label}</td>
              <td className="tabular-nums text-ink-sub">{before}</td>
              <td className="tabular-nums">{changed ? <b>{after}</b> : after}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type Tab = '本文' | '前日比' | '履歴';

/**
 * 商談Wikiの記事ページ（/wiki/:dealId）。Wikipedia の記事の引用:
 * serif の記事タイトル、右上の infobox（frontmatter）、本文、脚注（出典）、
 * 上部タブ（本文｜前日比｜履歴）。誰も直接編集しない（編集タブは存在しない）。
 */
export function DealWiki() {
  const { dealId = '' } = useParams();
  const navigate = useNavigate();
  const { snapshotPatches, wikiAppends, allAdvice } = useStore();
  const entry = findDealEntry(dealId);
  const list = useMemo(() => snapshotsOf(dealId), [dealId]);
  const [dateIdx, setDateIdx] = useState(list.length - 1); // 既定は今日
  const [tab, setTab] = useState<Tab>('本文');

  if (!entry || list.length === 0) {
    return (
      <div>
        <h1 className="wiki-h1">記事が見つかりません</h1>
        <p>
          <a onClick={() => navigate('/wiki')}>メインページへ戻る</a>
        </p>
      </div>
    );
  }

  const isToday = dateIdx === list.length - 1;
  const patched = applySnapshotPatch(list[dateIdx], isToday ? snapshotPatches[dealId] : undefined);
  const snapshot = patched.snapshot;
  const prev = dateIdx > 0 ? list[dateIdx - 1] : undefined;
  const updates = [...(wikiAppends[dealId] ?? []), ...entry.updates];
  const relatedAdvice = allAdvice.filter((a) => a.dealId === dealId);
  const tabs: Tab[] = prev ? ['本文', '前日比', '履歴'] : ['本文', '履歴'];

  return (
    <div>
      {/* 記事タブ（Wikipedia の「閲覧・履歴」の引用。編集タブはない） */}
      <div className="flex gap-4 border-b border-line-light text-[13px]">
        {tabs.map((t) => (
          <a
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'border-b-2 border-accent pb-1 font-bold text-ink no-underline' : 'pb-1'}
          >
            {t}
          </a>
        ))}
        <span className="ml-auto pb-1 text-ink-sub">読み取り専用</span>
      </div>

      <h1 className="wiki-h1 mt-3">
        {entry.counterparty} {entry.name}
      </h1>

      {/* 版の切替（Wikipedia の oldid の引用） */}
      <p className="text-xs text-ink-sub">
        版:{' '}
        {list.map((s, i) => (
          <span key={s.date}>
            {i > 0 && ' | '}
            {i === dateIdx ? (
              <b>{shortDate(s.date)}版{i === list.length - 1 ? '（最新）' : ''}</b>
            ) : (
              <a onClick={() => setDateIdx(i)}>
                {shortDate(s.date)}版{i === list.length - 1 ? '（最新）' : ''}
              </a>
            )}
          </span>
        ))}
      </p>

      {tab === '本文' && (
        <div className="mt-2">
          {/* infobox（frontmatter） */}
          <table className="infobox">
            <caption>{entry.counterparty}</caption>
            <tbody>
              {META_LABELS.map(({ key, label }) => (
                <tr key={key}>
                  <th>{label}</th>
                  <td>{metaValue(snapshot.meta, key)}</td>
                </tr>
              ))}
              <tr>
                <th>最終更新</th>
                <td className="tabular-nums">{snapshot.meta.updated_at}</td>
              </tr>
            </tbody>
          </table>

          <MarkdownView
            markdown={snapshot.markdown}
            entities={entry.entities}
            highlightLines={isToday ? patched.addedLines : undefined}
          />

          {relatedAdvice.length > 0 && (
            <section className="clear-right">
              <h2 className="wiki-h2">この記事への助言</h2>
              <ul className="list-disc pl-6">
                {relatedAdvice.map((a) => (
                  <li key={a.id}>
                    <a onClick={() => navigate(`/advice/${a.id}`)}>{a.title}</a>
                    <span className="text-xs text-ink-sub">　生成 {a.generatedAt}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <References markdown={snapshot.markdown} entities={entry.entities} />
        </div>
      )}

      {tab === '前日比' && prev && (
        <div className="mt-3 overflow-x-auto">
          <MetaDiff prev={prev} cur={snapshot} />
        </div>
      )}

      {tab === '履歴' && (
        <div className="mt-3 overflow-x-auto">
          <UpdateTimeline updates={updates} />
        </div>
      )}
    </div>
  );
}
