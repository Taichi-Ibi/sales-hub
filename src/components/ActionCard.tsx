import { useNavigate } from 'react-router-dom';
import type { Action } from '../types';
import { shortDate } from '../lib/time';
import { CategoryTag, ElapsedBadge, RiskBadge, StatusText } from './Badge';

interface Props {
  action: Action;
  /** S2 から戻る先を伝えるため、遷移元を from で渡す。 */
  from: string;
  /** カード下部に差し込む操作（S4 のデモボタン等）。 */
  footer?: React.ReactNode;
  /** 最優先（トップ3）として強調表示する。左にアクセントの帯＋「優先」バッジ。 */
  priority?: number;
  /** フォーカス外（それ以降）として控えめに表示する。 */
  muted?: boolean;
}

/** アクションカード（§7 S1）。S1/S4 で共通利用。 */
export function ActionCard({ action, from, footer, priority, muted }: Props) {
  const navigate = useNavigate();
  const open = () => navigate(`/action/${action.id}`, { state: { from } });

  const wrapClass = priority
    ? 'border-gold/60 bg-white shadow-sm ring-1 ring-gold/40 hover:bg-surface'
    : muted
      ? 'border-line bg-white opacity-65 hover:opacity-100 hover:bg-surface'
      : 'border-line bg-white hover:bg-surface';

  return (
    <div
      className={`relative overflow-hidden rounded-lg border transition-all ${wrapClass}`}
    >
      {/* 最優先は左端に Gold の帯（Attention Gold で視覚的な優先度を表現）。 */}
      {priority ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold" /> : null}
      <button
        onClick={open}
        className={`flex w-full items-center gap-3 py-3 pr-4 text-left ${priority ? 'pl-5' : 'pl-4'}`}
        aria-label={`${action.counterparty} ${action.title} を開く`}
      >
        <ElapsedBadge createdAt={action.createdAt} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {priority ? (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-gold text-ink">
                <span aria-hidden>★</span>優先 {priority}
              </span>
            ) : null}
            <CategoryTag category={action.category} />
            <RiskBadge risk={action.risk} />
          </div>
          <p
            className={`truncate text-[15px] ${action.status === '未確認' ? 'font-bold text-ink' : 'font-medium text-ink'}`}
          >
            {action.counterparty} {action.title}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-sub">
            <span className="tabular-nums">期限 {shortDate(action.dueDate)}</span>
            <span aria-hidden>・</span>
            <StatusText status={action.status} />
            {action.handedOffLabel && (
              <>
                <span aria-hidden>・</span>
                <span>{action.handedOffLabel}</span>
              </>
            )}
          </p>
        </div>
        <span className="shrink-0 text-ink-sub" aria-hidden>
          ❯
        </span>
      </button>
      {footer && <div className="border-t border-line px-4 py-2.5">{footer}</div>}
    </div>
  );
}
