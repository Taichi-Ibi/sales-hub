import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DealAdvice, RelayDraft } from '../data/advice';
import { findDealEntry } from '../data/snapshots';
import { QA_FALLBACK } from '../data/wiki';
import { useStore } from '../store/StoreContext';
import { Button } from '../components/Button';
import { MarkdownView, renderInline } from '../components/MarkdownView';
import { Field, TraceChip } from '../components/WikiParts';
import type { MaskedEntity } from '../types';

interface ChatMessage {
  q: string;
  a: string;
  evidence: string[];
}

/**
 * ④対話ビュー。対象商談のWikiと当日の助言をコンテキストに、AIとチャットできる
 * （モックでは想定問答＋フォールバックでクエリをシミュレート。1.2秒の思考演出）。
 */
function ChatPanel({ advice, entities }: { advice: DealAdvice; entities: MaskedEntity[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function ask(q: string) {
    const matched = advice.chatQa.find((item) => item.q === q);
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, matched ?? { q, a: QA_FALLBACK, evidence: [] }]);
      setThinking(false);
    }, 1200);
  }

  const remaining = advice.chatQa.filter((item) => !messages.some((m) => m.q === item.q));

  return (
    <div className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      {messages.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i}>
              <div className="ml-auto w-fit max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm text-white">
                {m.q}
              </div>
              <div className="mt-1.5 w-fit max-w-[90%] rounded-lg border border-line bg-white px-3 py-2">
                <p className="text-sm leading-relaxed text-ink">{renderInline(m.a, entities)}</p>
                {m.evidence.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-ink-sub">根拠:</span>
                    {m.evidence.map((id) => (
                      <TraceChip key={id} traceId={id} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {thinking && (
        <p className="mb-3 flex items-center gap-2 text-sm text-ink-sub">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
          Wikiと痕跡を読んでいます…
        </p>
      )}

      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((item) => (
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
      )}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim() && !thinking) { ask(question.trim()); setQuestion(''); }
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="この助言について質問…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />
        <Button variant="secondary" disabled={thinking || !question.trim()}>
          質問
        </Button>
      </form>
    </div>
  );
}

/** 宛先別の伝達ドラフト。伝達の実行（コピー）は必ず人の明示的な操作で、ログに記録される。 */
function RelayDraftCard({
  advice,
  draft,
  entities,
}: {
  advice: DealAdvice;
  draft: RelayDraft;
  entities: MaskedEntity[];
}) {
  const { copyRelay, relayLogs } = useStore();
  const copied = relayLogs.some((l) => l.adviceId === advice.id && l.recipient === draft.recipient);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
          {draft.recipient}宛
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{draft.subject}</span>
      </div>
      <div className="px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {renderInline(draft.body, entities)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
          <span className="text-[11px] text-ink-sub">元になった助言の根拠:</span>
          {draft.evidence.map((id) => (
            <TraceChip key={id} traceId={id} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        <p className="min-w-0 flex-1 text-xs text-ink-sub">
          自動送信はされません。コピーして{draft.recipient}へ伝達してください。
        </p>
        <Button variant="primary" onClick={() => copyRelay(advice, draft)}>
          {copied ? '再コピーする' : 'コピーする'}
        </Button>
      </div>
    </div>
  );
}

/**
 * 助言の詳細（/advice/:id）。③の出力（事実/解釈/確信度を分離、全事実行に根拠リンク）に、
 * ④対話と伝達（チャット・宛先別ドラフト・伝達ログ）を重ねた画面。
 */
export function AdviceDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { allAdvice, markAdviceRead, relayLogs } = useStore();
  const advice = allAdvice.find((a) => a.id === id);

  useEffect(() => {
    if (advice) markAdviceRead(advice.id);
  }, [advice, markAdviceRead]);

  if (!advice) {
    return (
      <div className="py-20 text-center text-ink-sub">
        助言が見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/advice')}>助言一覧へ戻る</Button>
        </div>
      </div>
    );
  }

  const entry = findDealEntry(advice.dealId);
  const entities = entry?.entities ?? [];
  const dealRelayLogs = relayLogs.filter((l) => l.dealId === advice.dealId);

  return (
    <div>
      <button
        onClick={() => navigate('/advice')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 助言一覧へ戻る
      </button>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink">{advice.title}</h1>
        <p className="mt-0.5 text-xs text-ink-sub/70">advice/{advice.dealId}/{advice.date}.md</p>
      </div>

      <div className="flex flex-col gap-6 bg-white p-4 sm:p-5">
        {/* frontmatter（最低限のメタ。監査・透明性: いつ・どの入力から生成されたか） */}
        <section>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface px-4 py-3 sm:grid-cols-4">
            <Field
              label="案件"
              value={entry ? entry.counterparty : advice.dealId}
            />
            <Field label="種別" value={advice.kind} />
            <Field label="優先度" value={advice.priority} />
            <Field label="生成" value={advice.generatedAt} />
          </dl>
          <p className="mt-2 text-[11px] text-ink-sub">
            入力:{' '}
            {advice.inputs.map((input, i) => (
              <code key={i} className="mx-0.5 rounded bg-surface px-1 py-0.5 text-[10px]">
                {input}
              </code>
            ))}
            {entry && (
              <button
                onClick={() => navigate(`/wiki/${entry.id}`)}
                className="ml-2 font-medium text-accent hover:underline"
              >
                📖 Wikiを開く ❯
              </button>
            )}
          </p>
        </section>

        {/* ③の本文。Wikiと同じく Markdown をレンダリングするだけ。
            事実セクションの全行に根拠リンク（出典のない行はバリデーションで弾かれる） */}
        <section>
          <MarkdownView markdown={advice.markdown} entities={entities} />
        </section>

        {/* ④対話ビュー */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">◆ この助言についてAIと対話する</h2>
          <ChatPanel advice={advice} entities={entities} />
        </section>

        {/* ④伝達ドラフト（宛先別）。コピーは人の明示的な操作 */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">◆ 伝達ドラフト</h2>
          <div className="flex flex-col gap-3">
            {advice.relayDrafts.map((draft) => (
              <RelayDraftCard key={draft.id} advice={advice} draft={draft} entities={entities} />
            ))}
          </div>
        </section>

        {/* 伝達ログ（relay/）。①へ還流する痕跡互換の記録 */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">
            ◆ この案件の伝達ログ
            <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
              {dealRelayLogs.length}
            </span>
          </h2>
          {dealRelayLogs.length === 0 ? (
            <p className="text-sm text-ink-sub">まだ伝達していません。コピーすると記録されます。</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {dealRelayLogs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span aria-hidden className="shrink-0">📣</span>
                  <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                    {log.recipient}宛
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{log.subject}</span>
                  <code className="hidden shrink-0 rounded bg-surface px-1 py-0.5 text-[10px] text-ink-sub sm:inline">
                    {log.id}
                  </code>
                  <span className="shrink-0 tabular-nums text-xs text-ink-sub">{log.copiedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
