import type { Action, MaskType } from '../types';
import { MASK_TYPE_MAP } from '../lib/maskTypes';
import { Button } from './Button';

interface Props {
  action: Action;
  onClose: () => void;
  onUnmask: (token: string) => void;
  onIgnore: (text: string) => void;
}

/** 種別チップ（アイコン＋トークン）。下書き内のチップと配色を揃える。 */
function TypeChip({ type, token }: { type: MaskType; token: string }) {
  const meta = MASK_TYPE_MAP[type];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
    >
      <span aria-hidden>{meta.icon}</span>
      {token}
    </span>
  );
}

/**
 * S3. 伏せ字の復元パネル。S2 上に右からスライドインする（§7 S3 / §10）。
 * マスキング（伏せる操作）は Inbox 側で行い、台帳ではここでの復元のみを行う。
 * トークンは種別名入り（〔氏名①〕等）で、伏せても役割が AI/人間に伝わる。
 */
export function MaskingPanel({ action, onClose, onUnmask, onIgnore }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/20"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        style={{ animation: 'panel-in 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">伏せ字と復元</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid size-8 place-items-center rounded-md text-ink-sub hover:bg-surface"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-ink-sub">
            伏せ字は Inbox（原文）の段階でタップして付けます。台帳ではマスキングは行わず、
            ここで元の値を確認・<span className="font-medium text-ink">復元</span>
            だけができます。金額は伏せません。
          </p>

          {/* 当該案件の伏せ字一覧 + 復元 */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
              この案件の伏せ字
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {action.maskedEntities.length}
              </span>
            </h3>
            {action.maskedEntities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-ink-sub">
                伏せ字はありません。
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {action.maskedEntities.map((e) => (
                  <div
                    key={e.token}
                    className="flex items-center gap-3 rounded-lg border border-line p-2.5"
                  >
                    <TypeChip type={e.type} token={e.token} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{e.decryptedValue}</p>
                      <p className="text-xs text-ink-sub">
                        {MASK_TYPE_MAP[e.type].label}・出現{e.occurrences}回
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => onUnmask(e.token)}>
                      ↩ 復元
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 未マスクの疑い（マスキング自体は Inbox で行うため、ここでは無視のみ） */}
          {action.suspectedUnmasked.length > 0 && (
            <section className="mt-6 rounded-lg border border-warn/30 bg-warn/5 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-warn">
                <span aria-hidden>⚠</span>未マスクの疑い
              </h3>
              <ul className="flex flex-col gap-2">
                {action.suspectedUnmasked.map((s) => (
                  <li
                    key={s}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-sm"
                  >
                    <span className="font-medium text-ink">「{s}」</span>
                    <Button variant="link" className="ml-auto" onClick={() => onIgnore(s)}>
                      無視
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-sub">
                伏せる場合は Inbox の原文に戻ってタップでマスキングしてください。
              </p>
            </section>
          )}
        </div>

        <style>{`@keyframes panel-in { from { transform: translateX(100%); } to { transform: none; } }`}</style>
      </aside>
    </div>
  );
}
