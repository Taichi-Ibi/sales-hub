import { useNavigate, useParams } from 'react-router-dom';
import { findPersonPage } from '../data/people';
import { findWikiPage } from '../data/wiki';
import { Button } from '../components/Button';
import { Field, SourceChip, UpdateTimeline } from '../components/WikiParts';

/**
 * 人物ページ（wiki）。交渉スタイル・関心事・最終接点をAIが維持する。
 * 担当が変わっても人物知識が引き継げる Person Memory。
 */
export function PersonDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const page = findPersonPage(id);

  if (!page) {
    return (
      <div className="py-20 text-center text-ink-sub">
        人物ページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki?tab=people')}>
            人物一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const relatedProjects = page.relatedProjectIds
    .map((pid) => findWikiPage(pid))
    .filter((p) => p !== undefined);

  return (
    <div>
      <button
        onClick={() => navigate('/wiki?tab=people')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 人物一覧へ戻る
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>👤</span>
          <h1 className="text-xl font-semibold text-ink">{page.name}</h1>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${page.side === '社内' ? 'bg-surface text-ink-sub' : 'bg-accent-soft text-accent'}`}
          >
            {page.side}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-sub">
          {page.affiliation}　·　{page.role}
        </p>
        <p className="mt-0.5 text-xs text-ink-sub/70">🤖 AIが維持（毎朝6:00更新）</p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 人物メモ（全記述に出典） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 人物メモ</h2>
            <div className="rounded-lg border border-line bg-surface px-4 py-3">
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
            </div>
          </section>

          {/* プロフィール */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ プロフィール</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="所属" value={page.affiliation} />
              <Field label="役割" value={page.role} />
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
                        <p className="truncate text-sm font-medium text-ink">
                          {p.counterparty} {p.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-sub">{p.salesPhase}　·　{p.salesRep}</p>
                      </div>
                      <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
