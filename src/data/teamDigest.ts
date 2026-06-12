import type { SourceRef } from './wiki';

// チームダイジェスト（組織の神経系）。個人の朝刊（DAILY_DIGEST）に対し、
// 「昨日チーム全体で何が動いた／止まっている／詰まっているか」をメンバー横断でまとめる。
// マネージャー視点の朝刊だが本物の権限はなく、視点切り替えとは独立に組織全体を映す。
// すべて既存の案件 wiki・受信箱・意思決定・シグナルの言い換えで、出典つき。

/** 動いた／停滞の1項目。repId でメンバー別にグルーピングする。 */
export interface TeamDigestItem {
  repId: string; // team.ts の TeamMember.id
  counterparty?: string;
  text: string;
  ref?: SourceRef;
  link?: { label: string; to: string };
  elapsedLabel?: string; // 停滞用 "≥72h" 等。危険系の色で表示
}

/** 詰まり = 横断シグナル参照（signals.ts を id で解決）。 */
export interface TeamSignalRef {
  signalId: string; // 'sg1' | 'sg2' | 'sg3'
  text: string; // 1行要約
}

/** チームの意思決定（owner=rep で並べる。状態はストアからライブ解決）。 */
export interface TeamDecisionRef {
  repId: string;
  decisionId: string; // decisions.ts の id
  note: string;
}

export interface TeamDigest {
  date: string;
  generatedAt: string;
  headline: string;
  moved: TeamDigestItem[]; // 動いた（進捗）
  stalled: TeamDigestItem[]; // 停滞（止まっている / 72h 以上反応なし）
  stuck: TeamSignalRef[]; // 詰まり（横断シグナル）
  decisions: TeamDecisionRef[]; // チームの意思決定（提案中/決定済み）
}

export const TEAM_DIGEST: TeamDigest = {
  date: '2026-06-10',
  generatedAt: '6/10 06:00',
  headline:
    'チーム全体で昨日3件が前進、2件が停滞しています。横断シグナルが3件、判断待ちの論点が2件。',
  moved: [
    {
      repId: 'rep-komada',
      counterparty: '青葉化成',
      text: '青葉化成 商談（6/9）の議事録を取込。試作データ共有はNDA範囲内で実施する方向で合意。',
      ref: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      link: { label: '案件: 青葉化成', to: '/projects/p5' },
    },
    {
      repId: 'rep-komada',
      counterparty: '湊精機',
      text: '湊精機から保守契約更新の回答前倒しの打診。現行条件での更新を希望する意向。',
      ref: { label: 'Slack 6/10「#sales-湊精機」', inboxItemId: 'in01' },
      link: { label: '案件: 湊精機', to: '/projects/p6' },
    },
    {
      repId: 'rep-miyoshi',
      counterparty: '北斗電装',
      text: '北斗電装から解約条項（通知期間90日→45日）の見直し依頼を受領。今日10:30の定例で感触を確認予定。',
      ref: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      link: { label: '案件: 北斗電装', to: '/projects/p3' },
    },
  ],
  stalled: [
    {
      repId: 'rep-komada',
      counterparty: 'D工業',
      text: 'D工業: NDA合意の前提となる機密保持範囲の法務確認が停滞。期限6/11が明日に迫る。',
      ref: { label: '議事録 6/6 D工業 共同開発定例' },
      link: { label: '案件: D工業', to: '/projects/p2' },
      elapsedLabel: '4日経過',
    },
    {
      repId: 'rep-miyoshi',
      counterparty: 'A社',
      text: 'A社: NDAの先方ひな形の法務確認依頼が対応中のまま3日経過。',
      ref: { label: 'Slack 6/7「#sales-a社」' },
      link: { label: '案件: A社', to: '/projects/p7' },
      elapsedLabel: '3日経過',
    },
  ],
  stuck: [
    { signalId: 'sg1', text: '解約通知期間の短縮要望が複数社（北斗電装・K商会）で発生し、増加傾向。' },
    { signalId: 'sg2', text: '「NDAに試作データを含めるか」が3案件で繰り返し発生。' },
    { signalId: 'sg3', text: '法務確認の滞留（3件並行・待ち平均2日超）がチームのボトルネック。' },
  ],
  decisions: [
    { repId: 'rep-miyoshi', decisionId: 'd1', note: '解約通知期間 90→45日要望への回答方針。期限6/13。' },
    { repId: 'rep-komada', decisionId: 'd2', note: 'D工業 機密保持範囲。法務確認（6/11）が前提。' },
  ],
};
