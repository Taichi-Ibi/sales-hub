import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findDealEntry, snapshotsOf, type SnapshotMeta, type WikiSnapshot } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { applySnapshotPatch } from '../lib/snapshot';
import { shortDate } from '../lib/time';
import { Button } from '../components/Button';
import { MarkdownView } from '../components/MarkdownView';
import { Field, UpdateTimeline } from '../components/WikiParts';
import { PhasePill } from './WikiList';

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
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface text-left text-xs text-ink-sub">
            <th className="px-3 py-2 font-medium">項目</th>
            <th className="px-3 py-2 font-medium tabular-nums">{shortDate(prev.date)}（昨日）</th>
            <th className="px-3 py-2 font-medium tabular-nums">{shortDate(cur.date)}（今日）</th>
          </tr>
        </thead>
        <tbody>
          {META_LABELS.map(({ key, label }) => {
            const before = metaValue(prev.meta, key);
            const after = metaValue(cur.meta, key);
            const changed = before !== after;
            return (
              <tr key={key} className={`border-t border-line ${changed ? 'bg-accent-soft/60' : ''}`}>
                <td className="px-3 py-2 text-xs text-ink-sub">{label}</td>
                <td className="px-3 py-2 tabular-nums text-ink-sub">{before}</td>
                <td className={`px-3 py-2 tabular-nums ${changed ? 'font-semibold text-accent' : 'text-ink'}`}>
                  {after}
                  {changed && <span className="ml-1.5 text-[10px] font-semibold text-accent">変化</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 商談Wikiページ（/wiki/:dealId）。日次スナップショットの Markdown をレンダリングするだけで、
 * 編集UIは作らない（人間の仕事は入力ではなく確認と伝達）。
 */
export function DealWiki() {
  const { dealId = '' } = useParams();
  const navigate = useNavigate();
  const { snapshotPatches, wikiAppends, allAdvice } = useStore();
  const entry = findDealEntry(dealId);
  const list = useMemo(() => snapshotsOf(dealId), [dealId]);
  const [dateIdx, setDateIdx] = useState(list.length - 1); // 既定は今日
  const [showDiff, setShowDiff] = useState(false);

  if (!entry || list.length === 0) {
    return (
      <div className="py-20 text-center text-ink-sub">
        商談Wikiページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki')}>Wiki一覧へ戻る</Button>
        </div>
      </div>
    );
  }

  const isToday = dateIdx === list.length - 1;
  const patched = applySnapshotPatch(list[dateIdx], isToday ? snapshotPatches[dealId] : undefined);
  const snapshot = patched.snapshot;
  const prev = dateIdx > 0 ? list[dateIdx - 1] : undefined;
  const updates = [...(wikiAppends[dealId] ?? []), ...entry.updates];
  const relatedAdvice = allAdvice.filter((a) => a.dealId === dealId);

  return (
    <div>
      <button
        onClick={() => navigate('/wiki')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ Wiki一覧へ戻る
      </button>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl" aria-hidden>📖</span>
          <h1 className="text-xl font-semibold text-ink">{entry.counterparty}</h1>
          <PhasePill phase={snapshot.meta.phase} />
        </div>
        <p className="mt-1 text-sm text-ink-sub">{entry.name}</p>
        <p className="mt-0.5 text-xs text-ink-sub/70">
          🤖 AIが維持（毎朝6:00スナップショット生成・読み取り専用）　·　wiki/{dealId}/{snapshot.date}.md
        </p>
      </div>

      {/* 日付タブ＋前日比トグル */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {list.map((s, i) => (
          <button
            key={s.date}
            onClick={() => setDateIdx(i)}
            className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors ${
              i === dateIdx
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-white text-ink hover:border-accent/50'
            }`}
          >
            {shortDate(s.date)}
            {i === list.length - 1 && <span className="ml-1 text-xs opacity-80">今日</span>}
          </button>
        ))}
        {prev && (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-sm text-ink">
            <input type="checkbox" checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} />
            前日比を表示
          </label>
        )}
      </div>

      {showDiff && prev && (
        <div className="mb-4">
          <MetaDiff prev={prev} cur={snapshot} />
        </div>
      )}

      <div className="flex flex-col gap-6 bg-white p-4 sm:p-5">
        {/* frontmatter（ヨミの最小セット） */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">◆ ヨミ（frontmatter）</h2>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface px-4 py-3 sm:grid-cols-4">
            <Field label="フェーズ" value={snapshot.meta.phase} />
            <Field label="確度" value={`${snapshot.meta.confidence}%`} />
            <Field label="金額" value={snapshot.meta.amount} />
            <Field label="クローズ予定" value={snapshot.meta.expected_close} />
          </dl>
        </section>

        {/* 本文（Markdownレンダリングのみ。各記述に根拠リンク） */}
        <section>
          <MarkdownView
            markdown={snapshot.markdown}
            entities={entry.entities}
            highlightLines={isToday ? patched.addedLines : undefined}
          />
        </section>

        {/* この案件への助言（③の出力。Wikiは事実レイヤー、助言は解釈レイヤーで分離） */}
        {relatedAdvice.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ この案件への助言</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {relatedAdvice.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => navigate(`/advice/${a.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                  >
                    <span aria-hidden className="shrink-0 text-base">💡</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{a.title}</p>
                    <span className="shrink-0 tabular-nums text-xs text-ink-sub">{a.generatedAt}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 更新履歴（AIによるページ維持の記録） */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">◆ 更新履歴</h2>
          <UpdateTimeline updates={updates} />
        </section>
      </div>
    </div>
  );
}
