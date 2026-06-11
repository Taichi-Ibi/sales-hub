import type { WikiFact, WikiStatement, WikiUpdate } from './wiki';

// 顧客ページ（wiki 層）。案件横断で「この会社と当社の関係」をAIが維持する建て付け。
// facts は deals.ts（CRM由来の構造化情報）と一致させ、statements は顧客視点の
// 直近の状況（出典つき）。Person/Customer Memory に相当する。

export interface CustomerPage {
  id: string;
  name: string; // counterparty と一致させて紐付ける
  industry: string;
  statements: WikiStatement[]; // 取引の現況（出典つき）
  alerts: WikiStatement[];
  facts: WikiFact[];
  relatedProjectIds: string[]; // WIKI_PAGES の id
  keyPersonIds: string[]; // people.ts の id
  updates: WikiUpdate[];
  updatedAt: string; // "2026-06-10"
  lastLintAt: string; // "6/10 06:05"
}

export const CUSTOMER_PAGES: CustomerPage[] = [
  {
    id: 'c-hokuto',
    name: '北斗電装',
    industry: '電装部品メーカー',
    statements: [
      {
        text: '窓口が法務部門（川島氏）に移っており、条件交渉が形式化する傾向。期限を文書で明示する進め方。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      { text: '月間約120万円の継続取引（CT-2024-118）。解約条項（通知期間）の見直し交渉が進行中。' },
    ],
    alerts: [
      {
        text: '条件次第では解約を示唆されており、取引喪失リスクが高まっている',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
    ],
    facts: [
      { label: '業種', value: '電装部品メーカー' },
      { label: '先方窓口', value: '川島 紗英（法務）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買（CT-2024-118）' },
      { label: '月間取引額', value: '約120万円' },
      { label: '解約条項', value: '通知期間90日（45日へ短縮要望あり）' },
    ],
    relatedProjectIds: ['p3'],
    keyPersonIds: ['ps-kawashima'],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート1件（解約示唆による取引喪失リスク）' },
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '窓口の法務部門への移行と交渉スタイルの変化を反映',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
    ],
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
  },
  {
    id: 'c-bshoji',
    name: 'B商事',
    industry: '専門商社（機械部品）',
    statements: [
      {
        text: '年間契約の更新交渉が大詰め。6/17の打ち合わせで最終合意を目指している。',
        source: { label: '議事録 6/3 B商事定例' },
      },
      {
        text: '下期は発注量1割増・価格据え置きの意向。当社の値上げ検討は撤回済み。',
        source: { label: 'Slack 5/28 #sales-b商事' },
      },
    ],
    alerts: [],
    facts: [
      { label: '業種', value: '専門商社（機械部品）' },
      { label: '先方窓口', value: '田中 一郎（営業部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '年間売買基本契約＋個別注文' },
      { label: '年間取引額', value: '約2,400万円' },
      { label: '支払サイト', value: '30日' },
    ],
    relatedProjectIds: ['p1'],
    keyPersonIds: ['ps-tanaka'],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: '矛盾・出典切れなし' },
      { at: '6/10 06:00', kind: '定期更新', summary: '損害賠償上限条項の追記要望（6/5）を反映' },
    ],
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
  },
  {
    id: 'c-dkogyo',
    name: 'D工業',
    industry: '輸送機器メーカー',
    statements: [
      {
        text: '試作データの取り扱いを強く懸念しており、秘密保持の範囲が共同開発の最大の論点。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
      { text: '共同開発キックオフは7月上旬を想定。NDA締結（6/16 WEB会議で最終合意予定）が前提条件。' },
    ],
    alerts: [{ text: 'NDA範囲の合意が未完了のままキックオフ日程が迫っている' }],
    facts: [
      { label: '業種', value: '輸送機器メーカー' },
      { label: '先方窓口', value: '開発企画部（複数名）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '共同開発契約（締結準備中）＋NDA' },
      { label: '関連契約', value: 'NDA-2024-031（更新時期近い）' },
      { label: '与信', value: '良好' },
    ],
    relatedProjectIds: ['p2'],
    keyPersonIds: [],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート1件（NDA範囲未合意）' },
      { at: '6/10 06:00', kind: '定期更新', summary: 'キックオフ前提条件（NDA締結）を反映' },
    ],
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
  },
  {
    id: 'c-minato',
    name: '湊精機',
    industry: '工作機械メーカー',
    statements: [
      {
        text: '現行条件（年額360万円）のままの更新を希望。6/12までに当社回答が必要。',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
      { text: '保守対応の満足度は高く、関係は安定。値上げ余地は小さい印象。' },
    ],
    alerts: [],
    facts: [
      { label: '業種', value: '工作機械メーカー' },
      { label: '先方窓口', value: '三浦（調達部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '保守契約（HSK-2025-007）' },
      { label: '年額', value: '360万円' },
      { label: '更新期日', value: '2026-07-01' },
    ],
    relatedProjectIds: ['p6'],
    keyPersonIds: ['ps-miura'],
    updates: [
      {
        at: '6/10 09:00',
        kind: '取込',
        summary: '保守契約更新の希望条件（現行のまま）を反映',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
      { at: '6/10 06:05', kind: '整合性チェック', summary: '矛盾・出典切れなし' },
    ],
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
  },
  {
    id: 'c-aoba',
    name: '青葉化成',
    industry: '化学メーカー',
    statements: [
      {
        text: '試作データ共有はNDA（NDA-2026-009）の範囲内で実施する方向で合意。共有範囲は6/16までに文書連絡。',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
      {
        text: '見積は初期費用80万円・月額15万円で口頭合意。正式な見積書はNDA締結後に提出予定。',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    alerts: [
      {
        text: '口頭段階の見積に対する正式な書面化が未対応',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    facts: [
      { label: '業種', value: '化学メーカー' },
      { label: '先方窓口', value: '大西部長（生産技術）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: 'NDA（NDA-2026-009）＋見積協議中' },
      { label: '見積（口頭）', value: '初期80万円・月額15万円' },
    ],
    relatedProjectIds: ['p5'],
    keyPersonIds: ['ps-onishi'],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート1件（見積の書面化未対応）' },
      {
        at: '6/10 06:00',
        kind: '取込',
        summary: '商談議事録（6/9）から試作データ共有の合意内容を反映',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
  },
];

export function findCustomerPage(id: string): CustomerPage | undefined {
  return CUSTOMER_PAGES.find((c) => c.id === id);
}
