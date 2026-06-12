import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InboxItem, MaskType } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { DEALS, type Deal } from '../data/deals';
import { findDealByCounterparty } from '../data/snapshots';
import { elapsedSince } from '../lib/time';
import { isMaskable } from '../lib/tokenize';
import { MASK_TYPES, MASK_TYPE_MAP } from '../lib/maskTypes';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 分かち書き済みの原文。トークンをタップして伏せる／チップを再タップして復元する。
 * 同一文字列の出現はすべて同じトークンに置き換わる。
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

  // 選択テキストと同じ文字列が出現する全トークン位置をハイライト対象とする。
  // 同一語は一括マスクされるので、他の出現箇所も薄くハイライトして示す。
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
    <div className="whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-sm leading-loose text-ink">
      {tokens.map((t, i) => {
        if (i <= skip) return null;

        const entry = maskAt.get(i);
        if (entry) {
          skip = entry.endIndex;
          const meta = MASK_TYPE_MAP[entry.mask.type];
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onUnmask(entry.mask.token, i)}
              title={interactive ? 'タップで復元' : undefined}
              className={`mx-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${meta.chipClass} ${interactive ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
            >
              <span aria-hidden>{meta.icon}</span>
              <span>{entry.mask.token}</span>
              <span className="opacity-50">({entry.mask.text})</span>
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
            className={`rounded px-0.5 transition-colors ${
              isPrimary
                ? 'bg-accent text-white'
                : isSecondary
                  ? 'bg-accent/20 text-ink'
                  : 'bg-surface hover:bg-accent/10'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/** タップした語の種別を選ぶバー。選択中だけ出る。 */
function MaskTypeBar({
  onPick,
  onCancel,
  canExtendPrev,
  canExtendNext,
  onExtendPrev,
  onExtendNext,
}: {
  onPick: (type: MaskType) => void;
  onCancel: () => void;
  canExtendPrev: boolean;
  canExtendNext: boolean;
  onExtendPrev: () => void;
  onExtendNext: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
      {canExtendPrev && (
        <button
          onClick={onExtendPrev}
          title="前の語と繋げる"
          className="inline-flex size-7 items-center justify-center rounded-full border border-line bg-white text-sm text-ink-sub transition-colors hover:border-accent hover:text-accent"
        >
          +
        </button>
      )}
      {MASK_TYPES.map((m) => (
        <button
          key={m.type}
          onClick={() => onPick(m.type)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${m.chipClass} hover:opacity-80`}
        >
          <span aria-hidden>{m.icon}</span>
          {m.label}
        </button>
      ))}
      {canExtendNext && (
        <button
          onClick={onExtendNext}
          title="次の語と繋げる"
          className="inline-flex size-7 items-center justify-center rounded-full border border-line bg-white text-sm text-ink-sub transition-colors hover:border-accent hover:text-accent"
        >
          +
        </button>
      )}
      <button
        onClick={onCancel}
        title="キャンセル"
        className="ml-1 inline-flex size-7 items-center justify-center rounded-full text-sm text-ink-sub transition-colors hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}

const TOP_N = 5;

function sortDealsByRecent(deals: Deal[]): Deal[] {
  const toNum = (d: string) => { const [m, day] = d.split('/').map(Number); return (m ?? 0) * 31 + (day ?? 0); };
  return [...deals].sort((a, b) => toNum(b.notes[0]?.date ?? '0/0') - toNum(a.notes[0]?.date ?? '0/0'));
}

function DealPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(() => sortDealsByRecent(DEALS), []);
  const top = sorted.slice(0, TOP_N);
  const more = sorted.slice(TOP_N);

  // 自動判定された案件が Top5 外の場合は先頭に追加して常に表示する。
  const detectedInMore = value ? more.find((d) => d.counterparty === value) : undefined;
  const displayTop = detectedInMore ? [detectedInMore, ...top] : top;
  const displayMore = detectedInMore ? more.filter((d) => d.counterparty !== value) : more;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {displayTop.map((d) => (
          <DealButton key={d.counterparty} deal={d} selected={value === d.counterparty} onSelect={onChange} />
        ))}
        {expanded && displayMore.map((d) => (
          <DealButton key={d.counterparty} deal={d} selected={value === d.counterparty} onSelect={onChange} />
        ))}
      </div>
      {displayMore.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-ink-sub hover:text-accent"
        >
          {expanded ? '▲ 閉じる' : `▼ もっと見る（${displayMore.length}件）`}
        </button>
      )}
    </div>
  );
}

function DealButton({ deal, selected, onSelect }: { deal: Deal; selected: boolean; onSelect: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? '' : deal.counterparty)}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-white text-ink hover:border-accent/50 hover:bg-surface'
      }`}
    >
      {deal.counterparty}
    </button>
  );
}

/**
 * 受信箱の詳細。状態によって役割が変わる:
 *   要確認   : 目視確認（マスク補正・案件選択）→「確認してAIに渡す」
 *   処理済み : 目視確認→AI解析→Wiki取込の記録の確認（読み取り専用・監査ログ）
 */
export function InboxDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const item = store.getInboxItem(id);

  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [showMaskHelp, setShowMaskHelp] = useState(false);
  const [showHandOffConfirm, setShowHandOffConfirm] = useState(false);
  const [showMemo, setShowMemo] = useState(false);

  if (!item) {
    return (
      <div className="py-20 text-center text-ink-sub">
        アイテムが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/inbox')}>
            受信箱へ戻る
          </Button>
        </div>
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

  return (
    <div>
      <button
        onClick={() => navigate('/inbox')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ 受信箱へ戻る
      </button>

      <div className="overflow-hidden bg-white">
        {/* ヘッダー */}
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-xl" aria-hidden>{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-ink">{item.title}</h1>
                {reviewing && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">
                    🛡️ 目視確認待ち
                  </span>
                )}
                {processed && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                    ✔ 確認・処理済み
                  </span>
                )}
                {reviewing && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMaskHelp((v) => !v)}
                      className="inline-flex size-5 items-center justify-center rounded-full border border-line bg-white text-xs text-ink-sub/70 hover:text-ink-sub"
                      aria-label="マスキングの操作方法を表示"
                      aria-expanded={showMaskHelp}
                    >
                      i
                    </button>
                    {showMaskHelp && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowMaskHelp(false)} aria-hidden />
                        <div className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-line bg-white p-3 shadow-md">
                          <p className="text-sm text-ink-sub">語をタップして伏せる／チップをタップで1件復元</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-sub">
                {item.source === 'mail' && (
                  <>
                    <span>From: {item.sender}</span>
                    {item.mailTo && <><span aria-hidden>/</span><span>To: {item.mailTo}</span></>}
                  </>
                )}
                {item.source === 'slack' && item.sender && <span>{item.sender}</span>}
                {item.counterparty && (
                  <><span aria-hidden>·</span><span className="font-semibold text-ink">{item.counterparty}</span></>
                )}
              </p>
            </div>
            {/* 時刻（タイトル右・マスト表示）*/}
            <span className="shrink-0 tabular-nums text-sm font-semibold text-ink">
              {elapsed}前
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          {/* 要確認: ロジックの警告 or 確認の案内 */}
          {reviewing && (
            (item.attention ?? []).length > 0 ? (
              <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-warn">目視確認のポイント</p>
                <ul className="space-y-1">
                  {(item.attention ?? []).map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-warn">
                      <span aria-hidden className="shrink-0">⚠</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-good/30 bg-good/5 px-4 py-3 text-sm text-ink">
                <span aria-hidden className="shrink-0">✓</span>
                <p>
                  自動マスク {item.masks.length}件・案件判定済み。機密情報が残っていないか目視で確認し、問題なければAIに渡してください。
                </p>
              </div>
            )
          )}

          {/* 処理済み: 目視確認→AI解析→Wiki取込の記録（監査ログ） */}
          {processed && (
            <div className="flex items-start gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">
              <span aria-hidden className="shrink-0">🛡️</span>
              <div className="min-w-0 flex-1">
                <p>
                  {item.processedAt && <span className="tabular-nums">{formatDateTime(item.processedAt)} </span>}
                  <span className="font-medium">{item.verifiedBy ?? '担当者'}</span> が目視確認
                  （マスク {item.masks.length}件）→ AI解析 → {item.analysisNote ?? 'Wiki更新なし'}。
                </p>
                {dealId && (
                  <button
                    onClick={() => navigate(`/wiki/${dealId}`)}
                    className="mt-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    商談Wikiを開く ❯
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 原文（レビュー中のみタップでマスキング可能） */}
          <section>
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
                <MaskTypeBar
                  onPick={(type) => {
                    store.maskInboxToken(item.id, text, type, selectedRange.start);
                    setSelectedRange(null);
                  }}
                  onCancel={() => setSelectedRange(null)}
                  canExtendPrev={selectedRange.start > 0}
                  canExtendNext={selectedRange.end < tokens.length - 1}
                  onExtendPrev={() => setSelectedRange((s) => s ? { ...s, start: s.start - 1 } : s)}
                  onExtendNext={() => setSelectedRange((s) => s ? { ...s, end: s.end + 1 } : s)}
                />
              );
            })()}
          </section>

          {/* メモ（トグル） */}
          <section>
            <button
              onClick={() => setShowMemo((v) => { if (!v && item.memo) return true; return !v; })}
              className="flex items-center gap-1.5 text-sm text-ink-sub hover:text-ink"
              aria-expanded={showMemo || !!item.memo}
            >
              <span aria-hidden className={`text-[10px] transition-transform ${showMemo || item.memo ? 'rotate-90' : ''}`}>❯</span>
              メモ
              {item.memo && <span className="text-xs text-ink-sub/60">📝 あり</span>}
            </button>
            {(showMemo || !!item.memo) && (
              <textarea
                value={item.memo ?? ''}
                onChange={(e) => store.setInboxMemo(item.id, e.target.value)}
                onFocus={() => setShowMemo(true)}
                placeholder="メモを入力..."
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-accent"
              />
            )}
          </section>

          {/* プロジェクト（レビュー中は選択可能） */}
          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="text-sm font-medium text-ink">プロジェクト</h2>
            </div>
            {reviewing ? (
              <DealPicker
                value={item.counterparty}
                onChange={(v) => store.setInboxCounterparty(item.id, v)}
              />
            ) : (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
                🏢 {item.counterparty || '—'}
              </div>
            )}
          </section>
        </div>

        {/* フッター: 状態に応じた操作 */}
        <div className="border-t border-line bg-surface p-4 sm:p-5">
          {processed ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-good">
                ✔ 取込済み — {item.analysisNote ?? 'Wiki更新なし'}
              </span>
              {dealId && (
                <Button
                  variant="primary"
                  className="ml-auto"
                  onClick={() => navigate(`/wiki/${dealId}`)}
                >
                  商談Wikiで開く ▶
                </Button>
              )}
            </div>
          ) : reviewing ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => store.archiveInboxItem(item.id)}
                className="text-sm font-medium text-ink-sub hover:text-ink"
              >
                AIに渡さない（アーカイブ）
              </button>
              <Button
                variant={item.counterparty && unresolvedSensitive.length === 0 ? 'primary' : 'warning'}
                disabled={store.analysisRunning}
                onClick={() =>
                  item.counterparty && unresolvedSensitive.length === 0
                    ? store.handOffToAi(item.id)
                    : setShowHandOffConfirm(true)
                }
              >
                {store.analysisRunning ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                    解析中…
                  </span>
                ) : (
                  '確認してAIに渡す ▶'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-sub">アーカイブ済み（AIに渡していません）</span>
              <Button variant="secondary" className="ml-auto" onClick={() => store.unarchiveInboxItem(item.id)}>
                要確認に戻す
              </Button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showHandOffConfirm}
        title={
          !item.counterparty
            ? 'プロジェクトが未選択ですが、確認済みとしてAIに渡しますか？'
            : `未マスクの疑い（「${unresolvedSensitive.join('」「')}」）が残っています。マスクせずにAIに渡しますか？`
        }
        confirmLabel="このままAIに渡す"
        onConfirm={() => { store.handOffToAi(item.id); setShowHandOffConfirm(false); }}
        onCancel={() => setShowHandOffConfirm(false)}
      />
    </div>
  );
}
