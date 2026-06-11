import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { findWikiPage, QA_FALLBACK } from '../data/wiki';
import type { SalesPhase, SourceRef, WikiQA } from '../data/wiki';
import { SOURCE_META } from '../data/inbox';
import { useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { DecisionStatusPill, SourceChip, UpdateTimeline, Field } from '../components/WikiParts';
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

/** 「この案件に質問する」。クエリのシミュレート（想定問答＋汎用フォールバック）。 */
function AskPanel({ qa, counterparty }: { qa: WikiQA[]; counterparty: string }) {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<{ q: string; a: string; sources?: SourceRef[] } | null>(null);
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function ask(q: string) {
    const matched = qa.find((item) => item.q === q);
    setThinking(true);
    setAsked(null);
    timer.current = window.setTimeout(() => {
      setAsked(matched ?? { q, a: QA_FALLBACK });
      setThinking(false);
    }, 1200);
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap gap-1.5">
        {qa.map((item) => (
          <button
            key={item.q}
            onClick={() => ask(item.q)}
            disabled={thinking}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
          >
            {item.q}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) { ask(question.trim()); setQuestion(''); }
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`${counterparty} について質問…`}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <Button variant="secondary" disabled={thinking || !question.trim()}>
          質問
        </Button>
      </form>

      {thinking && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-sub">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
          ページと原文を読んでいます…
        </p>
      )}
      {asked && !thinking && (
        <div className="mt-3 rounded-lg border border-line bg-white p-3">
          <p className="text-xs font-semibold text-ink-sub">Q. {asked.q}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{asked.a}</p>
          {asked.sources && asked.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-sub">出典:</span>
              {asked.sources.map((s, i) => (
                <SourceChip key={i} source={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 案件ページ（wiki）。AIが原文（受信箱）から維持する1案件=1ページ。
 * 全記述に出典がつき、更新履歴と整合性チェック（lint）の結果が見える。
 */
export function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { actions, inboxItems, wikiAppends, decisions } = useStore();
  const page = findWikiPage(id);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  if (!page) {
    return (
      <div className="py-20 text-center text-ink-sub">
        案件ページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki')}>
            案件一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const relatedActions = actions.filter((a) => a.counterparty === page.counterparty);
  const relatedDecisions = decisions.filter((d) => d.counterparty === page.counterparty);
  const activities = [...inboxItems]
    .filter((i) => i.counterparty === page.counterparty)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  // 実行時の取込（例外解決でのタスク化など）を静的な更新履歴の先頭にマージ。
  const updates = [...(wikiAppends[page.counterparty] ?? []), ...page.updates];
  const visibleUpdates = showAllUpdates ? updates : updates.slice(0, COLLAPSE_COUNT);

  const visibleTasks = showAllTasks ? relatedActions : relatedActions.slice(0, COLLAPSE_COUNT);

  return (
    <div>
      <button
        onClick={() => navigate('/wiki')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 案件一覧へ戻る
      </button>

      {/* タイトル */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>📚</span>
          <h1 className="text-xl font-semibold text-ink">{page.counterparty}</h1>
        </div>
        <p className="mt-1 text-sm text-ink-sub">{page.purpose}</p>
        <p className="mt-0.5 text-xs text-ink-sub/70">
          {page.name}　·　🤖 AIが維持（毎朝6:00更新）　·　最終更新 {page.updatedAt.slice(5).replace('-', '/')}
        </p>
      </div>

      <div className="overflow-hidden bg-white">
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 商談フェーズ */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ 商談フェーズ</h2>
            <PhaseBar current={page.salesPhase} />
          </section>

          {/* 直近の状況（全記述に出典） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 直近の状況</h2>
            <div className={`rounded-lg border px-4 py-3 ${page.alerts.length > 0 ? 'border-warn/30 bg-warn/10' : 'border-line bg-surface'}`}>
              {page.alerts.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {page.alerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm font-medium text-warn">
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

          {/* 案件情報 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink">◆ 案件情報</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="担当営業" value={page.salesRep} />
              <Field label="カテゴリ" value={page.category} />
              <Field label="受注金額" value={page.orderAmount} />
              <Field label="プリセールス開始日" value={page.preSalesStartDate} />
              <Field
                label="プロジェクト期間"
                value={
                  page.projectStartDate
                    ? page.projectEndDate
                      ? `${page.projectStartDate} ～ ${page.projectEndDate}`
                      : `${page.projectStartDate} ～`
                    : null
                }
              />
              {page.facts.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} />
              ))}
            </dl>
          </section>

          {/* タスク一覧（このページから導出されたビュー） */}
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

          {/* 関連する意思決定（Decision Log） */}
          {relatedDecisions.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">
                ◆ 関連する意思決定
                <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                  {relatedDecisions.length}
                </span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {relatedDecisions.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => navigate(`/decisions/${d.id}`, { state: { from: `/projects/${id}` } })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden className="shrink-0 text-base">⚖️</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{d.title}</p>
                      <DecisionStatusPill status={d.status} />
                      {d.deadline && d.status === '提案中' && (
                        <span className="shrink-0 text-xs text-ink-sub">期限 {shortDate(d.deadline)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 次回打ち合わせ */}
          {page.nextMeeting && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ 次回打ち合わせ</h2>
              <div className="flex items-start gap-3 rounded-lg border border-line bg-accent-soft px-4 py-3">
                <span className="shrink-0 text-lg" aria-hidden>📅</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {page.nextMeeting.date.slice(5).replace('-', '/')} {page.nextMeeting.time}
                    　{page.nextMeeting.purpose}
                  </p>
                  {page.nextMeeting.location && (
                    <p className="mt-0.5 text-xs text-ink-sub">📍 {page.nextMeeting.location}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* この案件に質問する（query） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ この案件に質問する</h2>
            <AskPanel qa={page.qa} counterparty={page.counterparty} />
          </section>

          {/* 更新履歴（AIによるページ維持の記録） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">
              ◆ 更新履歴
              <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {updates.length}
              </span>
            </h2>
            <UpdateTimeline updates={visibleUpdates} />
            {updates.length > COLLAPSE_COUNT && (
              <button
                onClick={() => setShowAllUpdates((v) => !v)}
                className="mt-2 text-sm font-medium text-accent hover:underline"
              >
                {showAllUpdates ? '折りたたむ' : `さらに ${updates.length - COLLAPSE_COUNT} 件を表示`}
              </button>
            )}
          </section>

          {/* 原文ソース（raw 層）。wiki の根拠になった受信データ */}
          <section>
            <button
              onClick={() => setShowActivities((v) => !v)}
              aria-expanded={showActivities}
              className="flex items-center gap-1.5 text-sm font-semibold text-ink"
            >
              <span aria-hidden className={`text-[10px] text-ink-sub transition-transform ${showActivities ? 'rotate-90' : ''}`}>❯</span>
              ◆ 原文ソース
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {activities.length}
              </span>
            </button>
            {showActivities && (
              activities.length === 0 ? (
                <p className="mt-2 text-sm text-ink-sub">この案件に紐づく原文はありません</p>
              ) : (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {activities.map((item) => {
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
                          {item.resultActionId && (
                            <span className="shrink-0 text-xs font-medium text-good">✔ タスク化</span>
                          )}
                          <span className="shrink-0 tabular-nums text-xs text-ink-sub">{elapsed}前</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </section>

          {/* 資料リンク */}
          {page.documents && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink">◆ 資料</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-sub">提案資料</p>
                  {page.documents.proposals.length === 0 ? (
                    <p className="text-xs text-ink-sub/60">なし</p>
                  ) : (
                    <ul className="space-y-1">
                      {page.documents.proposals.map((doc, i) => (
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
                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-sub">受領資料</p>
                  {page.documents.received.length === 0 ? (
                    <p className="text-xs text-ink-sub/60">なし</p>
                  ) : (
                    <ul className="space-y-1">
                      {page.documents.received.map((doc, i) => (
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
