import type { ReactNode } from 'react';
import type { MaskedEntity } from '../types';
import { MASK_TYPE_MAP } from '../lib/maskTypes';
import { TraceChip } from './WikiParts';

// 商談Wiki・助言・伝達ドラフトで共用する極小Markdownレンダラ（依存追加なし）。
// 対応構文は 見出し(##/###)・箇条書き(-)・段落 のみ。
//   - 行中の [tr:xxx] は痕跡（traces）への根拠リンクチップに変換する
//   - マスクトークン（〔氏名①〕等）は表示層でチップとして復元する
//     （AI処理はマスク済みのまま。復元はレンダリング時のみ、という建て付け）

interface Props {
  markdown: string;
  /** マスクトークンの復元テーブル（表示層でのみ使用）。 */
  entities?: MaskedEntity[];
  /** 実行時取込で追記された行をハイライトするための判定。 */
  highlightLines?: ReadonlySet<string>;
}

/** トークン（〔…〕）と痕跡参照（[tr:xxx]）をチップ化したインライン要素列を返す。 */
export function renderInline(text: string, entities: MaskedEntity[] = []): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(〔[^〕]+〕|\[tr:[^\]]+\])/g;
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index!;
    if (start > last) out.push(<span key={key++}>{text.slice(last, start)}</span>);
    const tokenText = m[0];
    if (tokenText.startsWith('[tr:')) {
      out.push(
        <span key={key++} className="ml-1 inline-flex align-middle">
          <TraceChip traceId={tokenText.slice(4, -1)} />
        </span>,
      );
    } else {
      const ent = entities.find((e) => e.token === tokenText);
      const meta = MASK_TYPE_MAP[ent?.type ?? '氏名'];
      out.push(
        <span
          key={key++}
          className={`mx-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
          title={ent ? `${tokenText}（表示時に復元）` : tokenText}
        >
          <span aria-hidden>{meta.icon}</span>
          {ent ? ent.decryptedValue : tokenText}
        </span>,
      );
    }
    last = start + tokenText.length;
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return out;
}

export function MarkdownView({ markdown, entities = [], highlightLines }: Props) {
  const lines = markdown.split('\n');
  const blocks: ReactNode[] = [];
  let listBuf: { text: string; highlighted: boolean }[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key++} className="flex flex-col gap-1.5">
        {listBuf.map((item, i) => (
          <li
            key={i}
            className={`flex gap-2 text-sm leading-relaxed text-ink ${
              item.highlighted ? '-mx-1.5 rounded bg-accent-soft px-1.5 py-0.5' : ''
            }`}
          >
            <span aria-hidden className="shrink-0 text-ink-sub">•</span>
            <span className="min-w-0">
              {renderInline(item.text, entities)}
              {item.highlighted && (
                <span className="ml-1.5 inline-flex align-middle rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  今日の取込
                </span>
              )}
            </span>
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
      blocks.push(<h4 key={key++} className="mt-1 text-xs font-semibold text-ink-sub">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      blocks.push(<h3 key={key++} className="mt-2 text-sm font-semibold text-ink first:mt-0">◆ {line.slice(3)}</h3>);
    } else if (line.trim() !== '') {
      blocks.push(<p key={key++} className="text-sm leading-relaxed text-ink">{renderInline(line, entities)}</p>);
    }
  }
  flushList();

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
