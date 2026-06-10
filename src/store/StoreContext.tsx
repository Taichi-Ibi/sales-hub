import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Action, MaskType, Status } from '../types';
import { SEED_ACTIONS } from '../data/actions';

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
  maskText: (id: string, text: string, type: MaskType) => void;
  unmask: (id: string, token: string) => void; // 復元: トークンを元の値に戻す
  ignoreSuspected: (id: string, text: string) => void;
  dismissToast: (id: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>(() =>
    SEED_ACTIONS.map((a) => ({ ...a, context: [...a.context], maskedEntities: a.maskedEntities.map((e) => ({ ...e })), suspectedUnmasked: [...a.suspectedUnmasked] })),
  );
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>('normal');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const patch = useCallback((id: string, fn: (a: Action) => Action) => {
    setActions((prev) => prev.map((a) => (a.id === id ? fn(a) : a)));
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

  const maskText = useCallback(
    (id: string, text: string, type: MaskType) => {
      patch(id, (a) => {
        if (!text.trim()) return a;
        // 種別ごとに連番を振る（例 〔氏名①〕〔氏名②〕〔会社①〕）。
        const n = a.maskedEntities.filter((e) => e.type === type).length + 1;
        const token = `〔${type}${circled(n)}〕`;
        // 下書き内の該当文字列をトークンに置換し、出現回数を数える。
        const parts = a.draft.split(text);
        const occurrences = parts.length - 1;
        const draft = occurrences > 0 ? parts.join(token) : a.draft;
        return {
          ...a,
          draft,
          maskedEntities: [
            ...a.maskedEntities,
            { token, type, decryptedValue: text, occurrences: Math.max(1, occurrences) },
          ],
          suspectedUnmasked: a.suspectedUnmasked.filter((s) => s !== text),
        };
      });
    },
    [patch],
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

  const value = useMemo<StoreValue>(
    () => ({
      actions,
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
      maskText,
      unmask,
      ignoreSuspected,
      dismissToast,
    }),
    [
      actions,
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
      maskText,
      unmask,
      ignoreSuspected,
      dismissToast,
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
