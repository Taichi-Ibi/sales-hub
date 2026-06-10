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
}

/** アクションカード（§7 S1）。S1/S4 で共通利用。 */
export function ActionCard({ action, from, footer }: Props) {
  const navigate = useNavigate();
  const open = () => navigate(`/action/${action.id}`, { state: { from } });

  return (
    <div className="rounded-lg border border-line bg-white transition-colors hover:bg-surface">
      <button
        onClick={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-label={`${action.counterparty} ${action.title} を開く`}
      >
        <ElapsedBadge createdAt={action.createdAt} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
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
