import type { InboxItem, InboxSource } from '../types';

// 受信箱のサンプルデータ（架空）。Slack / メールの原文が入る。
//
// 逆V字の②加工（目視ゲート: 機密がないことを保証できるのは人間のみ）:
//   受信 → ローカル前処理（分かち書き・ルール/辞書マスク・案件自動判定）
//   → 人が全件目視確認（要確認）→「確認してAIに渡す」→ AI解析
//   → 痕跡として商談Wikiへ取込（→ 差分から新しい助言が生成される）
// ロジックの警告（未マスクの疑い・案件不明）は attention で表示し、目視を速くする。

export const SOURCE_META: Record<InboxSource, { icon: string; label: string }> = {
  slack: { icon: '💬', label: 'Slack' },
  mail: { icon: '✉️', label: 'メール' },
};

export const SEED_INBOX: InboxItem[] = [
  // ── 要確認①: 警告あり — 未マスクの疑い（氏名が辞書未登録）──
  // ゲート通過で 北斗電装 のWikiが更新され、助言「ヨミ変化（確度低下）」が生成されるデモの主役。
  {
    id: 'in02',
    source: 'mail',
    title: '解約条項の見直しのお願い',
    sender: '北斗電装 川島 紗英',
    mailTo: '山田 内勤（当社）',
    receivedAt: '2026-06-09T17:20:00',
    body: 'お世話になっております。北斗電装の川島です。\n現行契約 CT-2024-118 の解約条項について、通知期間を90日から45日に短縮いただけないか、社内で要望が出ております。月額120万円の取引規模を踏まえ、ご検討いただけますと幸いです。\n6/13までにご回答いただけますでしょうか。\n川島 紗英（kawashima@hokuto-densou.co.jp / 03-5550-8821）',
    status: '要確認',
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
    knownSensitive: ['川島', 'CT-2024-118', 'kawashima@hokuto-densou.co.jp', '03-5550-8821'],
    ingest: {
      dealId: 'd-hokuto',
      wikiLines: [
        '6/9 解約通知期間の短縮要望（90日→45日）を正式に受領。条件次第では解約を示唆。回答期限は6/13。',
      ],
      adviceId: 'in02',
    },
  },

  // ── 要確認②: 警告なし — 自動マスクに問題はないが、目視確認は全件必須 ──
  {
    id: 'in05',
    source: 'slack',
    title: '#sales-general 進捗共有',
    sender: '田村 亮（FS）',
    receivedAt: '2026-06-10T07:15:00',
    body: '先週の商談リスト、Notion に上げました。特にアクション不要ですがご確認ください。',
    status: '要確認',
    counterparty: 'G産業',
    masks: [],
    knownSensitive: [],
    ingest: {
      dealId: 'd-gsangyo',
      wikiLines: [],
      analysisNote: 'Wiki更新なし（共有のみ）',
    },
  },

  // ── 要確認③: 警告あり — 案件を特定できない（「例の保守契約」では判断できない）──
  {
    id: 'in10',
    source: 'slack',
    title: '#sales-相談',
    sender: '駒田 健（FS）',
    receivedAt: '2026-06-10T09:40:00',
    body: '先ほど電話があり、例の保守契約更新の件で先方が回答の前倒しを希望しているとのことです。可能か確認して一次返信をお願いします。窓口の方の携帯は 090-1234-5678 です。',
    status: '要確認',
    attention: [
      '案件を特定できませんでした（「例の保守契約」が複数の案件に該当する可能性）',
    ],
    counterparty: '', // 人がプロジェクトを選んでAIに渡す
    masks: [
      { text: '090-1234-5678', type: '連絡先', token: '〔連絡先①〕', auto: true },
    ],
    knownSensitive: ['090-1234-5678'],
    ingest: {
      dealId: '', // 人が選んだ案件（counterparty）から解決する
      wikiLines: ['6/10 先方が更新回答の前倒しを希望しているとの連絡（電話・Slack経由）。'],
      adviceId: 'in10',
    },
  },

  // ── 処理済み: 人が目視確認→AI解析→Wiki取込まで完了した例（= 痕跡）──
  {
    id: 'in12',
    source: 'mail',
    title: '契約条件ご承諾のご連絡',
    sender: 'B商事 田中 一郎',
    mailTo: '駒田 健（当社）',
    receivedAt: '2026-06-09T17:30:00',
    body: 'お世話になっております。B商事の田中です。\nご提示いただいた年間売買契約の更新条件（下期発注量1割増・価格据え置き）につきまして、社内承認が取れましたのでお受けいたします。\nつきましては契約書ドラフトの準備をお願いできますでしょうか。6/17のお打ち合わせで条文の最終確認をできればと存じます。\n田中 一郎（tanaka@b-shoji.co.jp）',
    status: '処理済み',
    processedAt: '2026-06-09T17:50:00',
    verifiedBy: '山田 内勤',
    counterparty: 'B商事', // b-shoji.co.jp からドメイン自動判定
    masks: [
      { text: '田中', type: '氏名', token: '〔氏名①〕', auto: true },
      { text: 'tanaka@b-shoji.co.jp', type: '連絡先', token: '〔連絡先①〕', auto: true },
    ],
    knownSensitive: ['田中', 'tanaka@b-shoji.co.jp'],
    analysisNote: 'Wiki更新（契約フェーズへ移行）→ 助言生成',
    ingest: {
      dealId: 'd-bshoji',
      wikiLines: [],
    },
  },
  {
    id: 'in01',
    source: 'slack',
    title: '#sales-湊精機',
    sender: '駒田 健（FS）',
    receivedAt: '2026-06-09T16:40:00',
    body: '湊精機の三浦さんから保守契約の更新可否について連絡あり。年額360万円のままなら継続したい、6/12までに回答がほしいとのこと。対象は保守契約 HSK-2025-007。窓口は三浦さん（miura@minato-seiki.co.jp）です。一次返信お願いします。',
    status: '処理済み',
    processedAt: '2026-06-09T17:00:00',
    verifiedBy: '山田 内勤',
    counterparty: '湊精機', // 本文一致で自動判定
    masks: [
      { text: '三浦', type: '氏名', token: '〔氏名①〕', auto: true },
      { text: 'miura@minato-seiki.co.jp', type: '連絡先', token: '〔連絡先①〕', auto: true },
      { text: 'HSK-2025-007', type: '契約番号', token: '〔契約番号①〕', auto: true },
    ],
    knownSensitive: ['三浦', 'HSK-2025-007', 'miura@minato-seiki.co.jp'],
    analysisNote: 'Wiki更新（確度 70→85）→ 助言生成',
    ingest: {
      dealId: 'd-minato',
      wikiLines: [],
    },
  },
];
