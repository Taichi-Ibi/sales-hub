import { useNavigate } from 'react-router-dom';
import type { Action, Category } from '../types';
import { elapsedSince, shortDate } from '../lib/time';
import { RiskBadge, StatusText } from './Badge';

const CATEGORY_ICON: Record<Category, string> = {
  法務: '⚖️',
  契約: '📝',
  期限付き返信: '⏰',
  対応漏れ: '⚠️',
};

interface Props {
  action: Action;
  from: string;
  footer?: React.ReactNode;
  priority?: number;
  muted?: boolean;
}

/** アクションカード（§7 S1）。Inbox カードと同じレイアウト。 */
export function ActionCard({ action, from, footer, priority, muted }: Props) {
  const navigate = useNavigate();
  const open = () => navigate(`/action/${action.id}`, { state: { from } });
  const { label: elapsed, level } = elapsedSince(action.createdAt);

  const elapsedColor =
    level === 'danger' ? 'text-danger' : level === 'warn' ? 'text-warn' : 'text-good';

  const wrapClass = priority
    ? 'border-gold/60 bg-white shadow-sm ring-1 ring-gold/40 hover:bg-surface'
    : muted
      ? 'border-line bg-white opacity-65 hover:opacity-100 hover:bg-surface'
      : 'border-line bg-white hover:bg-surface';

  return (
    <div className={`relative overflow-hidden rounded-lg border transition-all ${wrapClass}`}>
      {priority ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold" /> : null}
      <button
        onClick={open}
        className={`flex w-full items-center gap-3 py-3 pr-4 text-left ${priority ? 'pl-5' : 'pl-4'}`}
        aria-label={`${action.counterparty} ${action.title} を開く`}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg"
          aria-hidden
        >
          {CATEGORY_ICON[action.category]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`truncate text-[15px] ${action.status === '未確認' ? 'font-bold text-ink' : 'font-medium text-ink'}`}>
              {action.counterparty} {action.title}
            </p>
            {priority ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gold px-1.5 py-0.5 text-xs font-semibold text-ink">
                <span aria-hidden>★</span>{priority}
              </span>
            ) : null}
            <RiskBadge risk={action.risk} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-sub">
            <span>{action.category}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">期限 {shortDate(action.dueDate)}</span>
            <span aria-hidden>·</span>
            <StatusText status={action.status} />
            {action.handedOffLabel && (
              <>
                <span aria-hidden>·</span>
                <span>{action.handedOffLabel}</span>
              </>
            )}
          </p>
        </div>
        <span className={`w-16 shrink-0 self-start text-right tabular-nums text-xs ${elapsedColor}`}>
          {elapsed}
        </span>
      </button>
      {footer && <div className="border-t border-line px-4 py-2.5">{footer}</div>}
    </div>
  );
}
