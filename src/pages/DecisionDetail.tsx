import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { findWikiByCounterparty } from '../data/wiki';
import { findPersonByLabel } from '../data/people';
import { useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DecisionStatusPill, SourceChip } from '../components/WikiParts';
import { shortDate } from '../lib/time';

/**
 * Decision Brief（意思決定の詳細）。論点・背景・関係者・選択肢・推奨案・リスク・
 * 根拠・次に確認すべきことを1画面で提示する。AIの仕事はここまで（提案）。
 * 「決定として記録する」は人の操作で、案件 wiki の更新履歴に監査として残る。
 */
export function DecisionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getDecision, recordDecision } = useStore();
  const [confirming, setConfirming] = useState(false);

  const decision = getDecision(id);
  const from = (location.state as { from?: string } | null)?.from ?? '/wiki?tab=decisions';

  if (!decision) {
    return (
      <div className="py-20 text-center text-ink-sub">
        意思決定が見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki?tab=decisions')}>
            意思決定一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const project = findWikiByCounterparty(decision.counterparty);
  const proposed = decision.status === '提案中';

  return (
    <div>
      <button
        onClick={() => navigate(from)}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 戻る
      </button>

      {/* タイトル（論点） */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl" aria-hidden>⚖️</span>
          <h1 className="text-xl font-semibold text-ink">{decision.title}</h1>
          <DecisionStatusPill status={decision.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-sub">
          <span>担当 {decision.owner}</span>
          {decision.deadline && proposed && (
            <span className="font-medium text-warn">回答期限 {shortDate(decision.deadline)}</span>
          )}
          {decision.decidedAt && (
            <span>{decision.status === '撤回' ? '撤回' : '決定'} {decision.decidedAt}</span>
          )}
          {project && (
            <button
              onClick={() => navigate(`/projects/${project.id}`)}
              className="font-medium text-accent hover:underline"
            >
              案件: {decision.counterparty} ❯
            </button>
          )}
        </p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 背景（出典つき） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 背景</h2>
            <ul className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3">
              {decision.background.map((s, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink">
                  {s.text}
                  {s.source && (
                    <span className="ml-1.5 inline-flex align-middle">
                      <SourceChip source={s.source} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* 関係者 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 関係者</h2>
            <div className="flex flex-wrap gap-1.5">
              {decision.stakeholders.map((name) => {
                const person = findPersonByLabel(name);
                if (person) {
                  return (
                    <button
                      key={name}
                      onClick={() => navigate(`/wiki/person/${person.id}`)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs text-ink transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <span aria-hidden>👤</span>
                      {name}
                      <span aria-hidden>❯</span>
                    </button>
                  );
                }
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-sub"
                  >
                    <span aria-hidden>👤</span>
                    {name}
                  </span>
                );
              })}
            </div>
          </section>

          {/* 選択肢 A/B/C */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 選択肢</h2>
            <div className="flex flex-col gap-2">
              {decision.options.map((o) => (
                <div
                  key={o.key}
                  className={`rounded-lg border px-4 py-3 ${o.recommended ? 'border-accent/40 bg-accent-soft' : 'border-line bg-white'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-ink shadow-sm">
                      {o.key}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{o.title}</p>
                    {o.recommended && (
                      <span className="inline-flex shrink-0 items-center rounded bg-gold px-2 py-0.5 text-xs font-bold text-ink">
                        {decision.status === '提案中' ? '推奨' : '採用'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{o.detail}</p>
                  {(o.pros || o.cons) && (
                    <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                      {o.pros && (
                        <ul className="space-y-1">
                          {o.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-1 text-good">
                              <span aria-hidden className="shrink-0">＋</span>
                              <span className="text-ink-sub">{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {o.cons && (
                        <ul className="space-y-1">
                          {o.cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-1 text-danger">
                              <span aria-hidden className="shrink-0">−</span>
                              <span className="text-ink-sub">{c}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 推奨案（提案中）／決定理由（決定済み・撤回） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              {proposed ? '◆ 推奨案（AIの提案）' : decision.status === '撤回' ? '◆ 撤回の理由' : '◆ 決定理由'}
            </h2>
            <div className="flex items-start gap-3 rounded-lg border border-line bg-accent-soft px-4 py-3">
              <span className="shrink-0 text-lg" aria-hidden>{proposed ? '💡' : '📝'}</span>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                {proposed ? decision.recommendation : decision.rationale}
              </p>
            </div>
          </section>

          {/* リスク */}
          {decision.risks.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ リスク</h2>
              <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                {decision.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm font-medium text-amber-800">
                    <span aria-hidden className="shrink-0">⚠️</span>
                    <span>
                      {r.text}
                      {r.source && (
                        <span className="ml-1.5 inline-flex align-middle">
                          <SourceChip source={r.source} />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 根拠（出典） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 根拠（出典）</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {decision.sources.map((s, i) => (
                <SourceChip key={i} source={s} />
              ))}
            </div>
          </section>

          {/* 次に確認すべきこと */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 次に確認すべきこと</h2>
            <ul className="space-y-1.5">
              {decision.followUps.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span aria-hidden className="shrink-0 pt-0.5 text-ink-sub">☐</span>
                  {f}
                </li>
              ))}
            </ul>
          </section>

          {/* 決定として記録する（人の操作。提案中のみ） */}
          {proposed && (
            <section className="border-t border-line pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-xs text-ink-sub">
                  AIの仕事は提案まで。決定の記録は人が行い、案件ページの更新履歴に残ります。
                </p>
                <Button variant="primary" onClick={() => setConfirming(true)}>
                  決定として記録する
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="推奨案で決定として記録しますか？記録は案件ページの更新履歴に残ります。"
        confirmLabel="記録する"
        onConfirm={() => {
          recordDecision(id);
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
