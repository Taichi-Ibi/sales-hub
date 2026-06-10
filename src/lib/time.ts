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

/** "2026-06-12" → "6/12" */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
