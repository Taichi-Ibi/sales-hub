import { useNavigate } from 'react-router-dom';
import type { SourceRef, WikiUpdate } from '../data/wiki';
import { findTrace } from '../data/traces';

// wiki 層で共有する表示部品。Wikipedia 風: リンクと wikitable のみで構成し、
// チップ・ピル等の装飾は使わない（DESIGN.md §4）。

/** 出典リンク。受信箱に実体があれば原文へ遷移できる青リンク、なければ黒文字。 */
export function SourceLink({ source }: { source: SourceRef }) {
  const navigate = useNavigate();
  if (!source.inboxItemId) {
    return <span title="原文は保持期間を過ぎています">{source.label}</span>;
  }
  return (
    <a onClick={() => navigate(`/inbox/${source.inboxItemId}`)} title="原文を開く">
      {source.label}
    </a>
  );
}

/** 痕跡（trace id）の出典リンク。 */
export function TraceLink({ traceId }: { traceId: string }) {
  const trace = findTrace(traceId);
  if (!trace) return <span>{traceId}</span>;
  return <SourceLink source={{ label: trace.label, inboxItemId: trace.inboxItemId }} />;
}

/** 更新履歴。Wikipedia の「履歴」ページの引用（wikitable）。 */
export function UpdateTimeline({ updates }: { updates: WikiUpdate[] }) {
  return (
    <table className="wikitable">
      <thead>
        <tr>
          <th className="whitespace-nowrap">日時</th>
          <th className="whitespace-nowrap">種別</th>
          <th>概要</th>
        </tr>
      </thead>
      <tbody>
        {updates.map((u, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap tabular-nums">{u.at}</td>
            <td className="whitespace-nowrap">{u.kind}</td>
            <td>
              {u.summary}
              {u.source && (
                <>
                  {' '}
                  （<SourceLink source={u.source} />）
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
