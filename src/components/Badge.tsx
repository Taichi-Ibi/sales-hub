import type { Category, Risk, Status } from '../types';
import { elapsedSince, type ElapsedLevel } from '../lib/time';

const ELAPSED_CLASS: Record<ElapsedLevel, string> = {
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
};

/** 経過バッジ ⏱（§7 S1 / §9.1）。色は good/warn/danger の3色。 */
export function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const { label, level } = elapsedSince(createdAt);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${ELAPSED_CLASS[level]}`}
    >
      <span aria-hidden>⏱</span>
      {label}
    </span>
  );
}

/** カテゴリタグ。淡い背景＋濃い文字（§9.4）。 */
export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink">
      {category}
    </span>
  );
}

/** 高リスクバッジ。高のみ表示、低は何も出さない（§7 S1）。 */
export function RiskBadge({ risk }: { risk: Risk }) {
  if (risk !== '高') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
      <span aria-hidden>🔴</span>高リスク
    </span>
  );
}

const STATUS_CLASS: Record<Status, string> = {
  未確認: 'font-bold text-ink',
  対応中: 'text-ink-sub',
  FS承認待ち: 'text-warn font-medium',
  承認済み: 'text-good font-medium',
  送信済み: 'text-good font-medium',
  棄却: 'text-danger font-medium',
};

/** 状態表示。未確認は強め、FS承認待ちは黄系など（§7 S1 / §9.1）。 */
export function StatusText({ status }: { status: Status }) {
  return <span className={`text-xs ${STATUS_CLASS[status]}`}>状態:{status}</span>;
}
