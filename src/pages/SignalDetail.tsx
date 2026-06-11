import { useNavigate, useParams } from 'react-router-dom';
import { findSignalPage, SIGNAL_KIND_META } from '../data/signals';
import { findWikiByCounterparty } from '../data/wiki';
import { useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { DecisionStatusPill, SourceChip, UpdateTimeline } from '../components/WikiParts';

/**
 * シグナルページ（wiki）。単一案件では見えない横断傾向（兆候・繰り返しの質問・
 * ボトルネック）の根拠と AI の提案を表示する。
 */
export function SignalDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { decisions } = useStore();
  const page = findSignalPage(id);

  if (!page) {
    return (
      <div className="py-20 text-center text-ink-sub">
        シグナルページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki?tab=signals')}>
            シグナル一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const meta = SIGNAL_KIND_META[page.kind];
  const relatedDecisions = (page.relatedDecisionIds ?? [])
    .map((did) => decisions.find((d) => d.id === did))
    .filter((d) => d !== undefined);
  const relatedProjects = page.relatedCounterparties
    .map((c) => findWikiByCounterparty(c))
    .filter((p) => p !== undefined);

  return (
    <div>
      <button
        onClick={() => navigate('/wiki?tab=signals')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ シグナル一覧へ戻る
      </button>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
            <span aria-hidden>{meta.icon}</span> {page.kind}
          </span>
          <h1 className="text-xl font-semibold text-ink">{page.title}</h1>
        </div>
        <p className="mt-1 text-xs text-ink-sub/70">
          {page.windowLabel}で {page.count}件　·
          <span className={page.trend === '増加' ? 'font-medium text-danger' : ''}>
            {page.trend === '増加' ? '↗' : page.trend === '減少' ? '↘' : '→'} {page.trend}
          </span>
          　·　初回観測 {page.firstSeen}　·　最終観測 {page.lastSeen}　·　🤖 AIが維持
        </p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 概要 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 概要</h2>
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
              {page.summary}
            </p>
          </section>

          {/* 観測された根拠（時系列・出典つき） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              ◆ 観測された根拠
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {page.evidences.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {page.evidences.map((e, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2.5 text-sm">
                  <span className="w-10 shrink-0 pt-0.5 tabular-nums text-xs text-ink-sub">{e.at}</span>
                  <span className="min-w-0 flex-1 text-ink">
                    {e.counterparty && (
                      <span className="mr-1.5 inline-flex rounded bg-surface px-1.5 py-0.5 align-middle text-[11px] font-medium text-ink-sub">
                        {e.counterparty}
                      </span>
                    )}
                    {e.text}
                    {e.source && (
                      <span className="ml-1.5 inline-flex align-middle">
                        <SourceChip source={e.source} />
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* AIの提案 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ AIの提案</h2>
            <div className="flex items-start gap-3 rounded-lg border border-line bg-accent-soft px-4 py-3">
              <span className="shrink-0 text-lg" aria-hidden>💡</span>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{page.suggestion}</p>
            </div>
          </section>

          {/* 関連（案件・意思決定） */}
          {(relatedProjects.length > 0 || relatedDecisions.length > 0) && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ 関連</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {relatedDecisions.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => navigate(`/decisions/${d.id}`, { state: { from: `/wiki/signal/${id}` } })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden className="shrink-0 text-base">⚖️</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{d.title}</p>
                      <DecisionStatusPill status={d.status} />
                    </button>
                  </li>
                ))}
                {relatedProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden className="shrink-0 text-base">📚</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {p.counterparty} {p.name}
                      </p>
                      <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 更新履歴 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 更新履歴</h2>
            <UpdateTimeline updates={page.updates} />
          </section>
        </div>
      </div>
    </div>
  );
}
