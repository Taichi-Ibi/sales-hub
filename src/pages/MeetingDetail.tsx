import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { InboxItem } from '../types';
import { findWikiByCounterparty } from '../data/wiki';
import { findPersonByLabel } from '../data/people';
import { DEMO_MINUTES } from '../data/inbox';
import { LEDGER_STATUSES, APPROVAL_STATUSES, useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { DecisionStatusPill, SourceChip, UpdateTimeline } from '../components/WikiParts';
import { shortDate } from '../lib/time';

// 会議ページ。カレンダーの予定を軸に、開催前は「この案件、今どうなってる？」
// （事前ブリーフ）、終了後は「会議の後、何をすべき？」（フォローアップ）に答える。
// 事前ブリーフは案件 wiki・意思決定ログ・タスクから合成され、全記述に出典がつく。
// 議事録は必ず目視ゲートを通る: 確認が済むまでフォローアップは表示されない。

function eventRangeLabel(item: InboxItem): string {
  if (!item.eventAt) return '';
  const s = new Date(item.eventAt);
  const fmt = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = `${s.getMonth() + 1}/${s.getDate()}`;
  if (!item.eventEnd) return `${day} ${fmt(s)}`;
  return `${day} ${fmt(s)}-${fmt(new Date(item.eventEnd))}`;
}

/** 参加者チップ。人物ページがあれば遷移できる。 */
function ParticipantChips({ participants }: { participants: string[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap gap-1.5">
      {participants.map((label) => {
        const person = findPersonByLabel(label);
        if (person) {
          return (
            <button
              key={label}
              onClick={() => navigate(`/wiki/person/${person.id}`)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1 text-xs text-ink transition-colors hover:border-accent/50 hover:text-accent"
              title="人物ページを開く"
            >
              <span aria-hidden>👤</span>
              {label}
              <span className="text-[10px] text-ink-sub">{person.role}</span>
              <span aria-hidden>❯</span>
            </button>
          );
        }
        return (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-sub"
          >
            <span aria-hidden>👤</span>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** 事前ブリーフ（開催前）。wiki・意思決定・タスクを counterparty で合成する。 */
function PreMeetingBrief({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const { actions, decisions, wikiAppends } = useStore();

  const counterparty = item.counterparty || item.distilled.counterparty;
  const page = counterparty ? findWikiByCounterparty(counterparty) : undefined;
  const relatedDecisions = counterparty ? decisions.filter((d) => d.counterparty === counterparty) : [];
  const nextActions = counterparty
    ? actions.filter(
        (a) =>
          a.counterparty === counterparty &&
          (LEDGER_STATUSES.includes(a.status) || APPROVAL_STATUSES.includes(a.status)),
      )
    : [];
  const updates = page ? [...(wikiAppends[page.counterparty] ?? []), ...page.updates].slice(0, 3) : [];

  return (
    <>
      {/* 生成の建て付け（全記述に出典） */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-sub">
        <span aria-hidden>🤖</span>
        <span className="font-medium text-ink">事前ブリーフ</span>
        <span aria-hidden>·</span>
        <span>案件 wiki・意思決定ログ・タスクから自動生成。全記述に出典つき</span>
      </div>

      <div className="flex flex-col gap-6">
        {/* 会議のアジェンダ（カレンダー本文） */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">◆ 予定メモ（カレンダー）</h2>
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
            {item.body}
          </p>
        </section>

        {page ? (
          <>
            {/* 現在ステータス */}
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ 現在ステータス</h2>
              <div className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                    フェーズ: {page.salesPhase}
                  </span>
                  <span className="min-w-0 flex-1 text-ink">{page.purpose}</span>
                </div>
                <ul className="mt-2.5 space-y-2 border-t border-line/60 pt-2.5">
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
                <button
                  onClick={() => navigate(`/projects/${page.id}`)}
                  className="mt-2.5 text-sm font-medium text-accent hover:underline"
                >
                  案件ページを開く ❯
                </button>
              </div>
            </section>

            {/* 直近の変化 */}
            {updates.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ink">◆ 直近の変化</h2>
                <UpdateTimeline updates={updates} />
              </section>
            )}

            {/* 決定済み・未決の論点 */}
            {relatedDecisions.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ink">◆ 決定済み・未決の論点</h2>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {relatedDecisions.map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => navigate(`/decisions/${d.id}`, { state: { from: `/meetings/${item.id}` } })}
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

            {/* リスク */}
            {page.alerts.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ink">◆ リスク</h2>
                <ul className="space-y-1.5 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3">
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
              </section>
            )}

            {/* 次アクション */}
            {nextActions.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-ink">◆ 次アクション</h2>
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {nextActions.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => navigate(`/action/${a.id}`, { state: { from: `/meetings/${item.id}` } })}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                          <p className="mt-0.5 text-xs text-ink-sub">
                            期限 {shortDate(a.dueDate)}　·　{a.status}
                          </p>
                        </div>
                        <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-sub">
            この予定に紐づく案件ページはありません（社内会議・移動など）。
          </p>
        )}

        {/* 関係者 */}
        {item.participants && item.participants.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 関係者</h2>
            <ParticipantChips participants={item.participants} />
          </section>
        )}
      </div>
    </>
  );
}

/** フォローアップ（終了・議事録の目視確認＋AI解析済み）。 */
function PostMeetingFollowUp({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const { getAction } = useStore();
  const resultAction = item.resultActionId ? getAction(item.resultActionId) : undefined;
  const minutesRef = { label: item.title, inboxItemId: item.id };

  return (
    <div className="flex flex-col gap-6">
      {/* 監査: 目視確認の記録 */}
      <div className="flex items-center gap-2 rounded-lg border border-good/30 bg-good/5 px-3 py-2 text-xs text-ink">
        <span aria-hidden>✔</span>
        <span className="font-medium">議事録 目視確認済み</span>
        {item.verifiedBy && <span className="text-ink-sub">確認者: {item.verifiedBy}</span>}
        <span aria-hidden>·</span>
        <span className="text-ink-sub">AI解析済み</span>
      </div>

      {/* 会議で決まったこと */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">◆ 会議で決まったこと</h2>
        <div className="rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-sm leading-relaxed text-ink">
            {item.distilled.summary || item.analysisNote || '決定事項はありません。'}
            <span className="ml-1.5 inline-flex align-middle">
              <SourceChip source={minutesRef} />
            </span>
          </p>
          {item.distilled.context.length > 0 && (
            <ul className="mt-2 space-y-1.5 border-t border-line/60 pt-2">
              {item.distilled.context.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-ink">
                  <span aria-hidden className="shrink-0 text-ink-sub">・</span>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 誰が何をやるか（フォロータスク） */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">◆ 誰が何をやるか</h2>
        {resultAction ? (
          <button
            onClick={() => navigate(`/action/${resultAction.id}`, { state: { from: `/meetings/${item.id}` } })}
            className="flex w-full items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-left hover:bg-surface"
          >
            <span aria-hidden className="shrink-0 text-base">📋</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{resultAction.title}</p>
              <p className="mt-0.5 text-xs text-ink-sub">
                期限 {shortDate(resultAction.dueDate)}　·　{resultAction.status}　·　送るべきメール案は下書きから
              </p>
            </div>
            <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
          </button>
        ) : (
          <p className="text-sm text-ink-sub">{item.analysisNote ?? 'フォロータスクはありません。'}</p>
        )}
      </section>

      {/* 未回答の質問 */}
      {item.openQuestions && item.openQuestions.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">◆ 未回答の質問</h2>
          <ul className="space-y-1.5">
            {item.openQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span aria-hidden className="shrink-0 pt-0.5 text-ink-sub">❓</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 原文（議事録） */}
      <section>
        <button
          onClick={() => navigate(`/inbox/${item.id}`)}
          className="text-sm font-medium text-accent hover:underline"
        >
          議事録の原文を受信箱で見る ❯
        </button>
      </section>
    </div>
  );
}

export function MeetingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getInboxItem, endMeetingDemo } = useStore();

  const item = getInboxItem(id);
  const from = (location.state as { from?: string } | null)?.from ?? '/wiki?tab=meetings';

  if (!item || item.source !== 'schedule') {
    return (
      <div className="py-20 text-center text-ink-sub">
        会議ページが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/wiki?tab=meetings')}>
            会議一覧へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const before = item.status === '待機中';
  const reviewing = item.status === '要確認';
  const processed = item.status === '処理済み';
  const hasDemo = before && DEMO_MINUTES[item.id] !== undefined;

  return (
    <div>
      <button
        onClick={() => navigate(from)}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 戻る
      </button>

      {/* タイトル */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl" aria-hidden>📅</span>
          <h1 className="text-xl font-semibold text-ink">{item.title}</h1>
          {item.eventType && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-sub">
              {item.eventType}
            </span>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-sub">
          <span className="tabular-nums">{eventRangeLabel(item)}</span>
          {item.location && <span>📍 {item.location}</span>}
        </p>
      </div>

      {/* 議事録が目視確認待ちの間は、確認導線を最優先に出す（内容はゲート通過後のみ） */}
      {reviewing && (
        <div className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-medium text-warn">
            <span aria-hidden className="shrink-0">📬</span>
            議事録が届いています。目視確認が完了するまで、議事録の内容とフォローアップは表示されません（機密がないことを保証できるのは人間のみ）。
          </p>
          <div className="mt-2.5">
            <Button variant="primary" onClick={() => navigate(`/inbox/${item.id}`)}>
              受信箱で目視確認する ❯
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden bg-white">
        <div className="p-4 sm:p-5">
          {processed ? <PostMeetingFollowUp item={item} /> : <PreMeetingBrief item={item} />}

          {/* 会議終了デモ（モックの擬似挙動）。議事録は必ず目視ゲートに入る */}
          {hasDemo && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-xs text-ink-sub">
                  会議が終わると議事録がカレンダーから受信箱（目視確認待ち）に入ります。
                </p>
                <Button variant="secondary" onClick={() => endMeetingDemo(item.id)}>
                  （デモ）会議を終了して議事録を受信
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
