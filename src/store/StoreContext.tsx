import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { InboxItem, MaskType, RelayLogEntry } from '../types';
import type { WikiUpdate } from '../data/wiki';
import type { SnapshotMeta } from '../data/snapshots';
import type { DealAdvice, RelayDraft } from '../data/advice';
import { SEED_ADVICE, RUNTIME_ADVICE } from '../data/advice';
import { SEED_INBOX, SOURCE_META } from '../data/inbox';
import { findDealByCounterparty, findDealEntry } from '../data/snapshots';
import { TRACES } from '../data/traces';
import { tokenize } from '../lib/tokenize';

// 実行時に発生するイベントの時刻表現（モックでは NOW 固定。lib/time.ts の NOW に合わせる）。
const NOW_ISO = '2026-06-10T10:00:00';
const NOW_SHORT = '6/10 10:00';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function circled(n: number): string {
  return CIRCLED[n - 1] ?? `(${n})`;
}

export interface Toast {
  id: number;
  message: string;
  /** 助言が生成された場合、トーストから遷移できる。 */
  adviceId?: string;
  adviceTitle?: string;
}

/** 当日スナップショットへの実行時パッチ（取込で本文行・frontmatter が動く）。 */
export interface SnapshotPatch {
  addedLines: string[]; // 「現在の状況」に追記される行（[tr:xxx] つき）
  meta?: Partial<Pick<SnapshotMeta, 'confidence' | 'expected_close' | 'phase' | 'amount'>>;
}

interface StoreValue {
  inboxItems: InboxItem[];
  toasts: Toast[];
  analysisRunning: boolean;
  /** 実行時に wiki ページへ追記された更新履歴（dealId → 更新リスト）。 */
  wikiAppends: Record<string, WikiUpdate[]>;
  /** 実行時の当日スナップショットへのパッチ（dealId → パッチ）。 */
  snapshotPatches: Record<string, SnapshotPatch>;
  /** 助言: 6:00生成のシード＋取込で生成された実行時助言（優先度順は表示側で）。 */
  allAdvice: DealAdvice[];
  adviceReadIds: ReadonlySet<string>;
  markAdviceRead: (id: string) => void;
  /** ④伝達ログ。コピーは人の明示的な操作で、操作のたびに記録される。 */
  relayLogs: RelayLogEntry[];
  copyRelay: (advice: DealAdvice, draft: RelayDraft) => void;
  dismissToast: (id: number) => void;
  // 受信箱（マスキング目視ゲート）。
  // 機密情報がないことを保証できるのは人間のみ。ロジックの自動マスクは補助で、
  // すべてのアイテムは人が目視確認・マスク補正・案件選択をしてからAIに渡す（handOffToAi）。
  getInboxItem: (id: string) => InboxItem | undefined;
  maskInboxToken: (id: string, text: string, type: MaskType, atIndex?: number) => void;
  unmaskInboxToken: (id: string, token: string, atIndex: number) => void;
  setInboxCounterparty: (id: string, counterparty: string) => void;
  handOffToAi: (id: string) => void; // 目視確認してAIに渡す → 解析（シミュレート）→ Wiki取込・助言生成
  archiveInboxItem: (id: string) => void; // AIに渡さない
  unarchiveInboxItem: (id: string) => void;
  setInboxMemo: (id: string, memo: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() =>
    SEED_INBOX.map((i) => ({
      ...i,
      // 分かち書きは受信時に自動実行済みという建て付け（初期化時に付与）。
      tokens: i.tokens ?? tokenize(i.body),
      masks: i.masks.map((m) => ({ ...m })),
      knownSensitive: [...i.knownSensitive],
      ingest: { ...i.ingest, wikiLines: [...i.ingest.wikiLines] },
    })),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [wikiAppends, setWikiAppends] = useState<Record<string, WikiUpdate[]>>({});
  const [snapshotPatches, setSnapshotPatches] = useState<Record<string, SnapshotPatch>>({});
  const [runtimeAdvice, setRuntimeAdvice] = useState<DealAdvice[]>([]);
  const [adviceReadIds, setAdviceReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [relayLogs, setRelayLogs] = useState<RelayLogEntry[]>([]);

  const patchInbox = useCallback((id: string, fn: (i: InboxItem) => InboxItem) => {
    setInboxItems((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));
  }, []);

  const addToast = useCallback((message: string, extra?: { adviceId?: string; adviceTitle?: string }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, ...extra }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ───────── 受信箱（マスキング目視ゲート） ─────────

  const getInboxItem = useCallback(
    (id: string) => inboxItems.find((i) => i.id === id),
    [inboxItems],
  );

  // タップされたトークン文字列を伏せる。同一文字列の出現はすべて同じトークンになる。
  // atIndex が指定された場合: 既存マスクのその位置の除外を解除して再マスクする（復元後の再マスク用）。
  const maskInboxToken = useCallback(
    (id: string, text: string, type: MaskType, atIndex?: number) => {
      patchInbox(id, (i) => {
        const existing = i.masks.find((m) => m.text === text);
        if (existing) {
          if (atIndex !== undefined && (existing.excludedIndices ?? []).includes(atIndex)) {
            return {
              ...i,
              masks: i.masks.map((m) =>
                m.text === text
                  ? { ...m, excludedIndices: (m.excludedIndices ?? []).filter((ex) => ex !== atIndex) }
                  : m,
              ),
            };
          }
          return i;
        }
        const n = i.masks.filter((m) => m.type === type).length + 1;
        const token = `〔${type}${circled(n)}〕`;
        return { ...i, masks: [...i.masks, { text, type, token, excludedIndices: [] }] };
      });
    },
    [patchInbox],
  );

  // 指定位置の出現のみ復元（excludedIndices に追加）。
  const unmaskInboxToken = useCallback(
    (id: string, token: string, atIndex: number) => {
      patchInbox(id, (i) => ({
        ...i,
        masks: i.masks.map((m) =>
          m.token === token
            ? { ...m, excludedIndices: [...(m.excludedIndices ?? []), atIndex] }
            : m,
        ),
      }));
    },
    [patchInbox],
  );

  // 案件名を設定する（警告「案件不明」の解決）。
  const setInboxCounterparty = useCallback(
    (id: string, counterparty: string) => {
      patchInbox(id, (i) => ({ ...i, counterparty }));
    },
    [patchInbox],
  );

  // 単体の取込ロジック（内部用）。目視確認済みの痕跡を商談Wikiへ反映し、
  // スナップショット差分から新しい助言が生成される（モックではシードを投入）。
  const ingestOne = useCallback(
    (id: string, items: InboxItem[]) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.status === '処理済み') return;
      const seed = item.ingest;
      const dealId = seed.dealId || findDealByCounterparty(item.counterparty)?.id || '';
      const sourceLabel = SOURCE_META[item.source].label;

      // マスクトークンの適用（AIにはマスク済みのまま渡る建て付け）。
      const applyMasks = (text: string) =>
        item.masks.reduce((acc, m) => acc.split(m.text).join(m.token), text);

      // 取込で生成される助言（RUNTIME_ADVICE のシード）。
      const adviceSeed = seed.adviceId ? RUNTIME_ADVICE[seed.adviceId] : undefined;
      const advice: DealAdvice | undefined = adviceSeed
        ? { ...adviceSeed, dealId: adviceSeed.dealId || dealId, generatedAt: NOW_SHORT }
        : undefined;

      const hasWikiUpdate = dealId !== '' && (seed.wikiLines.length > 0 || !!advice);

      patchInbox(id, (i) => ({
        ...i,
        status: '処理済み',
        processedAt: NOW_ISO,
        verifiedBy: '山田 内勤',
        analysisNote:
          seed.analysisNote ??
          (advice ? 'Wiki更新 → 助言生成' : hasWikiUpdate ? 'Wiki更新' : 'Wiki更新なし'),
        attention: undefined,
      }));

      if (hasWikiUpdate) {
        // この痕跡の trace id（根拠リンク用）。
        const trace = TRACES.find((t) => t.inboxItemId === item.id);
        const lines = seed.wikiLines.map(
          (line) => `${applyMasks(line)}${trace ? ` [tr:${trace.id}]` : ''}`,
        );
        // ヨミ3点の実行時変化は助言の facts に合わせる（モックでは固定値）。
        const metaPatch: SnapshotPatch['meta'] =
          seed.adviceId === 'in02' ? { confidence: 40, expected_close: '2026-06-30' } :
          seed.adviceId === 'in10' ? { expected_close: '2026-06-11' } :
          undefined;
        setSnapshotPatches((prev) => {
          const cur = prev[dealId] ?? { addedLines: [] };
          return {
            ...prev,
            [dealId]: {
              addedLines: [...cur.addedLines, ...lines],
              meta: { ...cur.meta, ...metaPatch },
            },
          };
        });
        setWikiAppends((prev) => ({
          ...prev,
          [dealId]: [
            {
              at: NOW_SHORT,
              kind: '取込',
              summary: `${sourceLabel}「${item.title}」を取込${advice ? `（助言「${advice.title}」を生成）` : ''}`,
              source: { label: item.title, inboxItemId: item.id },
            },
            ...(prev[dealId] ?? []),
          ],
        }));
      }

      if (advice) {
        setRuntimeAdvice((prev) =>
          prev.some((a) => a.id === advice.id) ? prev : [advice, ...prev],
        );
        addToast('Wikiを更新し、新しい助言が出ました', { adviceId: advice.id, adviceTitle: advice.title });
      } else if (hasWikiUpdate) {
        addToast('Wikiを更新しました');
      } else {
        addToast(`解析完了（${seed.analysisNote ?? 'Wiki更新なし'}）`);
      }
    },
    [patchInbox, addToast],
  );

  // 目視確認の完了: 人がマスクを確認したアイテムをAIに渡す（解析シミュレート 1.5秒）。
  const handOffToAi = useCallback(
    (id: string) => {
      const target = inboxItems.find((i) => i.id === id);
      if (!target || target.status === '処理済み') return;
      setAnalysisRunning(true);
      window.setTimeout(() => {
        ingestOne(id, inboxItems);
        setAnalysisRunning(false);
      }, 1500);
    },
    [inboxItems, ingestOne],
  );

  const archiveInboxItem = useCallback(
    (id: string) => {
      patchInbox(id, (i) => ({ ...i, status: 'アーカイブ' }));
    },
    [patchInbox],
  );

  const unarchiveInboxItem = useCallback(
    (id: string) => {
      patchInbox(id, (i) => ({ ...i, status: '要確認' }));
    },
    [patchInbox],
  );

  const setInboxMemo = useCallback(
    (id: string, memo: string) => {
      patchInbox(id, (i) => ({ ...i, memo }));
    },
    [patchInbox],
  );

  // ───────── ③助言 / ④対話と伝達 ─────────

  const allAdvice = useMemo(() => [...runtimeAdvice, ...SEED_ADVICE], [runtimeAdvice]);

  const markAdviceRead = useCallback((id: string) => {
    setAdviceReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // 伝達のコピー（④）。AIから関係者への自動送信はせず、必ず人のこの操作を経由する。
  // コピーした内容は relay ログに記録され、将来①の入力として還流する想定（traces 互換id）。
  const copyRelay = useCallback(
    (advice: DealAdvice, draft: RelayDraft) => {
      // クリップボードへはマスクを復元した本文を渡す（表示層の復元と同じ建て付け）。
      const entities = findDealEntry(advice.dealId)?.entities ?? [];
      const restored = entities.reduce(
        (acc, e) => acc.split(e.token).join(e.decryptedValue),
        `${draft.subject}\n\n${draft.body}`,
      );
      const writeFallback = () => {
        const ta = document.createElement('textarea');
        ta.value = restored;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(restored).catch(writeFallback);
      } else {
        writeFallback();
      }
      setRelayLogs((prev) => [
        {
          id: `tr-relay-${prev.length + 1}`,
          dealId: advice.dealId,
          adviceId: advice.id,
          recipient: draft.recipient,
          subject: draft.subject,
          content: draft.body, // ログはマスクトークンのまま保存（表示層で復元）
          copiedAt: NOW_SHORT,
        },
        ...prev,
      ]);
      addToast(`${draft.recipient}宛の伝達文をコピーしました（伝達ログに記録）`);
    },
    [addToast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      inboxItems,
      toasts,
      analysisRunning,
      wikiAppends,
      snapshotPatches,
      allAdvice,
      adviceReadIds,
      markAdviceRead,
      relayLogs,
      copyRelay,
      dismissToast,
      getInboxItem,
      maskInboxToken,
      unmaskInboxToken,
      setInboxCounterparty,
      handOffToAi,
      archiveInboxItem,
      unarchiveInboxItem,
      setInboxMemo,
    }),
    [
      inboxItems,
      toasts,
      analysisRunning,
      wikiAppends,
      snapshotPatches,
      allAdvice,
      adviceReadIds,
      markAdviceRead,
      relayLogs,
      copyRelay,
      dismissToast,
      getInboxItem,
      maskInboxToken,
      unmaskInboxToken,
      setInboxCounterparty,
      handOffToAi,
      archiveInboxItem,
      unarchiveInboxItem,
      setInboxMemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
