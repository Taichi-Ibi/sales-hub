import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Action, InboxItem, MaskType, Status } from '../types';
import { SEED_ACTIONS } from '../data/actions';
import { SEED_INBOX } from '../data/inbox';
import { tokenize } from '../lib/tokenize';

// 完了系の操作で使う「今日」（モック固定。§8.1 の現在時刻に合わせる）。
const TODAY_LABEL = '6/10';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function circled(n: number): string {
  return CIRCLED[n - 1] ?? `(${n})`;
}

export type LedgerMode = 'normal' | 'empty' | 'loading';

export interface Toast {
  id: number;
  message: string;
}

interface StoreValue {
  actions: Action[];
  inboxItems: InboxItem[];
  ledgerMode: LedgerMode;
  toasts: Toast[];
  setLedgerMode: (m: LedgerMode) => void;
  getAction: (id: string) => Action | undefined;
  markInProgress: (id: string) => void;
  updateDraft: (id: string, draft: string) => void;
  approveAndSend: (id: string) => void; // 低リスク: 承認して送信 → 送信済み
  handToFS: (id: string) => void; // 高リスク: FS承認へ回す → FS承認待ち
  reject: (id: string) => void; // 棄却 → 棄却
  demoApproveByFS: (id: string) => void; // (デモ)FSが承認 → 承認済み
  send: (id: string) => void; // S4: 送信する → 送信済み
  unmask: (id: string, token: string) => void; // 復元: トークンを元の値に戻す（台帳は復元のみ）
  ignoreSuspected: (id: string, text: string) => void;
  dismissToast: (id: number) => void;
  // Inbox: 分かち書き(CPUシミュレート) → タップでマスキング → AIタスク化
  getInboxItem: (id: string) => InboxItem | undefined;
  finishTokenize: (id: string) => void; // 分かち書き完了 → マスキング中
  maskInboxToken: (id: string, text: string, type: MaskType) => void;
  unmaskInboxToken: (id: string, token: string) => void;
  distillInboxItem: (id: string) => void; // AIタスク化 → 台帳に Action を追加
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>(() =>
    SEED_ACTIONS.map((a) => ({ ...a, context: [...a.context], maskedEntities: a.maskedEntities.map((e) => ({ ...e })), suspectedUnmasked: [...a.suspectedUnmasked] })),
  );
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(() =>
    SEED_INBOX.map((i) => ({ ...i, masks: i.masks.map((m) => ({ ...m })), distilled: { ...i.distilled, context: [...i.distilled.context], knownSensitive: [...i.distilled.knownSensitive] } })),
  );
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>('normal');
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const addToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
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

  // ───────── Inbox ─────────

  const getInboxItem = useCallback(
    (id: string) => inboxItems.find((i) => i.id === id),
    [inboxItems],
  );

  // 分かち書きの完了（CPU実行のシミュレート）。トークン列を確定しマスキング工程へ。
  const finishTokenize = useCallback(
    (id: string) => {
      patchInbox(id, (i) =>
        i.tokens ? i : { ...i, tokens: tokenize(i.body), status: 'マスキング中' },
      );
    },
    [patchInbox],
  );

  // タップされたトークン文字列を伏せる。同一文字列の出現はすべて同じトークンになる。
  const maskInboxToken = useCallback(
    (id: string, text: string, type: MaskType) => {
      patchInbox(id, (i) => {
        if (i.masks.some((m) => m.text === text)) return i;
        const n = i.masks.filter((m) => m.type === type).length + 1;
        const token = `〔${type}${circled(n)}〕`;
        return { ...i, masks: [...i.masks, { text, type, token }] };
      });
    },
    [patchInbox],
  );

  const unmaskInboxToken = useCallback(
    (id: string, token: string) => {
      patchInbox(id, (i) => ({ ...i, masks: i.masks.filter((m) => m.token !== token) }));
    },
    [patchInbox],
  );

  // AIタスク化（シミュレート）。マスク済みの経緯から Action を生成し台帳へ追加する。
  // Inbox で付けたマスクは要約・背景・下書きに引き継がれ、台帳側では復元のみ可能。
  const distillInboxItem = useCallback(
    (id: string) => {
      const item = inboxItems.find((i) => i.id === id);
      if (!item || item.status === 'タスク化済み') return;
      const seed = item.distilled;
      const applyMasks = (text: string) =>
        item.masks.reduce((acc, m) => acc.split(m.text).join(m.token), text);
      const draft = applyMasks(seed.draft);
      const actionId = `n-${item.id}`;
      const action: Action = {
        id: actionId,
        category: seed.category,
        risk: seed.risk,
        title: seed.title,
        counterparty: seed.counterparty,
        dueDate: seed.dueDate,
        createdAt: '2026-06-10T09:55:00', // NOW 直前。経過バッジは「分」表示になる
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
        // マスクし損ねた既知の機微語は「未マスクの疑い」として台帳に引き継ぐ。
        suspectedUnmasked: seed.knownSensitive.filter(
          (s) => !item.masks.some((m) => m.text === s) && draft.includes(s),
        ),
      };
      setActions((prev) => [action, ...prev]);
      patchInbox(id, (i) => ({ ...i, status: 'タスク化済み', resultActionId: actionId }));
      addToast('タスク化しました');
    },
    [inboxItems, patchInbox, addToast],
  );

  const value = useMemo<StoreValue>(
    () => ({
      actions,
      inboxItems,
      ledgerMode,
      toasts,
      setLedgerMode,
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
      finishTokenize,
      maskInboxToken,
      unmaskInboxToken,
      distillInboxItem,
    }),
    [
      actions,
      inboxItems,
      ledgerMode,
      toasts,
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
      finishTokenize,
      maskInboxToken,
      unmaskInboxToken,
      distillInboxItem,
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

// 一覧の振り分けはステータスで一意に決まる（§8.3）。
export const LEDGER_STATUSES: Status[] = ['未確認', '対応中'];
export const APPROVAL_STATUSES: Status[] = ['FS承認待ち', '承認済み'];
export const ARCHIVE_STATUSES: Status[] = ['送信済み', '棄却'];
