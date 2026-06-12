import { useNavigate, useSearchParams } from 'react-router-dom';
import { WEEKLY_REPORT, type AdvicePriority } from '../data/advice';
import { findDealEntry } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { MarkdownView, References } from '../components/MarkdownView';

const PRIORITY_ORDER: Record<AdvicePriority, number> = { 高: 0, 中: 1, 低: 2 };

/**
 * 特別:助言（/advice）。Wikipedia のウォッチリストの拡張:
 * 記事（商談Wiki）の直近2スナップショットの差分から AI が起こした「変更の通知と提案」が
 * 並ぶ。未読は太字（ウォッチリストの引用）。週次レポートは特別:統計の引用で、
 * 個人ではなく構造に宛てる。
 */
export function Advice() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'weekly' ? 'weekly' : 'daily';
  const { allAdvice, adviceReadIds } = useStore();

  const sorted = [...allAdvice].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <div>
      <h1 className="wiki-h1">特別:助言</h1>
      <p className="text-[13px] text-ink-sub">
        商談Wikiのウォッチリストです。記事の直近2スナップショットの差分から生成された変更の通知と提案が並びます。
        すべての指摘に出典（痕跡）がつき、未読は<b>太字</b>で表示されます。
      </p>

      <p className="mt-2 border-b border-line-light pb-1 text-[13px]">
        {tab === 'daily' ? <b>今日の助言</b> : <a onClick={() => setParams({}, { replace: true })}>今日の助言</a>}
        {' | '}
        {tab === 'weekly' ? (
          <b>週次レポート</b>
        ) : (
          <a onClick={() => setParams({ tab: 'weekly' }, { replace: true })}>週次レポート</a>
        )}
      </p>

      {tab === 'daily' ? (
        <ul className="mt-2 list-disc pl-6">
          {sorted.map((a) => {
            const unread = !adviceReadIds.has(a.id);
            const counterparty = findDealEntry(a.dealId)?.counterparty ?? a.dealId;
            return (
              <li key={a.id} className="my-1">
                <a onClick={() => navigate(`/advice/${a.id}`)} className={unread ? 'font-bold' : ''}>
                  {a.title}
                </a>
                <span className="text-xs text-ink-sub">
                  　{counterparty}　·　{a.kind}　·　優先度 {a.priority}　·　生成 {a.generatedAt}
                  {unread && '　·　未読'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-ink-sub">
            {WEEKLY_REPORT.weekOf}　·　生成 {WEEKLY_REPORT.generatedAt}　·　reports/weekly/2026-W24.md　·
            個人ではなく構造に宛てる（個人名ベースの帰責なし）
          </p>
          <MarkdownView markdown={WEEKLY_REPORT.markdown} />
          <References markdown={WEEKLY_REPORT.markdown} />
        </div>
      )}
    </div>
  );
}
