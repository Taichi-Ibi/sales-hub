import { useNavigate } from 'react-router-dom';
import { DEAL_ENTRIES, type DealPhase } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { dealSnapshots } from '../lib/snapshot';
import { shortDate } from '../lib/time';

/** フェーズピル。契約以降は強調（後工程が動き出すシグナル）。 */
export function PhasePill({ phase }: { phase: DealPhase }) {
  const cls =
    phase === '契約' || phase === '受注'
      ? 'bg-accent text-white'
      : phase === '失注'
        ? 'bg-surface text-ink-sub'
        : 'bg-accent-soft text-accent';
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {phase}
    </span>
  );
}

/**
 * 商談Wiki（頂点）の一覧。組織の唯一の事実（single source of truth）。
 * 実体は日次スナップショットの Markdown で、UIはレンダリングのみ（編集UIなし）。
 */
export function WikiList() {
  const navigate = useNavigate();
  const { snapshotPatches } = useStore();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">商談Wiki</h1>
      <p className="mb-4 text-sm text-ink-sub">
        AIが痕跡から維持する組織の唯一の事実。毎朝6:00に日次スナップショットを生成（読み取り専用）。
      </p>

      <div className="flex flex-col gap-2">
        {DEAL_ENTRIES.map((entry) => {
          const { yesterday, today } = dealSnapshots(entry.id, snapshotPatches);
          if (!today) return null;
          const phaseChanged = yesterday && yesterday.meta.phase !== today.meta.phase;
          const confDelta = yesterday ? today.meta.confidence - yesterday.meta.confidence : 0;
          return (
            <button
              key={entry.id}
              onClick={() => navigate(`/wiki/${entry.id}`)}
              className="flex w-full flex-col gap-2 rounded-lg border border-line bg-white px-4 py-3 text-left transition-all hover:border-accent/40 hover:bg-surface"
            >
              <div className="flex w-full items-center gap-2">
                <span className="text-base" aria-hidden>📖</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
                  {entry.counterparty}
                  <span className="ml-2 text-sm font-normal text-ink-sub">{entry.name}</span>
                </span>
                {phaseChanged && yesterday && (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-sub">
                    <PhasePill phase={yesterday.meta.phase} />
                    <span aria-hidden>→</span>
                  </span>
                )}
                <PhasePill phase={today.meta.phase} />
              </div>
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-sub">
                <div className="flex items-baseline gap-1">
                  <dt>確度</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {today.meta.confidence}%
                    {confDelta !== 0 && (
                      <span className={`ml-1 font-medium ${confDelta > 0 ? 'text-good' : 'text-danger'}`}>
                        ({confDelta > 0 ? '+' : ''}{confDelta})
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt>金額</dt>
                  <dd className="font-semibold text-ink">{today.meta.amount}</dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt>クローズ予定</dt>
                  <dd className="font-semibold tabular-nums text-ink">{shortDate(today.meta.expected_close)}</dd>
                </div>
                <div className="ml-auto flex items-baseline gap-1">
                  <dt>更新</dt>
                  <dd className="tabular-nums">{today.meta.updated_at.slice(5).replace('-', '/')}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </div>
  );
}
