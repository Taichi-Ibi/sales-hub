import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InboxItem, MaskType } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { DEALS } from '../data/deals';
import { findDealByCounterparty } from '../data/snapshots';
import { elapsedSince } from '../lib/time';
import { isMaskable } from '../lib/tokenize';
import { MASK_TYPES } from '../lib/maskTypes';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 分かち書き済みの原文。トークンをタップして伏せる／マスクをタップして復元する。
 * 同一文字列の出現はすべて同じトークンに置き換わる。装飾は最小限
 * （マスク済み＝点線下線の〔トークン〕、選択中＝薄い背景）。
 */
function TokenizedBody({
  item,
  interactive,
  selectedRange,
  onSelect,
  onUnmask,
}: {
  item: InboxItem;
  interactive: boolean;
  selectedRange: { start: number; end: number } | null;
  onSelect: (index: number | null) => void;
  onUnmask: (token: string, atIndex: number) => void;
}) {
  const tokens = item.tokens!;

  // 各マスクのテキストをトークン列の中で探し、開始インデックス→{マスク,終了インデックス} を構築。
  // 複数トークンを連結したマスクにも対応。
  // 長いマスクを優先して評価（「川島 紗英」が「川島」より先に位置を確保する）。
  // occupied で占有済み位置を追跡し、短いマスクが同じ位置を上書きするのを防ぐ。
  const maskAt = new Map<number, { mask: (typeof item.masks)[number]; endIndex: number }>();
  const occupied = new Set<number>();
  const byLength = [...item.masks].sort((a, b) => b.text.length - a.text.length);
  for (const mask of byLength) {
    const excluded = new Set(mask.excludedIndices ?? []);
    for (let i = 0; i < tokens.length; i++) {
      if (excluded.has(i) || occupied.has(i)) continue;
      let built = '';
      for (let j = i; j < tokens.length; j++) {
        if (occupied.has(j) && j > i) break; // span 途中に既占有があれば中断
        built += tokens[j];
        if (built === mask.text) {
          maskAt.set(i, { mask, endIndex: j });
          for (let k = i; k <= j; k++) occupied.add(k);
          break;
        }
        if (built.length > mask.text.length) break;
      }
    }
  }

  // 選択テキストと同じ文字列の出現位置（同一語は一括マスクされるため薄く示す）。
  const highlightedIndices = new Set<number>();
  if (selectedRange) {
    const selText = tokens.slice(selectedRange.start, selectedRange.end + 1).join('');
    for (let i = 0; i < tokens.length; i++) {
      let built = '';
      for (let j = i; j < tokens.length; j++) {
        built += tokens[j];
        if (built === selText) { for (let k = i; k <= j; k++) highlightedIndices.add(k); break; }
        if (built.length > selText.length) break;
      }
    }
  }

  let skip = -1;
  return (
    <div className="whitespace-pre-wrap border border-line bg-surface p-3 leading-loose">
      {tokens.map((t, i) => {
        if (i <= skip) return null;

        const entry = maskAt.get(i);
        if (entry) {
          skip = entry.endIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onUnmask(entry.mask.token, i)}
              title={interactive ? 'クリックで復元' : undefined}
              className="cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit underline decoration-dotted decoration-line disabled:cursor-default"
            >
              {entry.mask.token}
              <span className="text-ink-sub">({entry.mask.text})</span>
            </button>
          );
        }

        if (!interactive || !isMaskable(t)) return <span key={i}>{t}</span>;
        const isPrimary = !!selectedRange && i >= selectedRange.start && i <= selectedRange.end;
        const isSecondary = !isPrimary && highlightedIndices.has(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isPrimary ? null : i)}
            className={`cursor-pointer border-0 p-0 font-inherit text-inherit ${
              isPrimary ? 'bg-accent text-white' : isSecondary ? 'bg-line-light' : 'bg-transparent hover:bg-line-light'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 痕跡の査読ページ。状態によって役割が変わる:
 *   要確認   : 査読（マスク補正・記事の選択）→「確認してAIに渡す」
 *   処理済み : 査読→AI解析→Wiki反映の記録の確認（読み取り専用・監査記録）
 */
export function InboxDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const item = store.getInboxItem(id);

  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

  if (!item) {
    return (
      <div>
        <h1 className="wiki-h1">アイテムが見つかりません</h1>
        <p>
          <a onClick={() => navigate('/inbox')}>特別:受信箱へ戻る</a>
        </p>
      </div>
    );
  }

  const meta = SOURCE_META[item.source];
  const { label: elapsed } = elapsedSince(item.receivedAt);
  const reviewing = item.status === '要確認';
  const processed = item.status === '処理済み';
  // 未マスクの疑い（knownSensitive のうちまだマスクされていない語）が残っているか。
  const unresolvedSensitive = item.knownSensitive.filter(
    (s) => item.body.includes(s) && !item.masks.some((m) => m.text === s),
  );
  const dealId = findDealByCounterparty(item.counterparty)?.id;

  const handOff = () => {
    if (!item.counterparty || unresolvedSensitive.length > 0) {
      const message = !item.counterparty
        ? '記事（案件）が未選択ですが、確認済みとしてAIに渡しますか？'
        : `未マスクの疑い（「${unresolvedSensitive.join('」「')}」）が残っています。マスクせずにAIに渡しますか？`;
      if (!window.confirm(message)) return;
    }
    store.handOffToAi(item.id);
  };

  return (
    <div>
      <p className="text-xs text-ink-sub">
        &lt; <a onClick={() => navigate('/inbox')}>特別:受信箱</a>
      </p>
      <h1 className="wiki-h1">{item.title}</h1>
      <p className="text-xs text-ink-sub">
        {meta.label}
        {item.source === 'mail' && `　·　From: ${item.sender}${item.mailTo ? `　·　To: ${item.mailTo}` : ''}`}
        {item.source === 'slack' && item.sender && `　·　${item.sender}`}
        {item.counterparty && `　·　記事: ${item.counterparty}`}
        　·　{elapsed}前
        　·　状態: {item.status}
      </p>

      {/* 状態の告知（ambox） */}
      {reviewing &&
        ((item.attention ?? []).length > 0 ? (
          (item.attention ?? []).map((r, i) => (
            <div key={i} className="ambox ambox-warning">⚠ {r}</div>
          ))
        ) : (
          <div className="ambox ambox-success">✓ 自動マスク {item.masks.length}件・記事判定済み</div>
        ))}
      {processed && (
        <div className="ambox ambox-success">
          ✓ {item.processedAt && `${formatDateTime(item.processedAt)} `}
          <b>{item.verifiedBy ?? '担当者'}</b> が査読（マスク {item.masks.length}件）→ AI解析 →{' '}
          {item.analysisNote ?? 'Wiki更新なし'}。
          {dealId && (
            <>
              {' '}
              <a onClick={() => navigate(`/wiki/${dealId}`)}>記事を開く</a>
            </>
          )}
        </div>
      )}
      {item.status === 'アーカイブ' && (
        <div className="ambox">
          アーカイブ済み（AIに渡していません）。{' '}
          <a onClick={() => store.unarchiveInboxItem(item.id)}>査読待ちに戻す</a>
        </div>
      )}

      <h2 className="wiki-h2">原文</h2>
      {reviewing && (
        <p className="my-1 text-xs text-ink-sub">語をクリックして伏せる／〔トークン〕をクリックで復元。</p>
      )}
      <TokenizedBody
        item={item}
        interactive={reviewing}
        selectedRange={selectedRange}
        onSelect={(i) => setSelectedRange(i === null ? null : { start: i, end: i })}
        onUnmask={(token, atIndex) => store.unmaskInboxToken(item.id, token, atIndex)}
      />
      {reviewing && selectedRange && (() => {
        const tokens = item.tokens!;
        const text = tokens.slice(selectedRange.start, selectedRange.end + 1).join('');
        return (
          <p className="my-1 text-[13px]">
            「{text}」を伏せる:{' '}
            {MASK_TYPES.map((m, i) => (
              <span key={m.type}>
                {i > 0 && ' | '}
                <a
                  onClick={() => {
                    store.maskInboxToken(item.id, text, m.type as MaskType, selectedRange.start);
                    setSelectedRange(null);
                  }}
                >
                  {m.label}
                </a>
              </span>
            ))}
            {selectedRange.start > 0 && (
              <>
                {' '}
                | <a onClick={() => setSelectedRange((s) => (s ? { ...s, start: s.start - 1 } : s))}>←前の語と繋げる</a>
              </>
            )}
            {selectedRange.end < tokens.length - 1 && (
              <>
                {' '}
                | <a onClick={() => setSelectedRange((s) => (s ? { ...s, end: s.end + 1 } : s))}>次の語と繋げる→</a>
              </>
            )}
            {' '}| <a onClick={() => setSelectedRange(null)}>取消</a>
          </p>
        );
      })()}

      <h2 className="wiki-h2">記事（案件）</h2>
      {reviewing ? (
        <p className="text-[13px]">
          {DEALS.map((d, i) => (
            <span key={d.counterparty}>
              {i > 0 && ' | '}
              {item.counterparty === d.counterparty ? (
                <b>
                  {d.counterparty}（<a onClick={() => store.setInboxCounterparty(item.id, '')}>解除</a>）
                </b>
              ) : (
                <a onClick={() => store.setInboxCounterparty(item.id, d.counterparty)}>{d.counterparty}</a>
              )}
            </span>
          ))}
        </p>
      ) : (
        <p className="text-[13px]">{item.counterparty || '—'}</p>
      )}

      <h2 className="wiki-h2">メモ</h2>
      <textarea
        value={item.memo ?? ''}
        onChange={(e) => store.setInboxMemo(item.id, e.target.value)}
        placeholder="メモを入力..."
        rows={2}
        className="w-full resize-none border border-line bg-page p-2 text-sm"
      />

      {/* フッター操作 */}
      {reviewing && (
        <p className="mt-4 border-t border-line-light pt-3">
          <button className="btn-primary btn" disabled={store.analysisRunning} onClick={handOff}>
            {store.analysisRunning ? '解析中…' : '確認してAIに渡す'}
          </button>
          <a className="ml-4 text-[13px]" onClick={() => store.archiveInboxItem(item.id)}>
            AIに渡さない（アーカイブ）
          </a>
        </p>
      )}
    </div>
  );
}
