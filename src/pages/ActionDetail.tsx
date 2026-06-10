import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { elapsedSince } from '../lib/time';
import { CategoryTag, RiskBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { DraftEditor } from '../components/DraftEditor';
import { MaskingPanel } from '../components/MaskingPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';

const BACK_LABEL: Record<string, string> = {
  '/': '❮ 台帳へ戻る',
  '/approvals': '❮ FS承認待ちへ戻る',
  '/archive': '❮ 完了済みへ戻る',
};

export function ActionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const store = useStore();
  const action = store.getAction(id);

  const [maskOpen, setMaskOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [maskVersion, setMaskVersion] = useState(0);

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
          <Button variant="link" onClick={() => navigate('/')}>
            台帳へ戻る
          </Button>
        </div>
      </div>
    );
  }

  const { label: elapsedLabel } = elapsedSince(action.createdAt);
  const isLedger = action.status === '未確認' || action.status === '対応中';
  const isReadOnly = !isLedger;
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
          FS承認済み（送信可能）— FS承認待ち一覧から送信できます
        </span>
      );
    }
    // 未確認 / 対応中（台帳の案件）
    if (action.risk === '低') {
      return (
        <div className="flex w-full justify-end gap-2">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            棄却する
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.approveAndSend(action.id);
              navigate('/');
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
        <div className="flex justify-end gap-2">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            棄却する
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              store.handToFS(action.id);
              navigate('/approvals');
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
        {BACK_LABEL[from] ?? '❮ 戻る'}
      </button>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {/* ヘッダー */}
        <div className="border-b border-line p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-sub">
            <CategoryTag category={action.category} />
            <RiskBadge risk={action.risk} />
            <span className="inline-flex items-center gap-1 tabular-nums">
              <span aria-hidden>⏱</span>
              {elapsedLabel}
            </span>
            <span aria-hidden>・</span>
            <span>状態:{action.status}</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">
            {action.counterparty} {action.title}
          </h1>
        </div>

        <div className="flex flex-col gap-6 p-5">
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

          {/* 下書き */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">◆ 下書き（編集可）</h2>
              <Button variant="link" onClick={() => setMaskOpen(true)}>
                マスクを管理
              </Button>
            </div>
            <DraftEditor
              draft={action.draft}
              version={maskVersion}
              entities={action.maskedEntities}
              readOnly={isReadOnly}
              onCommit={(text) => store.updateDraft(action.id, text)}
              onChipClick={() => setMaskOpen(true)}
            />
          </section>

          {/* マスキング状況 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">◆ マスキング状況</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {action.maskedEntities.map((e) => (
                <span key={e.token} className="text-ink">
                  <span className="font-medium">{e.token}</span>{' '}
                  <span className="text-ink-sub">
                    {e.type} ・出現{e.occurrences}回
                  </span>
                </span>
              ))}
            </div>
            {hasSuspect ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
                <span aria-hidden>⚠</span>
                <span>
                  未マスクの疑い：「{action.suspectedUnmasked.join('」「')}
                  」が下書きに含まれています
                </span>
                <button
                  onClick={() => setMaskOpen(true)}
                  className="ml-auto font-medium text-accent hover:underline"
                >
                  マスクを管理
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {/* フッターアクション */}
        <div className="flex items-center border-t border-line bg-surface p-5">
          <Footer />
        </div>
      </div>

      {maskOpen && (
        <MaskingPanel
          action={action}
          onClose={() => setMaskOpen(false)}
          onMask={(text, type) => {
            store.maskText(action.id, text, type);
            setMaskVersion((v) => v + 1);
          }}
          onIgnore={(text) => {
            store.ignoreSuspected(action.id, text);
            setMaskVersion((v) => v + 1);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="このアクションを棄却しますか？"
        confirmLabel="棄却する"
        onConfirm={() => {
          setConfirmOpen(false);
          store.reject(action.id);
          navigate('/');
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
