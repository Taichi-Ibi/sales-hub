import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAILY_DIGEST } from '../data/digest';
import { SOURCE_META } from '../data/inbox';
import { LEDGER_STATUSES, useStore } from '../store/StoreContext';
import { DecisionStatusPill, SourceChip } from '../components/WikiParts';
import { NOW, elapsedSince, shortDate } from '../lib/time';

// デイリーダイジェスト（動線A:「昨日から何が変わった？」）。
// OODA（観測→状況認識→意思決定→実行）の順に、毎朝6:00時点の組織の変化を提示する。
// 生成後に届いた原文は「生成後の新着」としてライブ算出し、目視ゲートへ誘導する
// （目視確認＝Observe の入口。確認前の内容はダイジェストにも載らない）。

const GENERATED_AT_ISO = '2026-06-10T06:00:00';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** OODAセクションの見出し。「今日」の SectionHeader と同型＋英語ラベル。 */
function OodaHeader({
  title,
  en,
  note,
  count,
  dot,
}: {
  title: string;
  en: string;
  note: string;
  count: number;
  dot: string;
}) {
  return (
    <div className="mb-2 mt-7 flex flex-wrap items-center gap-2 first:mt-0">
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot}`} />
      <h2 className="text-sm font-bold tracking-wide text-ink">
        {title} <span className="font-medium text-ink-sub">{en}</span>
      </h2>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
        {count}
      </span>
      <span className="text-xs text-ink-sub">{note}</span>
    </div>
  );
}

export function Digest() {
  const navigate = useNavigate();
  const { actions, inboxItems, decisions, markDigestViewed } = useStore();

  // 一度開いたらナビバッジを消す。
  useEffect(() => {
    markDigestViewed();
  }, [markDigestViewed]);

  // 生成後（6:00以降）に届いた目視確認待ち。ダイジェストには載らず、ゲートへ誘導する。
  const newSinceGenerated = useMemo(
    () => inboxItems.filter((i) => i.status === '要確認' && i.receivedAt > GENERATED_AT_ISO),
    [inboxItems],
  );

  // 忘れかけているもの: 72時間以上動いていない未完了タスクを再浮上させる。
  const stale = useMemo(
    () =>
      actions.filter(
        (a) => LEDGER_STATUSES.includes(a.status) && elapsedSince(a.createdAt).level === 'danger',
      ),
    [actions],
  );

  const decideItems = DAILY_DIGEST.decide
    .map((item) => ({ item, decision: decisions.find((d) => d.id === item.decisionId) }))
    .filter((x) => x.decision !== undefined);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-semibold text-ink">デイリーダイジェスト</h1>
        <span className="text-sm tabular-nums text-ink-sub">
          {NOW.getMonth() + 1}/{NOW.getDate()}（{WEEKDAYS[NOW.getDay()]}）
        </span>
      </div>

      {/* 生成の建て付け */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-sub">
        <span aria-hidden>🤖</span>
        <span className="font-medium text-ink">毎朝6:00に生成</span>
        <span aria-hidden>·</span>
        <span>目視確認済みの原文（Slack・メール・カレンダー）と wiki から。全記述に出典つき</span>
      </div>

      {/* ヘッドライン */}
      <div className="mb-2 rounded-lg border border-line bg-accent-soft px-4 py-3">
        <p className="text-sm font-medium leading-relaxed text-ink">{DAILY_DIGEST.headline}</p>
      </div>

      {/* 観測 Observe */}
      <section>
        <OodaHeader
          title="観測"
          en="Observe"
          note="昨日からの新しい動き"
          count={DAILY_DIGEST.observe.length}
          dot="bg-accent"
        />
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {DAILY_DIGEST.observe.map((o, i) => {
            const meta = SOURCE_META[o.source];
            return (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="shrink-0 text-base" aria-hidden title={meta.label}>
                  {meta.icon}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                  {o.text}
                  {o.ref && (
                    <span className="ml-1.5 inline-flex align-middle">
                      <SourceChip source={o.ref} />
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
        {/* 生成後の新着 → 目視ゲート（Observe の入口）へ */}
        {newSinceGenerated.length > 0 && (
          <button
            onClick={() => navigate('/inbox')}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-sm hover:bg-amber-100"
          >
            <span aria-hidden>🛡️</span>
            <span className="min-w-0 flex-1 font-medium text-amber-800">
              生成後の新着 — 目視確認待ち {newSinceGenerated.length}件
            </span>
            <span className="shrink-0 text-xs text-amber-800">
              確認するとAIが取り込みます（全件目視確認制） ❯
            </span>
          </button>
        )}
      </section>

      {/* 状況認識 Orient */}
      <section>
        <OodaHeader
          title="状況認識"
          en="Orient"
          note="つながりと認識ギャップ"
          count={DAILY_DIGEST.orient.length}
          dot="bg-warn"
        />
        <ul className="flex flex-col gap-2">
          {DAILY_DIGEST.orient.map((o, i) => (
            <li
              key={i}
              className={`rounded-lg border px-4 py-3 ${o.gap ? 'border-amber-200 bg-amber-50' : 'border-line bg-white'}`}
            >
              <p className={`text-sm leading-relaxed ${o.gap ? 'font-medium text-amber-800' : 'text-ink'}`}>
                {o.gap && <span aria-hidden className="mr-1.5">⚠️</span>}
                {o.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {o.refs.map((r, j) => (
                  <SourceChip key={j} source={r} />
                ))}
                {o.link && (
                  <button
                    onClick={() => navigate(o.link!.to)}
                    className="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent transition-colors hover:border-accent"
                  >
                    {o.link.label} ❯
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 意思決定 Decide */}
      <section>
        <OodaHeader
          title="意思決定"
          en="Decide"
          note="判断が必要な論点"
          count={decideItems.length}
          dot="bg-purple-500"
        />
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {decideItems.map(({ item, decision }) => (
            <li key={item.decisionId}>
              <button
                onClick={() => navigate(`/decisions/${decision!.id}`, { state: { from: '/digest' } })}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface"
              >
                <span aria-hidden className="shrink-0 text-base">⚖️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{decision!.title}</p>
                  <p className="mt-0.5 text-xs text-ink-sub">
                    {decision!.counterparty}　·　{item.note}
                  </p>
                </div>
                <DecisionStatusPill status={decision!.status} />
                {decision!.deadline && decision!.status === '提案中' && (
                  <span className="hidden shrink-0 text-xs font-medium text-warn sm:inline">
                    期限 {shortDate(decision!.deadline)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 実行 Act */}
      <section>
        <OodaHeader
          title="実行"
          en="Act"
          note="今日の推奨アクション"
          count={DAILY_DIGEST.act.length}
          dot="bg-good"
        />
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {DAILY_DIGEST.act.map((a, i) => {
            if (a.actionId) {
              const action = actions.find((x) => x.id === a.actionId);
              if (!action) return null;
              return (
                <li key={i}>
                  <button
                    onClick={() => navigate(`/action/${action.id}`, { state: { from: '/digest' } })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                  >
                    <span aria-hidden className="shrink-0 text-base">📋</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {action.counterparty} {action.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-sub">
                        期限 {shortDate(action.dueDate)}　·　{action.status}
                      </p>
                    </div>
                    <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
                  </button>
                </li>
              );
            }
            if (a.meetingId) {
              return (
                <li key={i}>
                  <button
                    onClick={() => navigate(`/meetings/${a.meetingId}`, { state: { from: '/digest' } })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                  >
                    <span aria-hidden className="shrink-0 text-base">📅</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{a.suggestion}</p>
                    <span aria-hidden className="shrink-0 text-xs text-ink-sub">❯</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden className="shrink-0 text-base">💡</span>
                <p className="min-w-0 flex-1 text-sm text-ink">{a.suggestion}</p>
              </li>
            );
          })}
        </ul>

        {/* 忘れかけているもの: 放置タスクの再浮上（忘却の彼方への対策） */}
        {stale.length > 0 && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm font-semibold text-danger">
              <span aria-hidden>⏰ </span>忘れかけているもの（3日以上動いていません）
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {stale.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => navigate(`/action/${a.id}`, { state: { from: '/digest' } })}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-white"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {a.counterparty} {a.title}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-danger">
                      ⏱ {elapsedSince(a.createdAt).label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
