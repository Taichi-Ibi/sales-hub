import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InboxItem, MaskType } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { DEALS, type Deal } from '../data/deals';
import { elapsedSince } from '../lib/time';
import { isMaskable } from '../lib/tokenize';
import { MASK_TYPES, MASK_TYPE_MAP } from '../lib/maskTypes';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const EVENT_TYPE_ICON: Record<NonNullable<InboxItem['eventType']>, string> = {
  商談: '💼',
  会食: '🍽',
  移動: '🚅',
  社内MTG: '🏢',
  その他: '📌',
};

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

  // ドメイン判定された案件が Top5 外の場合は先頭に追加して常に表示する。
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

export function InboxDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const item = store.getInboxItem(id);

  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [showMaskHelp, setShowMaskHelp] = useState(false);
  const [showAiReadyConfirm, setShowAiReadyConfirm] = useState(false);
  const [showMemo, setShowMemo] = useState(false);

  // 未処理の原文を開いたら分かち書きを実行（シミュレート。約1秒）。
  const needsTokenize = !!item && !item.tokens;
  useEffect(() => {
    if (!needsTokenize) return;
    const t = window.setTimeout(() => store.finishTokenize(id), 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, needsTokenize]);

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
  const done = item.status === 'タスクあり';
  const masking = item.status === 'マスキング中' && !item.aiReady;
  const aiReadyComplete = item.masks.length > 0 && !!item.counterparty;

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
          {/* タイトル行: [ソースアイコン] [タイトル] [badges] + 時刻右寄せ */}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-xl" aria-hidden>{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-ink">{item.title}</h1>
                {masking && (
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
                {item.aiReady && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    ✨ AI Ready
                  </span>
                )}
              </div>
              {/* タイトル下のメタ情報（受信箱と同じ） */}
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-sub">
                {item.eventType && <span>{EVENT_TYPE_ICON[item.eventType]} {item.eventType}</span>}
                {item.eventAt && <span className="tabular-nums text-ink-sub/60">{elapsed}前</span>}
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
              {(!!item.participants?.length || item.location) && (
                <p className="mt-0.5 truncate text-xs text-ink-sub/70">
                  {!!item.participants?.length && <span>👥 {item.participants.join('、')}</span>}
                  {!!item.participants?.length && item.location && <span aria-hidden>　</span>}
                  {item.location && <span>📍 {item.location}</span>}
                </p>
              )}
            </div>
            {/* 時刻（タイトル右・マスト表示）*/}
            <span className="shrink-0 tabular-nums text-sm font-semibold text-ink">
              {item.eventAt
                ? `${formatEventTime(item.eventAt)}${item.eventEnd ? `–${formatEventTime(item.eventEnd).split(' ')[1]}` : ''}`
                : elapsed + '前'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          {/* 原文 */}
          <section>
            {!item.tokens ? (
              // 分かち書き中（CPU実行のシミュレート）
              <div className="relative">
                <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-sm leading-loose text-ink-sub/60">
                  {item.body}
                </div>
                <div className="absolute inset-0 grid place-items-center rounded-lg bg-white/70">
                  <p className="text-sm font-medium text-ink-sub">ロード中…</p>
                </div>
              </div>
            ) : (
              <>
                <TokenizedBody
                  item={item}
                  interactive={masking}
                  selectedRange={selectedRange}
                  onSelect={(i) => setSelectedRange(i === null ? null : { start: i, end: i })}
                  onUnmask={(token, atIndex) => store.unmaskInboxToken(item.id, token, atIndex)}
                />
                {masking && selectedRange && (() => {
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
              </>
            )}
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

          {/* 案件選択: 分かち書き完了後・タスク化前に表示 */}
          {item.tokens && !done && (
            <section>
              <div className="mb-1.5 flex items-center gap-2">
                <h2 className="text-sm font-medium text-ink">プロジェクト</h2>
              </div>
              {item.aiReady ? (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
                  🏢 {item.counterparty}
                </div>
              ) : (
                <>
                  <DealPicker
                    value={item.counterparty}
                    onChange={(v) => store.setInboxCounterparty(item.id, v)}
                  />
                </>
              )}
            </section>
          )}

        </div>

        {/* フッター: 工程に応じた操作 */}
        <div className="border-t border-line bg-surface p-4 sm:p-5">
          {done ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-good">
                ✔ タスクあり — 台帳に追加されています
              </span>
              {item.resultActionId && (
                <Button
                  variant="primary"
                  className="ml-auto"
                  onClick={() =>
                    navigate(`/action/${item.resultActionId}`, { state: { from: '/inbox' } })
                  }
                >
                  タスクで開く ▶
                </Button>
              )}
            </div>
          ) : item.aiReady ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-accent">✨ AI Ready — 解析キューに追加済み</span>
              <Button
                variant="primary"
                disabled={store.analysisRunning}
                onClick={() => store.runSingleAnalysis(item.id)}
              >
                {store.analysisRunning ? '解析中…' : '今すぐ解析'}
              </Button>
            </div>
          ) : item.tokens ? (
            <div className="flex items-center justify-end">
              <Button
                variant={aiReadyComplete ? 'primary' : 'warning'}
                onClick={() => aiReadyComplete ? store.markAiReady(item.id) : setShowAiReadyConfirm(true)}
              >
                AI Ready
              </Button>
            </div>
          ) : (
            <p className="text-xs text-ink-sub">読み込み中…</p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showAiReadyConfirm}
        title={
          !item.counterparty && item.masks.length === 0
            ? 'プロジェクトとマスキングが未設定ですが、AI Ready にしますか？'
            : !item.counterparty
              ? 'プロジェクトが未設定ですが、AI Ready にしますか？'
              : 'マスキングがありませんが、AI Ready にしますか？'
        }
        confirmLabel="AI Ready にする"
        onConfirm={() => { store.markAiReady(item.id); setShowAiReadyConfirm(false); }}
        onCancel={() => setShowAiReadyConfirm(false)}
      />
    </div>
  );
}
