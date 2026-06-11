import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findProject } from '../data/projects';
import type { SalesPhase } from '../data/projects';
import { SOURCE_META } from '../data/inbox';
import { useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { shortDate, elapsedSince } from '../lib/time';

const PHASE_ORDER: SalesPhase[] = ['リード', '商談', '提案', '契約', '受注'];

const COLLAPSE_COUNT = 5;

function PhaseBar({ current }: { current: SalesPhase }) {
  const currentIdx = PHASE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {PHASE_ORDER.map((phase, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === PHASE_ORDER.length - 1;
        return (
          <div key={phase} className="flex min-w-0 flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? 'bg-accent text-white'
                    : done
                      ? 'bg-accent/30 text-accent'
                      : 'bg-surface text-ink-sub'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] font-medium ${
                  active ? 'text-accent' : done ? 'text-accent/70' : 'text-ink-sub'
                }`}
              >
                {phase}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-1 h-0.5 flex-1 ${i < currentIdx ? 'bg-accent/40' : 'bg-line'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-sub">{label}</dt>
      <dd className="text-sm text-ink">{value ?? <span className="text-ink-sub/60">—</span>}</dd>
    </div>
  );
}

export function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { actions, inboxItems } = useStore();
  const project = findProject(id);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  if (!project) {
    return (
      <div className="py-20 text-center text-ink-sub">
        プロジェクトが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/projects')}>
            プロジェクト一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const relatedActions = actions.filter((a) => a.counterparty === project.counterparty);
  const activities = [...inboxItems]
    .filter((i) => i.counterparty === project.counterparty)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  const visibleTasks = showAllTasks ? relatedActions : relatedActions.slice(0, COLLAPSE_COUNT);
  const visibleActivities = showAllActivities ? activities : activities.slice(0, COLLAPSE_COUNT);

  return (
    <div>
      <button
        onClick={() => navigate('/projects')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ プロジェクト一覧へ戻る
      </button>

      {/* タイトル（親ページと同じトップレベル配置） */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>🗂️</span>
          <h1 className="text-xl font-semibold text-ink">{project.counterparty}</h1>
        </div>
        <p className="mt-1 text-sm text-ink-sub">{project.purpose}</p>
        <p className="mt-0.5 text-xs text-ink-sub/70">
          {project.name}　·　{project.status}　·　更新 {project.updatedAt.slice(5).replace('-', '/')}
        </p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 商談フェーズ */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ 商談フェーズ</h2>
            <PhaseBar current={project.salesPhase} />
          </section>

          {/* AI直近サマリー */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 直近の状況</h2>
            <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${project.alerts && project.alerts.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-line bg-surface'}`}>
              <span className="shrink-0 text-base" aria-hidden>{project.alerts && project.alerts.length > 0 ? '⚠️' : '✨'}</span>
              <div className="min-w-0 flex-1">
                {project.alerts && project.alerts.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {project.alerts.map((alert, i) => (
                      <li key={i} className="text-sm font-medium text-amber-800">{alert}</li>
                    ))}
                  </ul>
                )}
                <p className="text-sm leading-relaxed text-ink">{project.aiSummary}</p>
              </div>
            </div>
          </section>

          {/* 案件情報 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ 案件情報</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="担当営業" value={project.salesRep} />
              <Field label="カテゴリ" value={project.category} />
              <Field label="受注金額" value={project.orderAmount} />
              <Field label="プリセールス開始日" value={project.preSalesStartDate} />
              <Field
                label="プロジェクト期間"
                value={
                  project.projectStartDate
                    ? project.projectEndDate
                      ? `${project.projectStartDate} ～ ${project.projectEndDate}`
                      : `${project.projectStartDate} ～`
                    : null
                }
              />
            </dl>
          </section>

          {/* タスク一覧 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              ◆ タスク
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {relatedActions.length}
              </span>
            </h2>
            {relatedActions.length === 0 ? (
              <p className="text-sm text-ink-sub">関連するタスクはありません</p>
            ) : (
              <>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {visibleTasks.map((a) => {
                    const { label: elapsed } = elapsedSince(a.createdAt);
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => navigate(`/action/${a.id}`, { state: { from: `/projects/${id}` } })}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                            <p className="mt-0.5 text-xs text-ink-sub">
                              期限 {shortDate(a.dueDate)}　·　{a.status}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-ink-sub">{elapsed}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {relatedActions.length > COLLAPSE_COUNT && (
                  <button
                    onClick={() => setShowAllTasks((v) => !v)}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    {showAllTasks
                      ? '折りたたむ'
                      : `さらに ${relatedActions.length - COLLAPSE_COUNT} 件を表示`}
                  </button>
                )}
              </>
            )}
          </section>

          {/* 次回打ち合わせ */}
          {project.nextMeeting && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ 次回打ち合わせ</h2>
              <div className="flex items-start gap-3 rounded-lg border border-line bg-accent-soft px-4 py-3">
                <span className="shrink-0 text-lg" aria-hidden>📅</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {project.nextMeeting.date.slice(5).replace('-', '/')} {project.nextMeeting.time}
                    　{project.nextMeeting.purpose}
                  </p>
                  {project.nextMeeting.location && (
                    <p className="mt-0.5 text-xs text-ink-sub">📍 {project.nextMeeting.location}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* 活動一覧 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              ◆ 最近の活動
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {activities.length}
              </span>
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-ink-sub">活動記録がありません</p>
            ) : (
              <>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {visibleActivities.map((item) => {
                    const meta = SOURCE_META[item.source];
                    const { label: elapsed } = elapsedSince(item.receivedAt);
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => navigate(`/inbox/${item.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                        >
                          <span className="shrink-0 text-base" aria-hidden>{meta.icon}</span>
                          <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</p>
                          {item.status === 'タスクあり' && (
                            <span className="shrink-0 text-xs font-medium text-good">✔</span>
                          )}
                          <span className="shrink-0 tabular-nums text-xs text-ink-sub">{elapsed}前</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {activities.length > COLLAPSE_COUNT && (
                  <button
                    onClick={() => setShowAllActivities((v) => !v)}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    {showAllActivities
                      ? '折りたたむ'
                      : `さらに ${activities.length - COLLAPSE_COUNT} 件を表示`}
                  </button>
                )}
              </>
            )}
          </section>

          {/* 資料リンク */}
          {project.documents && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">◆ 資料</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 提案資料 */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-sub">提案資料</p>
                  {project.documents.proposals.length === 0 ? (
                    <p className="text-xs text-ink-sub/60">なし</p>
                  ) : (
                    <ul className="space-y-1">
                      {project.documents.proposals.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                          >
                            <span aria-hidden>📄</span>
                            <span className="min-w-0 truncate">{doc.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* 受領資料 */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-sub">受領資料</p>
                  {project.documents.received.length === 0 ? (
                    <p className="text-xs text-ink-sub/60">なし</p>
                  ) : (
                    <ul className="space-y-1">
                      {project.documents.received.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                          >
                            <span aria-hidden>📥</span>
                            <span className="min-w-0 truncate">{doc.label}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
