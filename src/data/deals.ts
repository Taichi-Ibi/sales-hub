// 案件台帳（架空）。①集約・②加工で使うスキーマ層（設定の案件登録・
// 受信箱の案件ピッカー・ドメイン紐付けが参照）。
// 商談Wikiの実体（スナップショット）は data/snapshots.ts にあり、
// counterparty で紐付く。

export interface DealNote {
  date: string; // 表示用 "6/9"
  text: string;
}

export interface Deal {
  counterparty: string; // InboxItem.counterparty / DealEntry.counterparty と一致させて紐付ける
  fields: { label: string; value: string }[]; // 構造化情報
  notes: DealNote[]; // 非構造化情報（AIが追記する「最近の動き」）
  updatedAt: string; // "2026-06-10T06:00:00"
}

export const UPDATE_CYCLE = '毎朝6:00にCRM・メール・議事録から自動更新（モック）';

export const DEALS: Deal[] = [
  {
    counterparty: 'B商事',
    fields: [
      { label: '業種', value: '専門商社（機械部品）' },
      { label: '先方窓口', value: '田中 一郎（営業部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '年間売買基本契約＋個別注文' },
      { label: '年間取引額', value: '約2,400万円' },
      { label: '支払サイト', value: '30日' },
    ],
    notes: [
      { date: '6/9', text: '更新条件（下期1割増・価格据え置き）を先方が承諾。契約書ドラフトへ。' },
      { date: '5/28', text: '下期の発注量を1割増やしたい意向。価格据え置きが条件。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: '北斗電装',
    fields: [
      { label: '業種', value: '電装部品メーカー' },
      { label: '先方窓口', value: '川島 紗英（法務）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買（CT-2024-118）' },
      { label: '月間取引額', value: '約120万円' },
      { label: '解約条項', value: '通知期間90日' },
    ],
    notes: [
      { date: '6/5', text: '調達部門で解約条項（通知期間90日）への不満が強まっているとの情報。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'G産業',
    fields: [
      { label: '業種', value: '建材卸' },
      { label: '先方窓口', value: '高橋 誠（資材部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '新規（提案中）' },
      { label: '先方キーマン', value: '山本課長（決裁者）' },
    ],
    notes: [
      { date: '6/7', text: '製品資料の送付を約束済み（未対応）。6/12に先方社内検討会。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: '湊精機',
    fields: [
      { label: '業種', value: '工作機械メーカー' },
      { label: '先方窓口', value: '三浦（調達部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '保守契約（HSK-2025-007）' },
      { label: '年額', value: '360万円' },
      { label: '更新期日', value: '2026-07-01' },
    ],
    notes: [
      { date: '6/9', text: '現行条件のままの更新を希望。6/12までに回答要。' },
      { date: '5/20', text: '保守対応の満足度は高い。値上げ余地は小さい印象。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
];

export function findDeal(counterparty: string): Deal | undefined {
  return DEALS.find((d) => d.counterparty === counterparty);
}
