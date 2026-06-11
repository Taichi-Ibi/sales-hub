import type { SourceRef, WikiUpdate } from './wiki';

// シグナルページ（wiki 層）。単一案件では見えない横断的な傾向
// （兆候・繰り返しの質問・ボトルネック）をAIが検出して維持する建て付け。
// すべて既存の案件・受信箱のストーリーから導出された横断観測。

export type SignalKind = '兆候' | '繰り返しの質問' | 'ボトルネック';

export interface SignalEvidence {
  at: string; // 表示用 "6/9"
  text: string;
  source?: SourceRef;
  counterparty?: string;
}

export interface SignalPage {
  id: string;
  kind: SignalKind;
  title: string;
  summary: string;
  count: number; // 観測回数
  windowLabel: string; // 例 "直近30日"
  trend: '増加' | '横ばい' | '減少';
  evidences: SignalEvidence[];
  relatedCounterparties: string[];
  relatedDecisionIds?: string[]; // decisions.ts の id
  suggestion: string; // AIの提案（建て付け）
  updates: WikiUpdate[];
  firstSeen: string; // 表示用 "6/5"
  lastSeen: string;
}

// 種別はアイコンとラベルで区別する。背景はニュートラルに統一（色の乱立を避ける）。
export const SIGNAL_KIND_META: Record<SignalKind, { icon: string; cls: string }> = {
  兆候: { icon: '📈', cls: 'bg-surface text-ink-sub' },
  繰り返しの質問: { icon: '🔁', cls: 'bg-surface text-ink-sub' },
  ボトルネック: { icon: '🚧', cls: 'bg-surface text-ink-sub' },
};

export const SIGNAL_PAGES: SignalPage[] = [
  {
    id: 'sg1',
    kind: '兆候',
    title: '解約通知期間の短縮要望が複数社で発生',
    summary:
      '当社標準の解約通知期間（90日）に対する短縮要望が、直近30日で2社から発生。先方の経営環境変化（資金繰り・調達方針）が背景にあると見られ、同型の交渉が今後も増える兆候。',
    count: 2,
    windowLabel: '直近30日',
    trend: '増加',
    evidences: [
      {
        at: '6/9',
        text: '北斗電装より通知期間 90日→45日への短縮要望（回答期限 6/13）',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
        counterparty: '北斗電装',
      },
      {
        at: '6/5',
        text: 'K商会より通知期間 90日→30日への短縮要望（60日折衷案で打診中）',
        source: { label: 'メール 6/5「解約条項の見直しのご相談」' },
        counterparty: 'K商会',
      },
    ],
    relatedCounterparties: ['北斗電装', 'K商会'],
    relatedDecisionIds: ['d1', 'd3'],
    suggestion:
      '標準解約条項（通知期間90日）への短縮要望が続いています。社内のリスク管理上の最低ラインを定義し、標準条項の改定可否を法務・管理部門と検討することを提案します。',
    updates: [
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '北斗電装の要望を2件目の観測として追加（増加判定）',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      { at: '6/5 08:05', kind: '取込', summary: 'K商会の短縮要望を初回観測として登録' },
    ],
    firstSeen: '6/5',
    lastSeen: '6/9',
  },
  {
    id: 'sg2',
    kind: '繰り返しの質問',
    title: '「NDAに試作データを含めるか」が3案件で発生',
    summary:
      '試作データを秘密保持の対象範囲に含めるかという同型の論点が、D工業・青葉化成・L工業の3案件で発生。案件ごとに法務へ個別確認しており、回答の度に同じ検討を繰り返している。',
    count: 3,
    windowLabel: '直近30日',
    trend: '増加',
    evidences: [
      {
        at: '6/9',
        text: '青葉化成: 試作データ共有はNDA-2026-009の範囲内で実施する方向。範囲の文書化が必要',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
        counterparty: '青葉化成',
      },
      {
        at: '6/8',
        text: 'L工業: 機密情報の共有は設計仕様の一部に限定する方向でFS承認',
        source: { label: 'L工業 技術打合せ（6/8）' },
        counterparty: 'L工業',
      },
      {
        at: '6/6',
        text: 'D工業: 試作データの取り扱いを懸念。対象範囲の法務確認を依頼',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
        counterparty: 'D工業',
      },
    ],
    relatedCounterparties: ['D工業', '青葉化成', 'L工業'],
    relatedDecisionIds: ['d2'],
    suggestion:
      '試作データの取り扱いについて標準ガイドライン（NDA標準条項＋運用覚書のひな形）を法務と整備すると、案件ごとの個別確認を削減できます。',
    updates: [
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '青葉化成の事例を3件目の観測として追加',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    firstSeen: '6/6',
    lastSeen: '6/9',
  },
  {
    id: 'sg3',
    kind: 'ボトルネック',
    title: '法務確認の滞留',
    summary:
      '法務確認を要するタスクが3件並行しており、平均待ち時間が2日を超えている。D工業の確認期限（6/11）は超過リスクがあり、案件側のスケジュール（NDA合意・キックオフ）を圧迫している。',
    count: 3,
    windowLabel: '進行中',
    trend: '横ばい',
    evidences: [
      {
        at: '6/6',
        text: 'D工業: 機密保持範囲の確認（期限6/11）が4日経過しても未完了',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
        counterparty: 'D工業',
      },
      {
        at: '6/7',
        text: 'A社: NDAひな形の確認依頼が対応中のまま3日経過',
        source: { label: 'Slack 6/7 #sales-a社' },
        counterparty: 'A社',
      },
      {
        at: '6/9',
        text: '青葉化成: 試作データ共有範囲の法務確認が新たに発生（期限6/16）',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
        counterparty: '青葉化成',
      },
    ],
    relatedCounterparties: ['D工業', 'A社', '青葉化成'],
    relatedDecisionIds: ['d2'],
    suggestion:
      '定型NDA・標準条項の確認について、法務とファストレーン（当日回答枠）を設定することを提案します。非定型案件に法務リソースを集中できます。',
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: '青葉化成の法務確認を3件目として追加（滞留継続）' },
    ],
    firstSeen: '6/6',
    lastSeen: '6/9',
  },
];

export function findSignalPage(id: string): SignalPage | undefined {
  return SIGNAL_PAGES.find((s) => s.id === id);
}
