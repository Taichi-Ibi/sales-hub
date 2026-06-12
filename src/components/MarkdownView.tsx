import type { ReactNode } from 'react';
import type { MaskedEntity } from '../types';
import { findTrace } from '../data/traces';
import { SourceLink } from './WikiParts';

// 商談Wiki・助言で共用する極小Markdownレンダラ（依存追加なし）。
// 対応構文は 見出し(##/###)・箇条書き(-)・段落 のみ。
//   - 行中の [tr:xxx] は Wikipedia の脚注（上付きの [1]）に変換し、
//     ページ末尾の「出典」節（References）で解決する
//   - マスクトークン（〔氏名①〕等）は表示層で復元する（点線下線で示す）
//     AI処理はマスク済みのまま。復元はレンダリング時のみ、という建て付け

/** markdown 中の痕跡参照（[tr:xxx]）を出現順・重複なしで返す。脚注番号の台帳。 */
export function extractRefs(markdown: string): string[] {
  const refs: string[] = [];
  for (const m of markdown.matchAll(/\[tr:([^\]]+)\]/g)) {
    if (!refs.includes(m[1])) refs.push(m[1]);
  }
  return refs;
}

/** トークン（〔…〕）の復元と痕跡参照（[tr:xxx]→上付き[n]）を行うインライン描画。 */
export function renderInline(
  text: string,
  entities: MaskedEntity[] = [],
  refs: string[] = [],
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(〔[^〕]+〕|\s*\[tr:[^\]]+\])/g;
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index!;
    if (start > last) out.push(<span key={key++}>{text.slice(last, start)}</span>);
    const token = m[0].trim();
    if (token.startsWith('[tr:')) {
      const id = token.slice(4, -1);
      const n = refs.indexOf(id) + 1;
      out.push(
        <sup key={key++} className="text-xs">
          <a href={`#cite-${id}`}>[{n > 0 ? n : '?'}]</a>
        </sup>,
      );
    } else {
      const ent = entities.find((e) => e.token === token);
      out.push(
        <span
          key={key++}
          className="underline decoration-dotted decoration-line"
          title={ent ? `${token}（表示時に復元）` : `${token}（マスク済み）`}
        >
          {ent ? ent.decryptedValue : token}
        </span>,
      );
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return out;
}

interface Props {
  markdown: string;
  /** マスクトークンの復元テーブル（表示層でのみ使用）。 */
  entities?: MaskedEntity[];
  /** 実行時取込で追記された行に「（今日の取込）」を付ける判定。 */
  highlightLines?: ReadonlySet<string>;
  /** 脚注番号の台帳。省略時は markdown 自身から採番する。 */
  refs?: string[];
}

export function MarkdownView({ markdown, entities = [], highlightLines, refs }: Props) {
  const refList = refs ?? extractRefs(markdown);
  const lines = markdown.split('\n');
  const blocks: ReactNode[] = [];
  let listBuf: { text: string; highlighted: boolean }[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key++} className="list-disc pl-6">
        {listBuf.map((item, i) => (
          <li key={i}>
            {renderInline(item.text, entities, refList)}
            {item.highlighted && <strong className="ml-1 text-xs">（今日の取込）</strong>}
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) {
      const text = line.slice(2);
      listBuf.push({ text, highlighted: highlightLines?.has(text) ?? false });
      continue;
    }
    flushList();
    if (line.startsWith('### ')) {
      blocks.push(<h3 key={key++} className="mt-3 text-[15px] font-bold">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={key++} className="wiki-h2">{line.slice(3)}</h2>);
    } else if (line.trim() !== '') {
      blocks.push(<p key={key++} className="my-1">{renderInline(line, entities, refList)}</p>);
    }
  }
  flushList();

  return <div>{blocks}</div>;
}

/**
 * 「出典」節。markdown 中の脚注（[n]）をここで解決する。
 * Wikipedia の References の引用。原文が受信箱に残っていれば青リンク。
 */
export function References({
  markdown,
  refs,
  entities = [],
}: {
  markdown?: string;
  refs?: string[];
  entities?: MaskedEntity[];
}) {
  const refList = refs ?? extractRefs(markdown ?? '');
  if (refList.length === 0) return null;
  return (
    <section>
      <h2 className="wiki-h2">出典</h2>
      <ol className="list-decimal pl-6 text-[13px]">
        {refList.map((id) => {
          const trace = findTrace(id);
          return (
            <li key={id} id={`cite-${id}`}>
              ↑{' '}
              {trace ? (
                <>
                  <SourceLink source={{ label: trace.label, inboxItemId: trace.inboxItemId }} />
                  {trace.excerpt && (
                    <span className="text-ink-sub">　{renderInline(trace.excerpt, entities)}</span>
                  )}
                </>
              ) : (
                <span>{id}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
