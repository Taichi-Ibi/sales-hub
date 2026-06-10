// 案件プロパティ（架空）。取引先ごとの「構造化情報＋非構造化メモ」。
// 本番では CRM・メール・議事録から定期バッチで自動更新されるイメージ
// （updatedAt と UPDATE_CYCLE で表現）。モックでは静的データ。

export interface DealNote {
  date: string; // 表示用 "6/9"
  text: string;
}

export interface Deal {
  counterparty: string; // Action.counterparty と一致させて紐付ける
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
      { date: '6/5', text: '契約書3条（損害賠償上限）の追記を希望。過去の類似案件では承諾実績あり。' },
      { date: '5/28', text: '下期の発注量を1割増やしたい意向。価格据え置きが条件。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'D工業',
    fields: [
      { label: '業種', value: '輸送機器メーカー' },
      { label: '先方窓口', value: '開発企画部（複数名）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '共同開発契約（締結準備中）＋NDA' },
      { label: '関連契約', value: 'NDA-2024-031（更新時期近い）' },
      { label: '与信', value: '良好' },
    ],
    notes: [
      { date: '6/6', text: '試作データの取り扱いを強く懸念。秘密保持の対象範囲が論点。' },
      { date: '5/30', text: '共同開発のキックオフは7月上旬を想定。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'A社',
    fields: [
      { label: '業種', value: 'ITサービス' },
      { label: '先方窓口', value: '佐藤 花子（購買）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: 'NDA締結前（先方ひな形を受領）' },
    ],
    notes: [{ date: '6/7', text: 'NDAひな形は標準的。法務確認のうえ締結見込み。' }],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'C製作所',
    fields: [
      { label: '業種', value: '精密機器メーカー' },
      { label: '先方窓口', value: '鈴木 健太（購買部）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '個別注文（リピート）' },
      { label: '直近単価', value: '1台あたり12万円' },
      { label: '支払サイト', value: '30日' },
    ],
    notes: [
      { date: '6/10', text: '前回と同数量の見積もり依頼。納期2週間希望。' },
      { date: '4/15', text: '前回納品はトラブルなし。継続発注の意向。' },
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
    counterparty: 'H社',
    fields: [
      { label: '業種', value: '食品メーカー' },
      { label: '先方窓口', value: '伊藤 直樹（総務）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '保守契約（年間）' },
    ],
    notes: [{ date: '6/9', text: '6/11予定だった訪問は先方都合でリスケ。来週前半で再調整中。' }],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'I物産',
    fields: [
      { label: '業種', value: '総合商社' },
      { label: '先方窓口', value: '渡辺 隆（経理部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '継続売買（月次）' },
      { label: '月間取引額', value: '約300万円' },
      { label: '支払サイト', value: '30日（60日へ変更打診中）' },
      { label: '与信', value: '良好' },
    ],
    notes: [
      { date: '6/8', text: '資金繰りを理由に支払サイト延長（30→60日）を打診。取引規模は維持の意向。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'J社',
    fields: [
      { label: '業種', value: '物流' },
      { label: '先方窓口', value: '中村 彩（情報システム）' },
      { label: '当社担当FS', value: '未アサイン' },
      { label: '契約形態', value: '新規（問い合わせ段階）' },
    ],
    notes: [{ date: '6/9', text: '新規導入の相談。具体要件はこれからヒアリング。' }],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'K商会',
    fields: [
      { label: '業種', value: '化学品卸' },
      { label: '先方窓口', value: '小林 大輔（管理部）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買（年間）' },
      { label: '解約条項', value: '通知期間90日（当社標準）' },
    ],
    notes: [
      { date: '6/5', text: '解約通知期間の短縮（90→30日）を希望。60日の折衷案で調整中。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'L工業',
    fields: [
      { label: '業種', value: '産業機械メーカー' },
      { label: '先方窓口', value: '加藤 浩二（設計部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: 'NDA（NDA-2024-042）＋個別開発' },
    ],
    notes: [
      { date: '6/8', text: '機密情報の共有は設計仕様の一部に限定する方向でFS承認済み。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'E社',
    fields: [
      { label: '業種', value: '小売' },
      { label: '先方窓口', value: '松本 由美（店舗開発）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買' },
    ],
    notes: [{ date: '6/9', text: '6/18(木)14:00 打ち合わせ確定。' }],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: 'F社',
    fields: [
      { label: '業種', value: '印刷' },
      { label: '先方窓口', value: '木村 翔（企画）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '継続売買' },
    ],
    notes: [{ date: '6/8', text: '資料は担当が電話確認のうえ直接送付済み。催促タスクは棄却。' }],
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
      { date: '6/10', text: '現行条件のままの更新を希望。6/12までに回答要。' },
      { date: '5/20', text: '保守対応の満足度は高い。値上げ余地は小さい印象。' },
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
      { label: '解約条項', value: '通知期間90日（45日へ短縮要望あり）' },
    ],
    notes: [
      { date: '6/9', text: '解約通知期間の短縮要望はリスク高。FS・法務の判断が必要。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
  {
    counterparty: '青葉化成',
    fields: [
      { label: '業種', value: '化学メーカー' },
      { label: '先方窓口', value: '大西部長（生産技術）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: 'NDA（NDA-2026-009）＋見積協議中' },
      { label: '見積（口頭）', value: '初期80万円・月額15万円' },
    ],
    notes: [
      { date: '6/9', text: '試作データ共有はNDA範囲内で実施方向。共有範囲を6/16までに文書連絡。' },
    ],
    updatedAt: '2026-06-10T06:00:00',
  },
];

export function findDeal(counterparty: string): Deal | undefined {
  return DEALS.find((d) => d.counterparty === counterparty);
}
