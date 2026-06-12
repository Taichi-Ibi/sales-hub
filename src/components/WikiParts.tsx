import { useNavigate } from 'react-router-dom';
import type { SourceRef, WikiUpdate } from '../data/wiki';
import { findTrace } from '../data/traces';

// wiki 層（商談Wiki・助言・伝達）で共有する表示部品。
// 全記述に出典（SourceChip / TraceChip）を付ける建て付けを支える。

export function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-sub">{label}</dt>
      <dd className="text-sm text-ink">{value ?? <span className="text-ink-sub/60">—</span>}</dd>
    </div>
  );
}

/** 出典チップ。受信箱に実体があれば原文へ遷移できる。 */
export function SourceChip({ source }: { source: SourceRef }) {
  const navigate = useNavigate();
  const cls =
    'inline-flex max-w-full items-center gap-1 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] text-ink-sub';
  if (!source.inboxItemId) {
    return (
      <span className={cls} title="加工済み痕跡（原文は保持期間を過ぎています）">
        <span aria-hidden>📎</span>
        <span className="min-w-0 truncate">{source.label}</span>
      </span>
    );
  }
  return (
    <button
      onClick={() => navigate(`/inbox/${source.inboxItemId}`)}
      className={`${cls} transition-colors hover:border-accent/50 hover:text-accent`}
      title="原文を開く"
    >
      <span aria-hidden>📎</span>
      <span className="min-w-0 truncate">{source.label}</span>
      <span aria-hidden>❯</span>
    </button>
  );
}

/** 痕跡チップ。trace id（[tr:xxx] / evidence）を解決して根拠リンクとして表示する。 */
export function TraceChip({ traceId }: { traceId: string }) {
  const trace = findTrace(traceId);
  if (!trace) {
    return (
      <span className="inline-flex items-center rounded border border-line bg-white px-1.5 py-0.5 text-[11px] text-ink-sub/60">
        📎 {traceId}
      </span>
    );
  }
  return <SourceChip source={{ label: trace.label, inboxItemId: trace.inboxItemId }} />;
}

export const UPDATE_KIND_META: Record<WikiUpdate['kind'], { icon: string; cls: string }> = {
  取込: { icon: '📥', cls: 'bg-accent-soft text-accent' },
  定期更新: { icon: '🔄', cls: 'bg-surface text-ink-sub' },
  整合性チェック: { icon: '🩺', cls: 'bg-good/10 text-good' },
};

/** 更新履歴のタイムライン。AIがこのページを維持していることを可視化する。 */
export function UpdateTimeline({ updates }: { updates: WikiUpdate[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {updates.map((u, i) => {
        const meta = UPDATE_KIND_META[u.kind];
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="w-20 shrink-0 pt-0.5 tabular-nums text-xs text-ink-sub">{u.at}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
              <span aria-hidden>{meta.icon}</span> {u.kind}
            </span>
            <span className="min-w-0 flex-1 text-ink">
              {u.summary}
              {u.source && (
                <span className="ml-1.5 inline-flex align-middle">
                  <SourceChip source={u.source} />
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
