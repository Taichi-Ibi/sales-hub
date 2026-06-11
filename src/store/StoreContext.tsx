import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Action, InboxItem, MaskType, Status } from '../types';
import { SEED_ACTIONS } from '../data/actions';
import { SEED_INBOX } from '../data/inbox';
import { DEALS } from '../data/deals';
import { tokenize } from '../lib/tokenize';
import { detectMaskType } from '../lib/autoDetect';

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
  analysisRunning: boolean;
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
  // Inbox: 分かち書き(CPUシミュレート) → タップでマスキング → 案件選択 → AI Ready → バッチ解析 → タスク化
  getInboxItem: (id: string) => InboxItem | undefined;
  finishTokenize: (id: string) => void; // 分かち書き完了 → マスキング中
  maskInboxToken: (id: string, text: string, type: MaskType) => void;
  unmaskInboxToken: (id: string, token: string, atIndex: number) => void;
  unmaskAllInboxTokens: (id: string) => void;
  setInboxCounterparty: (id: string, counterparty: string) => void; // 案件名を設定
  markAiReady: (id: string) => void; // AI Readyにする（マスク・案件選択が前提。解析は行わない）
  runAiAnalysis: () => void; // バッチ解析: aiReady かつ未タスク化のアイテムを一括処理
  runSingleAnalysis: (id: string) => void; // 単件解析: 指定アイテムのみ即時処理
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
  const [analysisRunning, setAnalysisRunning] = useState(false);

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
  // 電話番号・メールアドレスはルールベースで自動マスク（連絡先）。誤検出は手動で復元可能。
  // 案件名と完全一致する文字列が本文にあれば案件を自動選択（長い名称を優先して誤マッチ防止）。
  const finishTokenize = useCallback(
    (id: string) => {
      patchInbox(id, (i) => {
        if (i.tokens) return i;
        const tokens = tokenize(i.body);
        const autoMasks: typeof i.masks = [];
        const seen = new Set<string>();
        for (const t of tokens) {
          if (seen.has(t)) continue;
          seen.add(t);
          const type = detectMaskType(t);
          if (!type) continue;
          if (i.masks.some((m) => m.text === t)) continue;
          const n = i.masks.filter((m) => m.type === type).length + autoMasks.filter((m) => m.type === type).length + 1;
          autoMasks.push({ text: t, type, token: `〔${type}${circled(n)}〕`, excludedIndices: [] });
        }
        let counterparty = i.counterparty;
        if (!counterparty) {
          const byLength = [...DEALS].sort((a, b) => b.counterparty.length - a.counterparty.length);
          counterparty = byLength.find((d) => i.body.includes(d.counterparty))?.counterparty ?? '';
        }
        return { ...i, tokens, masks: [...i.masks, ...autoMasks], status: 'マスキング中', counterparty };
      });
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

  const unmaskAllInboxTokens = useCallback(
    (id: string) => {
      patchInbox(id, (i) => ({ ...i, masks: [] }));
    },
    [patchInbox],
  );

  // 案件名を設定する。
  const setInboxCounterparty = useCallback(
    (id: string, counterparty: string) => {
      patchInbox(id, (i) => ({ ...i, counterparty }));
    },
    [patchInbox],
  );

  // AI Readyにする（案件選択・マスク完了の宣言のみ。解析はバッチで行う）。
  const markAiReady = useCallback(
    (id: string) => {
      patchInbox(id, (i) => (i.aiReady ? i : { ...i, aiReady: true }));
    },
    [patchInbox],
  );

  // 単体のタスク化ロジック（内部用）。draft が空の場合はアクション不要として完了扱い。
  const distillOne = useCallback(
    (id: string, items: InboxItem[]) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.status === 'タスクあり') return;
      const seed = item.distilled;
      if (!seed.draft) {
        patchInbox(id, (i) => ({ ...i, status: 'タスクあり' }));
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
        counterparty: item.counterparty || seed.counterparty,
        dueDate: seed.dueDate,
        createdAt: '2026-06-10T09:55:00',
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
      patchInbox(id, (i) => ({ ...i, status: 'タスクあり', aiReady: true, resultActionId: actionId }));
    },
    [patchInbox],
  );

  // 単件解析: 指定アイテムのみ即時処理（詳細画面の「今すぐ解析」用）。
  const runSingleAnalysis = useCallback(
    (id: string) => {
      const target = inboxItems.find((i) => i.id === id);
      if (!target || !target.aiReady || target.status === 'タスクあり') return;
      setAnalysisRunning(true);
      window.setTimeout(() => {
        distillOne(id, inboxItems);
        setAnalysisRunning(false);
        addToast(target.distilled.draft ? 'タスクを生成しました' : '解析完了（タスクなし）');
      }, 1500);
    },
    [inboxItems, distillOne, addToast],
  );

  // バッチ解析: aiReady かつ未タスク化のアイテムをまとめて処理（1時間ごと自動 or 手動）。
  const runAiAnalysis = useCallback(() => {
    const pending = inboxItems.filter((i) => i.aiReady && i.status !== 'タスクあり');
    if (pending.length === 0) {
      addToast('解析する新規データがありません');
      return;
    }
    setAnalysisRunning(true);
    // 解析シミュレート（1.5秒）
    window.setTimeout(() => {
      const snapshot = pending; // タイムアウト時点のリスト（モックなので許容）
      snapshot.forEach((item) => distillOne(item.id, inboxItems));
      setAnalysisRunning(false);
      const taskCount = snapshot.filter((i) => !!i.distilled.draft).length;
      addToast(taskCount > 0 ? `${taskCount}件のタスクを生成しました` : '解析完了（新規タスクなし）');
    }, 1500);
  }, [inboxItems, distillOne, addToast]);

  const value = useMemo<StoreValue>(
    () => ({
      actions,
      inboxItems,
      ledgerMode,
      toasts,
      analysisRunning,
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
      unmaskAllInboxTokens,
      setInboxCounterparty,
      markAiReady,
      runAiAnalysis,
      runSingleAnalysis,
    }),
    [
      actions,
      inboxItems,
      ledgerMode,
      toasts,
      analysisRunning,
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
      unmaskAllInboxTokens,
      setInboxCounterparty,
      markAiReady,
      runAiAnalysis,
      runSingleAnalysis,
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
