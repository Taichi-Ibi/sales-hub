// 経過時間の算出と色分け（仕様書 §7 S1 / §9.1 / §12）。

// モックの「現在時刻」は固定値（§8.1）。
export const NOW = new Date('2026-06-10T10:00:00');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type ElapsedLevel = 'good' | 'warn' | 'danger';

export interface Elapsed {
  /** 表示ラベル。例 "5日" / "4時間" / "30分" */
  label: string;
  /**
   * 色区分。
   * 24h未満=good(緑) / 24h以上72h未満=warn(黄) / 72h以上=danger(赤)。
   * 境界ちょうどは上位区分（より目立つ色）に含める。
   */
  level: ElapsedLevel;
}

export function elapsedSince(createdAt: string, now: Date = NOW): Elapsed {
  const ms = Math.max(0, now.getTime() - new Date(createdAt).getTime());

  let level: ElapsedLevel;
  if (ms >= 72 * HOUR) level = 'danger';
  else if (ms >= 24 * HOUR) level = 'warn';
  else level = 'good';

  let label: string;
  if (ms >= DAY) label = `${Math.floor(ms / DAY)}日`;
  else if (ms >= HOUR) label = `${Math.floor(ms / HOUR)}時間`;
  else label = `${Math.floor(ms / (60 * 1000))}分`;

  return { label, level };
}

/** 次の毎正時実行までの時刻ラベルと残り分数を返す。 */
export function nextHourlyRun(now: Date = NOW): { timeLabel: string; minutesUntil: number } {
  const next = new Date(now.getTime());
  next.setHours(next.getHours() + 1, 0, 0, 0);
  const minutesUntil = Math.round((next.getTime() - now.getTime()) / (60 * 1000));
  const timeLabel = `${next.getHours()}:${String(next.getMinutes()).padStart(2, '0')}`;
  return { timeLabel, minutesUntil };
}

/** "2026-06-12" → "6/12" */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 期限の緊急度区分。台帳を「今日すべきこと／明日まで／それ以降」に
 * フォーカスさせるための分類。
 * - today    : 期限が今日まで（超過分も含む）
 * - tomorrow : 期限が明日
 * - later    : それ以降
 */
export type DueBucket = 'today' | 'tomorrow' | 'later';

export function dueBucket(dueDate: string, now: Date = NOW): DueBucket {
  // 日付のみで比較するため、両者をその日の 0:00 に正規化する。
  const due = new Date(`${dueDate}T00:00:00`);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - startOfToday.getTime()) / DAY);
  if (diffDays <= 0) return 'today'; // 今日まで（超過含む）
  if (diffDays === 1) return 'tomorrow';
  return 'later';
}
