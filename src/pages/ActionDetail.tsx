import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { elapsedSince } from '../lib/time';
import type { MaskedEntity } from '../types';
import { MASK_TYPE_MAP } from '../lib/maskTypes';
import { CategoryTag, RiskBadge } from '../components/Badge';
import { ContextDrilldown } from '../components/Drilldown';
import { Button } from '../components/Button';
import { MaskingPanel } from '../components/MaskingPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';

type DraftSegment = { type: 'plain'; text: string } | { type: 'token'; original: string; value: string; maskType: string };

function parseDecryptedDraft(draft: string, entities: MaskedEntity[]): DraftSegment[] {
  const map = new Map(entities.map((e) => [e.token, { value: e.decryptedValue, maskType: e.type }]));
  const segments: DraftSegment[] = [];
  const regex = /〔[^〕]+〕/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(draft)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'plain', text: draft.slice(lastIndex, match.index) });
    }
    const entry = map.get(match[0]);
    segments.push({ type: 'token', original: match[0], value: entry?.value ?? match[0], maskType: entry?.maskType ?? '' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < draft.length) {
    segments.push({ type: 'plain', text: draft.slice(lastIndex) });
  }
  return segments;
}

function DecryptedDraft({ draft, entities }: { draft: string; entities: MaskedEntity[] }) {
  const [copied, setCopied] = useState(false);
  const segments = parseDecryptedDraft(draft, entities);
  const plainText = segments.map((s) => (s.type === 'plain' ? s.text : s.value)).join('');

  function copy() {
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">◆ 下書き（復元済み）</h2>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          aria-label="下書きをコピー"
        >
          {copied ? '✔ コピーしました' : '📋 コピー'}
        </button>
      </div>
      <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
        {segments.map((seg, i) =>
          seg.type === 'plain' ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              className={`rounded px-0.5 font-medium ${MASK_TYPE_MAP[seg.maskType as keyof typeof MASK_TYPE_MAP]?.chipClass ?? 'bg-accent-soft text-accent'}`}
              title={seg.original}
            >
              {seg.value}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/** 戻り先ラベル。台帳はタブ（?tab=…）ごと、Inbox はそのまま。 */
function backLabel(from: string): string {
  if (from.startsWith('/inbox')) return '❮ 受信箱へ戻る';
  if (from.includes('tab=waiting')) return '❮ 台帳（依頼中）へ戻る';
  if (from.includes('tab=done')) return '❮ 台帳（完了）へ戻る';
  return '❮ 台帳へ戻る';
}

export function ActionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/ledger';

  const store = useStore();
  const action = store.getAction(id);

  const [maskOpen, setMaskOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 初回に開いたら「対応中」に進める（§7 S2 状態バリエーション）。
  useEffect(() => {
    if (action?.status === '未確認') store.markInProgress(action.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.id]);

  if (!action) {
    return (
      <div className="py-20 text-center text-ink-sub">
        アクションが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/ledger')}>
            台帳へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const { label: elapsedLabel } = elapsedSince(action.createdAt);
  const hasSuspect = action.suspectedUnmasked.length > 0;

  const Footer = () => {
    if (action.status === '送信済み') {
      return <span className="text-sm font-medium text-good">送信済み（読み取り専用）</span>;
    }
    if (action.status === '棄却') {
      return (
        <span className="rounded-md bg-danger/10 px-2 py-1 text-sm font-medium text-danger">
          棄却済み（読み取り専用）
        </span>
      );
    }
    if (action.status === 'FS承認待ち') {
      return (
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-medium text-warn">FS承認待ち</span>
          <Button variant="primary" disabled>
            送信
          </Button>
        </div>
      );
    }
    if (action.status === '承認済み') {
      return (
        <span className="text-sm font-medium text-good">
          FS承認済み（送信可能）— 台帳の「依頼中」タブから送信できます
        </span>
      );
    }
    // 未確認 / 対応中（台帳の案件）
    if (action.risk === '低') {
      return (
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            棄却する
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.approveAndSend(action.id);
              navigate(from);
            }}
          >
            承認して送信 ▶
          </Button>
        </div>
      );
    }
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          <span aria-hidden>🔴</span>高リスク案件のため、FS承認が必要です
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            棄却する
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.handToFS(action.id);
              navigate('/ledger?tab=waiting');
            }}
          >
            FS承認へ回す ▶
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <button
        onClick={() => navigate(from)}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        {backLabel(from)}
      </button>

      <div className="overflow-hidden bg-white">
        {/* ヘッダー */}
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-xl" aria-hidden>📋</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-ink">
                  {action.counterparty} {action.title}
                </h1>
                <CategoryTag category={action.category} />
                <RiskBadge risk={action.risk} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-sub">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <span aria-hidden>⏱</span>
                  {elapsedLabel}
                </span>
                <span aria-hidden>·</span>
                <span>{action.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {/* 要約 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 要約</h2>
            <p className="text-sm leading-relaxed text-ink">{action.summary}</p>
          </section>

          {/* 背景（金額は伏せ字にしない） */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ 背景</h2>
            <ul className="flex flex-col gap-1 text-sm text-ink">
              {action.context.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ink-sub" aria-hidden>
                    ・
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 経緯のドリルダウン: 原文と案件プロパティ。
              詳細→詳細の遷移でも開閉状態を持ち越さないよう案件IDでリセット。 */}
          <ContextDrilldown key={action.id} action={action} />

          {/* 下書き（復元済みプレビュー + コピー） */}
          <section>
            <DecryptedDraft draft={action.draft} entities={action.maskedEntities} />
          </section>

          {/* 未マスクの疑いがある場合のみ警告を表示 */}
          {hasSuspect && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
              <span aria-hidden>⚠</span>
              <span>
                未マスクの疑い：「{action.suspectedUnmasked.join('」「')}
                」が下書きに含まれています
              </span>
              <button
                onClick={() => setMaskOpen(true)}
                className="ml-auto font-medium text-accent hover:underline"
              >
                確認する
              </button>
            </div>
          )}
        </div>

        {/* フッターアクション */}
        <div className="flex items-center border-t border-line bg-surface p-4 sm:p-5">
          <Footer />
        </div>
      </div>

      {maskOpen && (
        <MaskingPanel
          action={action}
          onClose={() => setMaskOpen(false)}
          onUnmask={(token) => store.unmask(action.id, token)}
          onIgnore={(text) => store.ignoreSuspected(action.id, text)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="このアクションを棄却しますか？"
        confirmLabel="棄却する"
        onConfirm={() => {
          setConfirmOpen(false);
          store.reject(action.id);
          navigate(from);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
