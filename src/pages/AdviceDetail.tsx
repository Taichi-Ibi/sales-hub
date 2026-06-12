import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DealAdvice, RelayDraft } from '../data/advice';
import { findDealEntry } from '../data/snapshots';
import { QA_FALLBACK } from '../data/wiki';
import { useStore } from '../store/StoreContext';
import { extractRefs, MarkdownView, References, renderInline } from '../components/MarkdownView';
import { TraceLink } from '../components/WikiParts';
import type { MaskedEntity } from '../types';

interface ChatMessage {
  q: string;
  a: string;
  evidence: string[];
}

/**
 * ④対話ビュー。Wikipedia の「ノート（トーク）ページ」の拡張:
 * この助言についてAIと議論できる（モックでは想定問答＋フォールバック。1.2秒の思考演出）。
 */
function TalkSection({ advice, entities }: { advice: DealAdvice; entities: MaskedEntity[] }) {
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
    <section>
      <h2 className="wiki-h2">ノート — この助言についてAIと対話する</h2>
      {messages.map((m, i) => (
        <div key={i} className="my-2 border-l-2 border-line-light pl-3">
          <p className="my-0 font-bold">Q. {m.q}</p>
          <p className="my-0">{renderInline(m.a, entities)}</p>
          {m.evidence.length > 0 && (
            <p className="my-0 text-xs text-ink-sub">
              根拠:{' '}
              {m.evidence.map((id, j) => (
                <span key={id}>
                  {j > 0 && '、'}
                  <TraceLink traceId={id} />
                </span>
              ))}
            </p>
          )}
        </div>
      ))}
      {thinking && <p className="text-[13px] text-ink-sub">Wikiと痕跡を読んでいます…</p>}
      {remaining.length > 0 && (
        <p className="text-[13px]">
          {remaining.map((item, i) => (
            <span key={item.q}>
              {i > 0 && ' | '}
              <a onClick={() => !thinking && ask(item.q)}>{item.q}</a>
            </span>
          ))}
        </p>
      )}
      <form
        className="mt-1 flex gap-2"
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
          className="min-w-0 flex-1 border border-line px-2 py-1 text-sm"
        />
        <button className="btn" disabled={thinking || !question.trim()}>質問</button>
      </form>
    </section>
  );
}

/** 宛先別の伝達ドラフト。伝達の実行（コピー）は必ず人の明示的な操作で、記録に残る。 */
function RelayDraftSection({
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
    <div className="my-3">
      <h3 className="my-1 text-[15px] font-bold">{draft.recipient}宛 — {draft.subject}</h3>
      <div className="border border-line-light bg-surface px-3 py-2">
        <p className="my-0 whitespace-pre-wrap">{renderInline(draft.body, entities)}</p>
      </div>
      <p className="my-1">
        <button className="btn" onClick={() => copyRelay(advice, draft)}>
          {copied ? '再コピーする' : 'コピーする'}
        </button>
      </p>
    </div>
  );
}

/**
 * 助言の記事ページ（/advice/:id）。③の出力（frontmatter＋Markdown）を
 * Wikipedia の記事として表示し、ノート（④対話）と伝達（コピーのみ）を重ねる。
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
      <div>
        <h1 className="wiki-h1">助言が見つかりません</h1>
        <p>
          <a onClick={() => navigate('/advice')}>特別:助言へ戻る</a>
        </p>
      </div>
    );
  }

  const entry = findDealEntry(advice.dealId);
  const entities = entry?.entities ?? [];
  const refs = extractRefs(advice.markdown);
  const dealRelayLogs = relayLogs.filter((l) => l.dealId === advice.dealId);

  return (
    <div>
      <p className="text-xs text-ink-sub">
        &lt; <a onClick={() => navigate('/advice')}>特別:助言</a>
      </p>
      <h1 className="wiki-h1">{advice.title}</h1>

      {/* infobox（frontmatter。監査・透明性: いつ・どの入力から生成されたか） */}
      <table className="infobox">
        <caption>助言</caption>
        <tbody>
          <tr>
            <th>記事</th>
            <td>
              {entry ? (
                <a onClick={() => navigate(`/wiki/${entry.id}`)}>
                  {entry.counterparty} {entry.name}
                </a>
              ) : (
                advice.dealId
              )}
            </td>
          </tr>
          <tr><th>種別</th><td>{advice.kind}</td></tr>
          <tr><th>生成</th><td className="tabular-nums">{advice.generatedAt}</td></tr>
        </tbody>
      </table>

      {/* ③の本文。Wikiと同じく Markdown をレンダリングするだけ。
          事実セクションの全行に脚注（出典のない行はバリデーションで弾かれる） */}
      <MarkdownView markdown={advice.markdown} entities={entities} refs={refs} />

      <div className="clear-right">
        <References markdown={advice.markdown} entities={entities} />

        <TalkSection advice={advice} entities={entities} />

        <section>
          <h2 className="wiki-h2">伝達ドラフト</h2>
          {advice.relayDrafts.map((draft) => (
            <RelayDraftSection key={draft.id} advice={advice} draft={draft} entities={entities} />
          ))}
        </section>

        {dealRelayLogs.length > 0 && (
        <section>
          <h2 className="wiki-h2">伝達記録</h2>
          <div className="overflow-x-auto">
            <table className="wikitable">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>宛先</th>
                  <th>件名</th>
                  <th>記録ID</th>
                </tr>
              </thead>
              <tbody>
                {dealRelayLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap tabular-nums">{log.copiedAt}</td>
                    <td className="whitespace-nowrap">{log.recipient}</td>
                    <td>{log.subject}</td>
                    <td className="whitespace-nowrap"><code className="text-[11px]">{log.id}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
