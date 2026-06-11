import type { WikiFact, WikiStatement, WikiUpdate } from './wiki';

// 人物ページ（wiki 層）。交渉スタイル・関心事・最終接点を出典つきでAIが維持する建て付け。
// 商談前ブリーフの「関係者」から参照され、担当が変わっても人物知識を引き継げる。
// 登場人物はすべて既存データ（受信箱・案件 wiki・deals）に登場済みの架空の人物のみ。
// 注: wiki 層は目視ゲートを通過した原文のみから生成されるため実名で表示する
// （deals.ts の facts と同じ扱い。タスクの下書きなど外に出る文面ではマスクされる）。

export interface PersonPage {
  id: string;
  name: string;
  affiliation: string; // 例 "北斗電装 法務"
  side: '社内' | '社外';
  role: string; // 例 "窓口" / "決裁者" / "担当FS"
  statements: WikiStatement[]; // 人物メモ（交渉スタイル・関心事。出典つき）
  facts: WikiFact[];
  relatedProjectIds: string[]; // WIKI_PAGES の id
  updates: WikiUpdate[];
}

export const PEOPLE_PAGES: PersonPage[] = [
  {
    id: 'ps-kawashima',
    name: '川島 紗英',
    affiliation: '北斗電装 法務',
    side: '社外',
    role: '窓口',
    statements: [
      {
        text: '法務部門の担当として条項交渉を主導。期限を文書で明示する（6/13回答期限）など、進め方は形式的かつ計画的。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      {
        text: '解約条項の短縮は「社内で要望が出ている」とする伝え方で、本人は関係維持に前向きと見られる。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
    ],
    facts: [
      { label: '決裁権', value: '限定的（法務見解の取りまとめ）' },
      { label: '連絡傾向', value: 'メール中心・期限を明記' },
      { label: '最終接点', value: '6/9 メール' },
    ],
    relatedProjectIds: ['p3'],
    updates: [
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '交渉スタイル（期限の文書明示）を人物メモに反映',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
    ],
  },
  {
    id: 'ps-tanaka',
    name: '田中 一郎',
    affiliation: 'B商事 営業部',
    side: '社外',
    role: '窓口',
    statements: [
      {
        text: '契約条件の交渉窓口。修正依頼は条項単位で具体的。社内（田中部長）への根回しを重視する。',
        source: { label: 'メール 6/5「契約書第3条の修正のお願い」' },
      },
      { text: '下期の発注量1割増の意向を早めに共有してくるなど、当社との取引拡大に前向き。' },
    ],
    facts: [
      { label: '決裁権', value: 'なし（部長決裁）' },
      { label: '連絡傾向', value: 'メール中心・返信は早い' },
      { label: '最終接点', value: '6/5 メール' },
    ],
    relatedProjectIds: ['p1'],
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: '損害賠償上限条項の依頼経緯を人物メモに反映' },
    ],
  },
  {
    id: 'ps-onishi',
    name: '大西部長',
    affiliation: '青葉化成 生産技術',
    side: '社外',
    role: '決裁者・窓口',
    statements: [
      {
        text: '商談での口頭合意を重視しつつ、結論は文書で確認する進め方。共有範囲の確定を6/16までに文書で連絡するよう依頼。',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
      { text: '見積（初期80万円・月額15万円）を商談の場で即断しており、決裁スピードは速い。' },
    ],
    facts: [
      { label: '決裁権', value: 'あり（生産技術領域）' },
      { label: '連絡傾向', value: '対面・商談中心' },
      { label: '最終接点', value: '6/9 商談' },
    ],
    relatedProjectIds: ['p5'],
    updates: [
      {
        at: '6/10 06:00',
        kind: '取込',
        summary: '商談議事録（6/9）から決裁スタイルを人物メモに反映',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
  },
  {
    id: 'ps-miura',
    name: '三浦',
    affiliation: '湊精機 調達部',
    side: '社外',
    role: '窓口',
    statements: [
      {
        text: '現行条件（年額360万円）での更新を希望。回答の前倒しを求めるなど、社内手続きの段取りを重視する。',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
      { text: '保守対応への満足度は高く、当社への信頼は厚い。' },
    ],
    facts: [
      { label: '決裁権', value: '不明（調達部の取りまとめ役）' },
      { label: '連絡傾向', value: '電話・メール併用' },
      { label: '最終接点', value: '6/10 電話（Slack経由で共有）' },
    ],
    relatedProjectIds: ['p6'],
    updates: [
      {
        at: '6/10 09:00',
        kind: '取込',
        summary: '更新希望条件と回答前倒しの意向を人物メモに反映',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
    ],
  },
  {
    id: 'ps-yamamoto',
    name: '山本課長',
    affiliation: 'G産業',
    side: '社外',
    role: '決裁者（キーマン）',
    statements: [
      {
        text: '新規提案の決裁者。資料送付の遅れを気にしているとの情報があり、窓口（高橋氏）経由に加えて直接アプローチが有効と見られる。',
        source: { label: 'Slack 6/7 #sales-g産業' },
      },
    ],
    facts: [
      { label: '決裁権', value: 'あり' },
      { label: '注意点', value: 'レスポンスの遅れに敏感' },
      { label: '最終接点', value: '6/7（窓口経由の言及）' },
    ],
    relatedProjectIds: ['p4'],
    updates: [
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '資料送付遅延への反応を人物メモに反映',
        source: { label: 'Slack 6/7 #sales-g産業' },
      },
    ],
  },
  {
    id: 'ps-komada',
    name: '駒田 健',
    affiliation: '当社 営業部',
    side: '社内',
    role: '担当FS（フィールドセールス）',
    statements: [
      { text: 'B商事・D工業・G産業・青葉化成・湊精機の主要5案件を担当。Slackでの一次情報共有が早い。' },
      { text: '商談・電話の合間に依頼を投げる割り込み型の働き方のため、依頼の取りこぼし防止が課題。' },
    ],
    facts: [
      { label: '担当案件数', value: '5件' },
      { label: '連絡傾向', value: 'Slack中心' },
    ],
    relatedProjectIds: ['p1', 'p2', 'p4', 'p5', 'p6'],
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: '担当案件リストを再生成' },
    ],
  },
];

export function findPersonPage(id: string): PersonPage | undefined {
  return PEOPLE_PAGES.find((p) => p.id === id);
}

/** 参加者表記（例 "北斗電装 川島 紗英"）から人物ページを引き当てる。 */
export function findPersonByLabel(label: string): PersonPage | undefined {
  return PEOPLE_PAGES.find((p) => label.includes(p.name));
}
