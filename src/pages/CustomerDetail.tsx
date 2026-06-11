import { useNavigate, useParams } from 'react-router-dom';
import { findCustomerPage } from '../data/customers';
import { findWikiPage } from '../data/wiki';
import { findPersonPage } from '../data/people';
import { Button } from '../components/Button';
import { Field, SourceChip, UpdateTimeline } from '../components/WikiParts';

/**
 * 顧客ページ（wiki）。案件横断の「この会社と当社の関係」をAIが維持する。
 * 全記述に出典がつく。Person/Customer Memory に相当。
 */
export function CustomerDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const page = findCustomerPage(id);

  if (!page) {
    return (
      <div className="py-20 text-center text-ink-sub">
        顧客ページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki?tab=customers')}>
            顧客一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const relatedProjects = page.relatedProjectIds
    .map((pid) => findWikiPage(pid))
    .filter((p) => p !== undefined);
  const keyPersons = page.keyPersonIds.map((kid) => findPersonPage(kid)).filter((p) => p !== undefined);

  return (
    <div>
      <button
        onClick={() => navigate('/wiki?tab=customers')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 顧客一覧へ戻る
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>🏢</span>
          <h1 className="text-xl font-semibold text-ink">{page.name}</h1>
        </div>
        <p className="mt-1 text-sm text-ink-sub">{page.industry}</p>
        <p className="mt-0.5 text-xs text-ink-sub/70">
          🤖 AIが維持（毎朝6:00更新）　·　最終更新 {page.updatedAt.slice(5).replace('-', '/')}
        </p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 直近の状況（全記述に出典） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 直近の状況</h2>
            <div className={`rounded-lg border px-4 py-3 ${page.alerts.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-line bg-surface'}`}>
              {page.alerts.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {page.alerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm font-medium text-amber-800">
                      <span aria-hidden className="shrink-0">⚠️</span>
                      <span>
                        {alert.text}
                        {alert.source && (
                          <span className="ml-1.5 inline-flex align-middle">
                            <SourceChip source={alert.source} />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="space-y-2">
                {page.statements.map((s, i) => (
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
              <p className="mt-3 border-t border-line/60 pt-2 text-[11px] text-ink-sub">
                <span aria-hidden>🩺 </span>整合性チェック {page.lastLintAt}
                {page.alerts.length > 0 ? `・アラート${page.alerts.length}件` : '・問題なし'}
              </p>
            </div>
          </section>

          {/* 顧客情報 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ 顧客情報</h2>
            <dl className="grid grid-cols-2 gap-4">
              {page.facts.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} />
              ))}
            </dl>
          </section>

          {/* 関連案件 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              ◆ 関連案件
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {relatedProjects.length}
              </span>
            </h2>
            {relatedProjects.length === 0 ? (
              <p className="text-sm text-ink-sub">関連する案件はありません</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {relatedProjects.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden className="shrink-0 text-base">📚</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        <p className="mt-0.5 text-xs text-ink-sub">{p.salesPhase}　·　{p.salesRep}</p>
                      </div>
                      {p.alerts.length > 0 && (
                        <span className="inline-flex shrink-0 items-center rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                          アラート
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* キーパーソン */}
          {keyPersons.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ キーパーソン</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {keyPersons.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/wiki/person/${p.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden className="shrink-0 text-base">👤</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        <p className="mt-0.5 text-xs text-ink-sub">{p.affiliation}　·　{p.role}</p>
                      </div>
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
