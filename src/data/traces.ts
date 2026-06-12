// 痕跡（traces/）。②加工を通過した「AI Ready なデータ」の台帳で、
// 商談Wiki・助言の根拠リンク（SourceChip）の参照先になる。
// 受信箱に実体が残っていれば inboxItemId で原文へ遷移できる。
// ④で人がコピーした伝達ログも traces 互換のidで還流する（source: 'relay'）。

export type TraceSource = 'mail' | 'slack' | 'minutes' | 'relay';

export interface Trace {
  id: string;
  label: string; // 例 "メール 6/9「契約条件ご承諾のご連絡」"
  source: TraceSource;
  at: string; // 表示用 "6/9 17:30"
  dealId: string;
  inboxItemId?: string; // 受信箱に実体があれば原文へ遷移できる
  excerpt?: string; // 痕跡の抜粋（マスク済み）
}

export const TRACES: Trace[] = [
  // ── B商事（年間売買契約 更新交渉）──
  {
    id: 'tr-b1',
    label: '議事録 6/3「B商事 定例」',
    source: 'minutes',
    at: '6/3 15:00',
    dealId: 'd-bshoji',
    excerpt: '下期発注量1割増・価格据え置きを軸に、6月中の最終合意を目指すことで一致。',
  },
  {
    id: 'tr-b2',
    label: 'メール 6/9「契約条件ご承諾のご連絡」',
    source: 'mail',
    at: '6/9 17:30',
    dealId: 'd-bshoji',
    inboxItemId: 'in12',
    excerpt: '〔氏名①〕様より、提示済みの更新条件（下期1割増・価格据え置き）を承諾し契約書ドラフトの準備に入りたい旨の連絡。',
  },
  // ── 北斗電装（解約通知期間 短縮交渉）──
  {
    id: 'tr-h1',
    label: 'Slack 6/5「#sales-北斗電装」',
    source: 'slack',
    at: '6/5 11:20',
    dealId: 'd-hokuto',
    excerpt: '調達部門で解約条項（通知期間90日）への不満が強まっているとの情報。',
  },
  {
    id: 'tr-h2',
    label: 'メール 6/9「解約条項の見直しのお願い」',
    source: 'mail',
    at: '6/9 17:20',
    dealId: 'd-hokuto',
    inboxItemId: 'in02',
    excerpt: '通知期間90日→45日への短縮要望。条件次第では解約を示唆。回答期限6/13。',
  },
  // ── G産業（新規提案 製品資料送付）──
  {
    id: 'tr-g1',
    label: '議事録 5/27「G産業 初回商談」',
    source: 'minutes',
    at: '5/27 16:00',
    dealId: 'd-gsangyo',
    excerpt: '製品ラインの説明を実施。先方は社内検討会（6/12）に向けて資料提供を希望。',
  },
  {
    id: 'tr-g2',
    label: 'Slack 6/7「#sales-g産業」',
    source: 'slack',
    at: '6/7 15:00',
    dealId: 'd-gsangyo',
    excerpt: '約束済みの製品資料送付が未対応のまま。6/12の先方社内検討会が迫っている。',
  },
  // ── 湊精機（保守契約 更新）──
  {
    id: 'tr-m1',
    label: 'Slack 6/9「#sales-湊精機」',
    source: 'slack',
    at: '6/9 16:40',
    dealId: 'd-minato',
    inboxItemId: 'in01',
    excerpt: '先方は現行条件（年額360万円）のままの更新を希望。6/12までに回答してほしいとの連絡。',
  },
  {
    id: 'tr-m2',
    label: '議事録 5/20「湊精機 定例」',
    source: 'minutes',
    at: '5/20 14:00',
    dealId: 'd-minato',
    excerpt: '保守対応の満足度は高い。値上げ余地は小さいが、現行条件での継続意向は強い。',
  },
  // ── 受信箱の要確認アイテム（ゲート通過後に助言の根拠になる）──
  {
    id: 'tr-h3',
    label: 'Slack 6/10「#sales-相談」',
    source: 'slack',
    at: '6/10 09:40',
    dealId: 'd-minato',
    inboxItemId: 'in10',
    excerpt: '保守契約更新の回答について、先方が前倒しを希望しているとの連絡。',
  },
];

export function findTrace(id: string): Trace | undefined {
  return TRACES.find((t) => t.id === id);
}
