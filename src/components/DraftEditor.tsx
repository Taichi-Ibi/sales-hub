import { useMemo } from 'react';
import type { MaskedEntity, MaskType } from '../types';

const TOKEN_RE = /〔[^〕]+〕/g;

const CHIP_CLASS: Record<MaskType, string> = {
  人物: 'bg-accent/10 text-accent',
  NDA: 'bg-[#ede9fe] text-[#6d28d9]',
};

interface Segment {
  kind: 'text' | 'chip';
  value: string;
  type?: MaskType;
}

function parse(draft: string, entities: MaskedEntity[]): Segment[] {
  const typeByToken = new Map(entities.map((e) => [e.token, e.type] as const));
  const segments: Segment[] = [];
  let last = 0;
  for (const m of draft.matchAll(TOKEN_RE)) {
    const start = m.index!;
    if (start > last) segments.push({ kind: 'text', value: draft.slice(last, start) });
    segments.push({ kind: 'chip', value: m[0], type: typeByToken.get(m[0]) ?? '人物' });
    last = start + m[0].length;
  }
  if (last < draft.length) segments.push({ kind: 'text', value: draft.slice(last) });
  return segments;
}

interface Props {
  draft: string;
  /** 下書きが外部（マスキング操作）で変わるたびに増やす。エディタを再マウントして反映する。 */
  version: number;
  entities: MaskedEntity[];
  readOnly?: boolean;
  onCommit: (text: string) => void;
  onChipClick: () => void;
}

/**
 * 下書き（§7 S2）。本文は編集可能で、伏せ字トークンは色付きチップとして埋め込む。
 * チップは contentEditable=false の塊。クリックで S3 を開く。
 * チップの表示文字は token 文字列そのものなので、blur 時の textContent から
 * トークン込みの下書き文字列を復元できる。
 */
export function DraftEditor({ draft, version, entities, readOnly, onCommit, onChipClick }: Props) {
  const segments = useMemo(() => parse(draft, entities), [draft, entities]);

  return (
    <div
      key={version}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="下書き本文"
      tabIndex={0}
      onBlur={(e) => {
        if (!readOnly) onCommit(e.currentTarget.textContent ?? '');
      }}
      className={`min-h-40 w-full whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-sm leading-relaxed text-ink focus:outline-none ${
        readOnly ? 'bg-surface' : ''
      }`}
    >
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <span
            key={i}
            contentEditable={false}
            onClick={onChipClick}
            className={`mx-0.5 cursor-pointer rounded px-1 py-0.5 text-xs font-medium ${CHIP_CLASS[seg.type ?? '人物']}`}
            title="マスクを管理"
          >
            {seg.value}
          </span>
        ),
      )}
    </div>
  );
}
