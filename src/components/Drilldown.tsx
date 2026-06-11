import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Action, MaskedEntity } from '../types';
import { SOURCE_META } from '../data/inbox';
import { findWikiByCounterparty } from '../data/wiki';
import { MASK_TYPE_MAP } from '../lib/maskTypes';

/** "2026-06-05T09:00:00" → "6/5 09:00" */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

type Seg = { kind: 'text'; value: string } | { kind: 'chip'; entity: MaskedEntity };

/** 原文（マスク前）に伏せ字を適用してセグメント化する。台帳側は常にマスク表示。 */
function maskedSegments(body: string, entities: MaskedEntity[]): Seg[] {
  let segs: Seg[] = [{ kind: 'text', value: body }];
  for (const e of entities) {
    segs = segs.flatMap((s) => {
      if (s.kind !== 'text') return [s];
      const parts = s.value.split(e.decryptedValue);
      if (parts.length === 1) return [s];
      const out: Seg[] = [];
      parts.forEach((p, i) => {
        if (i > 0) out.push({ kind: 'chip', entity: e });
        if (p) out.push({ kind: 'text', value: p });
      });
      return out;
    });
  }
  return segs;
}

/** 伏せ字適用済みテキスト。台帳側では原文も差出人もマスクを外さない。 */
function MaskedText({ text, entities }: { text: string; entities: MaskedEntity[] }) {
  return (
    <>
      {maskedSegments(text, entities).map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <span
            key={i}
            className={`mx-0.5 rounded px-1 py-0.5 text-xs font-medium ${MASK_TYPE_MAP[seg.entity.type].chipClass}`}
          >
            <span aria-hidden>{MASK_TYPE_MAP[seg.entity.type].icon}</span> {seg.entity.token}
          </span>
        ),
      )}
    </>
  );
}

/** 折りたたみブロック。既定は閉。タスク実行中に必要なときだけ開く。 */
function Disclosure({
  icon,
  title,
  meta,
  children,
}: {
  icon: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-line/50"
      >
        <span aria-hidden className={`text-xs text-ink-sub transition-transform ${open ? 'rotate-90' : ''}`}>
          ❯
        </span>
        <span aria-hidden>{icon}</span>
        <span className="min-w-0 truncate">{title}</span>
        {meta && (
          <span className="ml-auto hidden shrink-0 text-xs font-normal text-ink-sub sm:inline">
            {meta}
          </span>
        )}
      </button>
      {open && <div className="border-t border-line bg-white p-3 sm:p-4">{children}</div>}
    </div>
  );
}

/**
 * 経緯のドリルダウン。タスク実行者が判断に迷ったとき、
 * 1) そもそもの原文（Slack/メール/議事録）と 2) 案件ページ（AIが維持する wiki）
 * まで掘れるようにする。
 */
export function ContextDrilldown({ action }: { action: Action }) {
  const navigate = useNavigate();
  const origin = action.origin;
  const wiki = findWikiByCounterparty(action.counterparty);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-ink">◆ 経緯を深掘り</h2>
      <div className="flex flex-col gap-2">
        {/* 1) 原文: このタスクの元になった Slack/メール/議事録 */}
        <Disclosure
          icon={origin ? SOURCE_META[origin.source].icon : '📨'}
          title={origin ? `原文 — ${origin.title}` : '原文'}
          meta={origin ? `${SOURCE_META[origin.source].label}・${fmtDateTime(origin.receivedAt)}` : undefined}
        >
          {origin ? (
            <>
              <p className="mb-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-sub">
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 font-medium text-ink">
                  <span aria-hidden>{SOURCE_META[origin.source].icon}</span>
                  {SOURCE_META[origin.source].label}
                </span>
                <span>
                  <MaskedText text={origin.sender} entities={action.maskedEntities} />
                </span>
                <span aria-hidden>・</span>
                <span className="tabular-nums">{fmtDateTime(origin.receivedAt)} 受信</span>
              </p>
              {/* 原文は伏せ字適用済みで表示（台帳ではマスクを外さない） */}
              <div className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm leading-relaxed text-ink">
                <MaskedText text={origin.body} entities={action.maskedEntities} />
              </div>
              {origin.inboxItemId && (
                <button
                  onClick={() => navigate(`/inbox/${origin.inboxItemId}`)}
                  className="mt-2 text-sm font-medium text-accent hover:underline"
                >
                  受信箱で開く ❯
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-sub">原文の記録はありません。</p>
          )}
        </Disclosure>

        {/* 2) 案件ページ: AIが維持する wiki の要約。詳細はページ本体へ */}
        <Disclosure
          icon="📚"
          title={`案件ページ — ${action.counterparty}`}
          meta={wiki ? `最終更新 ${wiki.updatedAt.slice(5).replace('-', '/')} 06:00` : undefined}
        >
          {wiki ? (
            <>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {wiki.facts.map((f) => (
                  <div key={f.label} className="flex gap-2 text-sm">
                    <dt className="w-24 shrink-0 text-ink-sub">{f.label}</dt>
                    <dd className="min-w-0 flex-1 font-medium text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mb-1.5 mt-4 text-xs font-semibold text-ink-sub">
                直近の状況（AIが出典つきで維持）
              </h3>
              <ul className="flex flex-col gap-1.5">
                {wiki.statements.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-ink-sub" aria-hidden>・</span>
                    <span className="text-ink">{s.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(`/projects/${wiki.id}`)}
                className="mt-3 text-sm font-medium text-accent hover:underline"
              >
                案件ページを開く ❯
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-sub">この取引先の案件ページは未作成です。</p>
          )}
        </Disclosure>
      </div>
    </section>
  );
}
