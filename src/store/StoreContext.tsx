import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Action, InboxItem, MaskType, Status } from '../types';
import type { WikiUpdate } from '../data/wiki';
import { SEED_ACTIONS } from '../data/actions';
import { SEED_INBOX } from '../data/inbox';
import { tokenize } from '../lib/tokenize';

// 完了系の操作で使う「今日」（モック固定。lib/time.ts の NOW に合わせる）。
const TODAY_LABEL = '6/10';
// 実行時に発生するイベントの時刻表現（モックでは NOW 固定）。
const NOW_ISO = '2026-06-10T10:00:00';
const NOW_SHORT = '6/10 10:00';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function circled(n: number): string {
  return CIRCLED[n - 1] ?? `(${n})`;
}

export interface Toast {
  id: number;
  message: string;
  actionId?: string;
  actionTitle?: string;
}

interface StoreValue {
  actions: Action[];
  inboxItems: InboxItem[];
  toasts: Toast[];
  analysisRunning: boolean;
  /** 実行時に wiki ページへ追記された更新（counterparty → 更新リスト）。 */
  wikiAppends: Record<string, WikiUpdate[]>;
  getAction: (id: string) => Action | undefined;
  markInProgress: (id: string) => void;
  updateDraft: (id: string, draft: string) => void;
  approveAndSend: (id: string) => void; // 低リスク: 承認して送信 → 送信済み
  handToFS: (id: string) => void; // 高リスク: FS承認へ回す → FS承認待ち
  reject: (id: string) => void; // 棄却 → 棄却
  demoApproveByFS: (id: string) => void; // (デモ)FSが承認 → 承認済み
  send: (id: string) => void; // 承認済みからの送信 → 送信済み
  unmask: (id: string, token: string) => void; // 復元: トークンを元の値に戻す（台帳は復元のみ）
  ignoreSuspected: (id: string, text: string) => void;
  dismissToast: (id: number) => void;
  // 受信箱（マスキング目視ゲート）。
  // 機密情報がないことを保証できるのは人間のみ。ロジックの自動マスクは補助で、
  // すべてのアイテムは人が目視確認・マスク補正・案件選択をしてからAIに渡す（handOffToAi）。
  getInboxItem: (id: string) => InboxItem | undefined;
  maskInboxToken: (id: string, text: string, type: MaskType, atIndex?: number) => void;
  unmaskInboxToken: (id: string, token: string, atIndex: number) => void;
  setInboxCounterparty: (id: string, counterparty: string) => void;
  handOffToAi: (id: string) => void; // 目視確認してAIに渡す → 解析（シミュレート）→ 処理済み
  archiveInboxItem: (id: string) => void; // AIに渡さない
  unarchiveInboxItem: (id: string) => void;
  setInboxMemo: (id: string, memo: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>(() =>
    SEED_ACTIONS.map((a) => ({ ...a, context: [...a.context], maskedEntities: a.maskedEntities.map((e) => ({ ...e })), suspectedUnmasked: [...a.suspectedUnmasked] })),
  );
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() =>
    SEED_INBOX.map((i) => ({
      ...i,
      // 分かち書きは受信時に自動実行済みという建て付け（初期化時に付与）。
      tokens: i.tokens ?? tokenize(i.body),
      masks: i.masks.map((m) => ({ ...m })),
      distilled: { ...i.distilled, context: [...i.distilled.context], knownSensitive: [...i.distilled.knownSensitive] },
    })),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [wikiAppends, setWikiAppends] = useState<Record<string, WikiUpdate[]>>({});

  const patch = useCallback((id: string, fn: (a: Action) => Action) => {
    setActions((prev) => prev.map((a) => (a.id === id ? fn(a) : a)));
  }, []);

  const patchInbox = useCallback((id: string, fn: (i: InboxItem) => InboxItem) => {
    setInboxItems((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));
  }, []);

  const setStatus = useCallback(
    (id: string, status: Status, extra?: Partial<Action>) => {
      patch(id, (a) => ({ ...a, status, ...extra }));
    },
    [patch],
  );

  const addToast = useCallback((message: string, extra?: { actionId?: string; actionTitle?: string }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, ...extra }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getAction = useCallback((id: string) => actions.find((a) => a.id === id), [actions]);

  const markInProgress = useCallback(
    (id: string) => {
      patch(id, (a) => (a.status === '未確認' ? { ...a, status: '対応中' } : a));
    },
    [patch],
  );

  const updateDraft = useCallback(
    (id: string, draft: string) => {
      patch(id, (a) => ({ ...a, draft }));
    },
    [patch],
  );

  const approveAndSend = useCallback(
    (id: string) => {
      setStatus(id, '送信済み', { completedDate: TODAY_LABEL });
      addToast('送信しました');
    },
    [setStatus, addToast],
  );

  const handToFS = useCallback(
    (id: string) => {
      setStatus(id, 'FS承認待ち', { handedOffLabel: 'FSへ回した: たった今' });
      addToast('FS承認へ回しました');
    },
    [setStatus, addToast],
  );

  const reject = useCallback(
    (id: string) => {
      setStatus(id, '棄却', { completedDate: TODAY_LABEL });
      addToast('棄却しました');
    },
    [setStatus, addToast],
  );

  const demoApproveByFS = useCallback(
    (id: string) => {
      setStatus(id, '承認済み');
    },
    [setStatus],
  );

  const send = useCallback(
    (id: string) => {
      setStatus(id, '送信済み', { completedDate: TODAY_LABEL });
      addToast('送信しました');
    },
    [setStatus, addToast],
  );

  const unmask = useCallback(
    (id: string, token: string) => {
      // 復元: 下書き内のトークンを元の値に戻し、辞書からも除く。
      patch(id, (a) => {
        const ent = a.maskedEntities.find((e) => e.token === token);
        if (!ent) return a;
        return {
          ...a,
          draft: a.draft.split(token).join(ent.decryptedValue),
          maskedEntities: a.maskedEntities.filter((e) => e.token !== token),
        };
      });
    },
    [patch],
  );

  const ignoreSuspected = useCallback(
    (id: string, text: string) => {
      patch(id, (a) => ({
        ...a,
        suspectedUnmasked: a.suspectedUnmasked.filter((s) => s !== text),
      }));
    },
    [patch],
  );

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

  // 単体のタスク化ロジック（内部用）。draft が空の場合はアクション不要として完了扱い。
  // タスク化と同時に、該当案件の wiki ページへ「取込」更新を追記する。
  const distillOne = useCallback(
    (id: string, items: InboxItem[]) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.status === '処理済み') return;
      const seed = item.distilled;
      const counterparty = item.counterparty || seed.counterparty;
      if (!seed.draft) {
        patchInbox(id, (i) => ({
          ...i,
          status: '処理済み',
          processedAt: NOW_ISO,
          verifiedBy: '山田 内勤',
          analysisNote: 'タスクなし',
          attention: undefined,
        }));
        return;
      }
      const applyMasks = (text: string) =>
        item.masks.reduce((acc, m) => acc.split(m.text).join(m.token), text);
      const draft = applyMasks(seed.draft);
      const actionId = `n-${item.id}`;
      const action: Action = {
        id: actionId,
        category: seed.category,
        risk: seed.risk,
        title: seed.title,
        counterparty,
        dueDate: seed.dueDate,
        createdAt: NOW_ISO,
        status: '未確認',
        summary: applyMasks(seed.summary),
        context: seed.context.map(applyMasks),
        draft,
        maskedEntities: item.masks.map((m) => ({
          token: m.token,
          type: m.type,
          decryptedValue: m.text,
          occurrences: Math.max(1, draft.split(m.token).length - 1),
        })),
        suspectedUnmasked: seed.knownSensitive.filter(
          (s) => !item.masks.some((m) => m.text === s) && draft.includes(s),
        ),
        origin: {
          source: item.source,
          title: item.title,
          sender: item.sender,
          receivedAt: item.receivedAt,
          body: item.body,
          inboxItemId: item.id,
        },
      };
      setActions((prev) => [action, ...prev]);
      patchInbox(id, (i) => ({
        ...i,
        status: '処理済み',
        processedAt: NOW_ISO,
        verifiedBy: '山田 内勤',
        resultActionId: actionId,
        attention: undefined,
      }));
      if (counterparty) {
        setWikiAppends((prev) => ({
          ...prev,
          [counterparty]: [
            {
              at: NOW_SHORT,
              kind: '取込',
              summary: `${item.source === 'mail' ? 'メール' : item.source === 'slack' ? 'Slack' : '議事録'}「${item.title}」からタスク「${seed.title}」を生成`,
              source: { label: item.title, inboxItemId: item.id },
            },
            ...(prev[counterparty] ?? []),
          ],
        }));
      }
      addToast('タスク化しました', { actionId, actionTitle: seed.title });
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
        distillOne(id, inboxItems);
        setAnalysisRunning(false);
        if (!target.distilled.draft) addToast('解析完了（タスクなし）');
      }, 1500);
    },
    [inboxItems, distillOne, addToast],
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

  const value = useMemo<StoreValue>(
    () => ({
      actions,
      inboxItems,
      toasts,
      analysisRunning,
      wikiAppends,
      getAction,
      markInProgress,
      updateDraft,
      approveAndSend,
      handToFS,
      reject,
      demoApproveByFS,
      send,
      unmask,
      ignoreSuspected,
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
      actions,
      inboxItems,
      toasts,
      analysisRunning,
      wikiAppends,
      getAction,
      markInProgress,
      updateDraft,
      approveAndSend,
      handToFS,
      reject,
      demoApproveByFS,
      send,
      unmask,
      ignoreSuspected,
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

// 一覧の振り分けはステータスで一意に決まる。
// 「今日」ビューのタブ: やる（自分が動かす）/ 待ち（他人待ち）/ 済み（ログ）。
export const LEDGER_STATUSES: Status[] = ['未確認', '対応中'];
export const APPROVAL_STATUSES: Status[] = ['FS承認待ち', '承認済み'];
export const ARCHIVE_STATUSES: Status[] = ['送信済み', '棄却'];
