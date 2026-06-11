import type { InboxItem, InboxSource } from '../types';

// 受信箱のサンプルデータ（架空）。Slack / メール / 予定の原文が入る。
//
// New Version の流れ（HITL: AI送信は全件人の承認が必要）:
//   受信 → ローカル前処理（分かち書き・ルール/辞書マスク・案件自動判定）
//   → 人のレビュー（マスク補正・案件選択）→「承認してAIに渡す」→ AI解析 → タスク化
// ルールが検出した注意点（未マスクの疑い・案件不明）は attention で警告する。
// 予定・会議は「待機中」とし、イベント終了後に議事録がレビュー待ちに入る。

export const SOURCE_META: Record<InboxSource, { icon: string; label: string }> = {
  slack: { icon: '💬', label: 'Slack' },
  mail: { icon: '✉️', label: 'メール' },
  schedule: { icon: '📅', label: '予定' },
};

export const SEED_INBOX: InboxItem[] = [
  // ── レビュー待ち①: 警告あり — 未マスクの疑い（氏名が辞書未登録のまま残っている）──
  {
    id: 'in02',
    source: 'mail',
    title: '解約条項の見直しのお願い',
    sender: '北斗電装 川島 紗英',
    mailTo: '山田 内勤（当社）',
    receivedAt: '2026-06-09T17:20:00',
    body: 'お世話になっております。北斗電装の川島です。\n現行契約 CT-2024-118 の解約条項について、通知期間を90日から45日に短縮いただけないか、社内で要望が出ております。月額120万円の取引規模を踏まえ、ご検討いただけますと幸いです。\n6/13までにご回答いただけますでしょうか。\n川島 紗英（kawashima@hokuto-densou.co.jp / 03-5550-8821）',
    status: 'レビュー待ち',
    attention: [
      '未マスクの疑い: 「川島」が辞書に未登録のまま本文に残っています',
    ],
    counterparty: '北斗電装', // hokuto-densou.co.jp からドメイン自動判定
    masks: [
      // 連絡先・契約番号はパターンで自動マスク済み。氏名だけ人の確認が必要。
      { text: 'kawashima@hokuto-densou.co.jp', type: '連絡先', token: '〔連絡先①〕', auto: true },
      { text: '03-5550-8821', type: '連絡先', token: '〔連絡先②〕', auto: true },
      { text: 'CT-2024-118', type: '契約番号', token: '〔契約番号①〕', auto: true },
    ],
    distilled: {
      category: '契約',
      risk: '高',
      title: '解約条項の短縮依頼に回答',
      counterparty: '北斗電装',
      dueDate: '2026-06-13',
      summary: '北斗電装より解約通知期間の短縮（90日→45日）の要望。6/13までに回答が必要。',
      context: [
        '先方は通知期間90日→45日への短縮を希望',
        '取引規模は月額120万円',
        '当社標準の通知期間は90日',
      ],
      draft:
        '川島様\nお世話になっております。解約条項の件、承りました。通知期間につきましては社内で検討のうえ、6/13までにご回答いたします。対象契約は CT-2024-118 として進めさせていただきます。',
      knownSensitive: ['川島', 'CT-2024-118', 'kawashima@hokuto-densou.co.jp', '03-5550-8821'],
    },
  },

  // ── レビュー待ち②: 警告あり — 案件を特定できない（「例の保守契約」では判断できない）──
  {
    id: 'in10',
    source: 'slack',
    title: '#sales-相談',
    sender: '駒田 健（FS）',
    receivedAt: '2026-06-10T09:40:00',
    body: '先ほど電話があり、例の保守契約更新の件で先方が回答の前倒しを希望しているとのことです。可能か確認して一次返信をお願いします。窓口の方の携帯は 090-1234-5678 です。',
    status: 'レビュー待ち',
    attention: [
      '案件を特定できませんでした（「例の保守契約」が複数の案件に該当する可能性）',
    ],
    counterparty: '', // 人がプロジェクトを選んで承認する
    masks: [
      { text: '090-1234-5678', type: '連絡先', token: '〔連絡先①〕', auto: true },
    ],
    distilled: {
      category: '期限付き返信',
      risk: '低',
      title: '保守契約更新の回答前倒しに返信',
      counterparty: '湊精機',
      dueDate: '2026-06-11',
      summary: '保守契約更新の回答について先方が前倒しを希望。可否を確認して一次返信する。',
      context: ['先方は回答の前倒しを希望', '正式回答の期限は6/12'],
      draft:
        '三浦様\nお世話になっております。更新可否のご回答につきまして、前倒しでのご連絡を検討しております。明日中を目処に一次回答いたします。',
      knownSensitive: ['三浦', '090-1234-5678'],
    },
  },

  // ── 処理済み: 人が承認→AI解析→タスク化まで完了した例 ──
  {
    id: 'in01',
    source: 'slack',
    title: '#sales-湊精機',
    sender: '駒田 健（FS）',
    receivedAt: '2026-06-10T08:40:00',
    body: '湊精機の三浦さんから保守契約の更新可否について連絡あり。年額360万円のままなら継続したい、6/12までに回答がほしいとのこと。対象は保守契約 HSK-2025-007。窓口は三浦さん（miura@minato-seiki.co.jp）です。一次返信お願いします。',
    status: '処理済み',
    processedAt: '2026-06-10T09:00:00',
    approvedBy: '山田 内勤',
    counterparty: '湊精機', // 本文一致で自動判定
    masks: [
      { text: '三浦', type: '氏名', token: '〔氏名①〕', auto: true },
      { text: 'miura@minato-seiki.co.jp', type: '連絡先', token: '〔連絡先①〕', auto: true },
      { text: 'HSK-2025-007', type: '契約番号', token: '〔契約番号①〕', auto: true },
    ],
    resultActionId: 'a09',
    distilled: {
      category: '期限付き返信',
      risk: '低',
      title: '保守契約更新の条件に返信',
      counterparty: '湊精機',
      dueDate: '2026-06-12',
      summary: '湊精機より保守契約（年額360万円）の更新可否の問い合わせ。6/12までに回答する。',
      context: [
        '先方は現行条件（年額360万円）のままの継続を希望',
        '対象契約は HSK-2025-007',
        '窓口は三浦さん（miura@minato-seiki.co.jp）',
      ],
      draft:
        '三浦様\nお世話になっております。保守契約（HSK-2025-007）の更新条件について承知いたしました。年額360万円のまま継続の方向で社内確認のうえ、6/12までに正式にご回答いたします。',
      knownSensitive: ['三浦', 'HSK-2025-007', 'miura@minato-seiki.co.jp'],
    },
  },
  {
    id: 'in03',
    source: 'schedule',
    title: '青葉化成 商談（6/9 14:00）',
    sender: '',
    receivedAt: '2026-06-09T15:00:00',
    eventAt: '2026-06-09T14:00:00',
    eventEnd: '2026-06-09T14:45:00',
    eventType: '商談',
    participants: ['青葉化成 大西部長', '駒田（当社）'],
    location: '青葉化成 会議室B',
    body: '■青葉化成 商談（6/9 14:00-14:45）\n出席: 青葉化成 大西部長、当社 駒田\n議題: 新ライン向け試作データ共有範囲の確認\n・新ラインの試作データ共有は秘密保持契約 NDA-2026-009 の範囲内で実施する方向。\n・大西部長より、共有範囲の確定を6/16までに文書で連絡してほしいと依頼あり。\n・見積りは初期費用80万円・月額15万円で口頭合意。正式見積は別途。',
    status: '処理済み',
    processedAt: '2026-06-10T06:00:00',
    approvedBy: '山田 内勤',
    counterparty: '青葉化成', // 本文一致で自動判定
    masks: [
      { text: '大西', type: '氏名', token: '〔氏名①〕', auto: true },
      { text: 'NDA-2026-009', type: '契約番号', token: '〔契約番号①〕', auto: true },
    ],
    resultActionId: 'a10',
    distilled: {
      category: '法務',
      risk: '高',
      title: '試作データ共有範囲の確定を連絡',
      counterparty: '青葉化成',
      dueDate: '2026-06-16',
      summary: '青葉化成との試作データ共有範囲を確定し、6/16までに文書で連絡する。NDAの範囲確認が必要。',
      context: [
        '共有は NDA-2026-009 の範囲内で実施予定',
        '金額は初期費用80万円・月額15万円で口頭合意',
        '法務への共有範囲の確認が必要',
      ],
      draft:
        '大西様\nお世話になっております。先日の商談で承りました試作データの共有範囲につきまして、秘密保持契約（NDA-2026-009）の範囲を確認のうえ、6/16までに文書でご連絡いたします。',
      knownSensitive: ['大西', 'NDA-2026-009'],
    },
  },
  {
    id: 'in04',
    source: 'mail',
    title: 'お見積もりのご依頼',
    sender: 'C製作所 鈴木 健太',
    mailTo: '山田 内勤（当社）',
    receivedAt: '2026-06-10T05:40:00',
    body: 'お世話になっております。C製作所の鈴木です。\n前回と同数量で、お見積もりをお願いできますでしょうか。納期は2週間を希望します。6/11までに概算をいただけると助かります。\nC製作所 購買部 鈴木 健太',
    status: '処理済み',
    processedAt: '2026-06-10T06:00:00',
    approvedBy: '山田 内勤',
    counterparty: 'C製作所', // メール: ドメイン自動判定
    masks: [{ text: '鈴木', type: '氏名', token: '〔氏名①〕', auto: true }],
    resultActionId: 'a04',
    distilled: {
      category: '期限付き返信',
      risk: '低',
      title: '見積もり依頼に返信',
      counterparty: 'C製作所',
      dueDate: '2026-06-11',
      summary: 'C製作所から見積もり依頼。6/11までに概算金額を返信する。',
      context: ['数量は前回と同等', '納期は2週間を希望'],
      draft:
        '鈴木様\nお世話になっております。お見積もりの件、概算で1台あたり12万円にてご案内いたします。正式なお見積書は明日お送りします。',
      knownSensitive: ['鈴木'],
    },
  },
  // ── レビュー待ち③: 警告なし — 前処理に問題がなく、確認して承認するだけの例 ──
  {
    id: 'in05',
    source: 'slack',
    title: '#sales-general 進捗共有',
    sender: '田村 亮（FS）',
    receivedAt: '2026-06-10T07:15:00',
    body: '先週の商談リスト、Notion に上げました。特にアクション不要ですがご確認ください。',
    status: 'レビュー待ち',
    counterparty: 'G産業',
    masks: [],
    distilled: {
      category: '対応漏れ',
      risk: '低',
      title: '進捗共有（アクション不要）',
      counterparty: '',
      dueDate: '',
      summary: '進捗共有のみ。対応不要。',
      context: [],
      draft: '',
      knownSensitive: [],
    },
  },

  // ── 待機中: 予定・会議。イベント終了後、議事録がレビュー待ちに入る ──
  {
    id: 'in08',
    source: 'schedule',
    title: '社内営業会議',
    sender: '',
    receivedAt: '2026-06-10T09:00:00',
    eventAt: '2026-06-10T09:30:00',
    eventEnd: '2026-06-10T11:00:00',
    eventType: '社内MTG',
    participants: ['近藤（リーダー）', '駒田', '田村', '山田 内勤'],
    location: '第1会議室',
    body: '■社内営業会議（6/10 09:30-11:00）\n出席: 近藤リーダー、駒田、田村、山田\n議題: Q2振り返りと6月商談パイプライン確認\n・各担当案件の状況報告\n・K電機会食の事前準備確認\n・来月の目標設定',
    status: '待機中',
    counterparty: '',
    masks: [],
    distilled: {
      category: '対応漏れ',
      risk: '低',
      title: '営業会議のフォローアップ',
      counterparty: '',
      dueDate: '2026-06-10',
      summary: '社内営業会議の議事録に基づきアクションアイテムをまとめる。',
      context: ['Q2振り返りと6月パイプライン確認', 'K電機会食の事前準備'],
      draft: '',
      knownSensitive: [],
    },
  },
  {
    id: 'in09',
    source: 'schedule',
    title: '田中部長 1on1',
    sender: '',
    receivedAt: '2026-06-10T08:00:00',
    eventAt: '2026-06-10T15:00:00',
    eventEnd: '2026-06-10T16:00:00',
    eventType: '社内MTG',
    participants: ['田中 部長', '山田 内勤'],
    location: '部長室',
    body: '■1on1（6/10 15:00-16:00）\n出席: 田中部長、山田\n目的: 月次業績共有と来月目標設定\n・6月進捗の確認\n・K電機案件の対応方針\n・個人目標の中間レビュー',
    status: '待機中',
    counterparty: '',
    masks: [],
    distilled: {
      category: '対応漏れ',
      risk: '低',
      title: '1on1後のアクションアイテムをまとめる',
      counterparty: '',
      dueDate: '2026-06-10',
      summary: '田中部長との1on1後、合意した行動項目を記録する。',
      context: ['K電機案件の対応方針確認', '個人目標の中間レビュー'],
      draft: '',
      knownSensitive: [],
    },
  },
  {
    id: 'in06',
    source: 'schedule',
    title: 'K電機 会食（6/11 19:00）',
    sender: '',
    receivedAt: '2026-06-10T09:00:00',
    eventAt: '2026-06-11T19:00:00',
    eventEnd: '2026-06-11T21:00:00',
    eventType: '会食',
    participants: ['K電機 田中社長', 'K電機 山本部長', '近藤（当社）', '駒田（当社）'],
    location: '銀座 和食 花むら',
    body: '■K電機 会食（6/11 19:00-21:00）\n場所: 銀座 和食 花むら\n出席: K電機 田中社長・山本部長、当社 近藤・駒田\n会食費用は当社負担（上限3万円）。名刺交換後に追加の商談機会を設けたい意向あり。社内手続き: 接待費申請 IQ-2026-411。',
    status: '待機中',
    counterparty: '',
    masks: [],
    distilled: {
      category: '対応漏れ',
      risk: '低',
      title: '会食後のフォローアップを実施',
      counterparty: 'K電機',
      dueDate: '2026-06-13',
      summary: 'K電機との会食後、次回商談の日程調整とお礼メールを送る。',
      context: [
        '田中社長・山本部長が出席',
        '接待費申請番号 IQ-2026-411',
        '次回商談の機会を打診予定',
      ],
      draft:
        '田中社長\nお世話になっております。昨日はご多忙の中お時間をいただき、誠にありがとうございました。ぜひ次回の商談機会を設けさせていただければと存じます。日程につきましてご都合のよい日時をお知らせいただけますでしょうか。',
      knownSensitive: ['田中', '山本', 'IQ-2026-411'],
    },
  },
  {
    id: 'in07',
    source: 'schedule',
    title: '大阪出張 移動（6/12）',
    sender: '',
    receivedAt: '2026-06-10T08:00:00',
    eventAt: '2026-06-12T08:30:00',
    eventEnd: '2026-06-12T21:00:00',
    eventType: '移動',
    participants: ['駒田（当社）'],
    location: '東京→新大阪（のぞみ103号）/ 阪神精工 本社',
    body: '■大阪出張（6/12 終日）\n新幹線: 東京 8:30 → 新大阪 10:30（のぞみ103号）\n訪問先: 阪神精工 本社（大阪市中央区）\n対応: 伊藤部長との契約更新面談 13:00-14:30\n宿泊: 大阪マリオット 1泊（出張申請 TR-2026-058）',
    status: '待機中',
    counterparty: '',
    masks: [],
    distilled: {
      category: '期限付き返信',
      risk: '低',
      title: '阪神精工との契約更新面談の準備',
      counterparty: '阪神精工',
      dueDate: '2026-06-12',
      summary: '6/12大阪出張。阪神精工 伊藤部長との契約更新面談に向けて提案資料を準備する。',
      context: [
        '面談は13:00-14:30、阪神精工 本社',
        '出張申請番号 TR-2026-058',
        '伊藤部長は現行条件での更新に慎重な意向',
      ],
      draft:
        '伊藤部長\nお世話になっております。6/12の面談に向けて、現行契約の更新条件に関する資料をお持ちいたします。ご確認いただける点について事前にご連絡いただけると幸いです。',
      knownSensitive: ['伊藤', 'TR-2026-058'],
    },
  },
];
