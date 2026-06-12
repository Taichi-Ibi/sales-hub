import { WIKI_PAGES } from './wiki';

// チーム（社内メンバー）の名簿と「視点切り替え（誰として見るか）」のためのスコープ補助。
// 本物の認証・権限は作らない（CLAUDE.md「作らないもの」）。見た目だけの "view as"。
// 社内で PersonPage を持つのは駒田のみのため、ここは PEOPLE_PAGES に依存せず自己完結させる。

export interface TeamMember {
  id: string; // 'rep-yamada' | 'rep-komada' | 'rep-miyoshi'
  name: string; // WikiPage.salesRep と完全一致させること
  role: string;
  personPageId?: string; // 'ps-komada' のみ存在
  isVerifier?: boolean; // 山田: 内勤・目視確認担当。担当案件は持たない
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'rep-yamada', name: '山田 内勤', role: '内勤・目視確認担当', isVerifier: true },
  { id: 'rep-komada', name: '駒田 健', role: '担当FS', personPageId: 'ps-komada' },
  { id: 'rep-miyoshi', name: '三好 玲', role: '担当FS' },
];

export const findTeamMember = (id: string): TeamMember | undefined =>
  TEAM_MEMBERS.find((m) => m.id === id);

/** rep の担当 counterparty 一覧（WIKI_PAGES.salesRep が正）。verifier は空。 */
export function counterpartiesForRep(repId: string): string[] {
  const m = findTeamMember(repId);
  if (!m) return [];
  return WIKI_PAGES.filter((p) => p.salesRep === m.name).map((p) => p.counterparty);
}

/**
 * counterparty を rep でスコープする述語を返す。
 * verifier（山田）は横断的に全件を見るゲート役なので常に true（＝現状の挙動を維持）。
 */
export function makeRepScope(repId: string): (counterparty: string) => boolean {
  const m = findTeamMember(repId);
  if (!m || m.isVerifier) return () => true;
  const set = new Set(counterpartiesForRep(repId));
  return (counterparty: string) => set.has(counterparty);
}
