import type { InboxItem, InboxSource } from '../types';
import { tokenize } from '../lib/tokenize';

// Inbox のサンプルデータ（架空）。Slack / メール / 議事録の原文が入る。
// 流れ: 未処理（原文のみ）→ 分かち書き(CPUシミュレート) → マスキング中（タップで伏せる）
//      → AIタスク化(シミュレート) → タスクあり（台帳に Action が生まれる）

export const SOURCE_META: Record<InboxSource, { icon: string; label: string }> = {
  slack: { icon: '💬', label: 'Slack' },
  mail: { icon: '✉️', label: 'メール' },
  minutes: { icon: '📝', label: '議事録' },
};

export const SEED_INBOX: InboxItem[] = [
  {
    id: 'in01',
    source: 'slack',
    title: '#sales-湊精機',
    sender: '駒田 健（FS）',
    receivedAt: '2026-06-10T08:40:00',
    body: '湊精機の三浦さんから保守契約の更新可否について連絡あり。年額360万円のままなら継続したい、6/12までに回答がほしいとのこと。対象は保守契約 HSK-2025-007。窓口は三浦さん（miura@minato-seiki.co.jp）です。一次返信お願いします。',
    status: '未処理',
    aiReady: false,
    counterparty: '', // Slack: 手動選択が必要
    masks: [],
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
    id: 'in02',
    source: 'mail',
    title: '解約条項の見直しのお願い',
    sender: '北斗電装 川島 紗英',
    receivedAt: '2026-06-09T17:20:00',
    body: 'お世話になっております。北斗電装の川島です。\n現行契約 CT-2024-118 の解約条項について、通知期間を90日から45日に短縮いただけないか、社内で要望が出ております。月額120万円の取引規模を踏まえ、ご検討いただけますと幸いです。\n6/13までにご回答いただけますでしょうか。\n川島 紗英（kawashima@hokuto-densou.co.jp / 03-5550-8821）',
    status: '未処理',
    aiReady: false,
    counterparty: '北斗電装', // メール: hokuto-densou.co.jp からドメイン判定
    masks: [],
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
  {
    id: 'in03',
    source: 'minutes',
    title: '青葉化成 定例MTG 議事録（6/9）',
    sender: '議事録bot',
    receivedAt: '2026-06-09T15:00:00',
    body: '■青葉化成 定例（6/9 14:00-14:45）\n出席: 青葉化成 大西部長、当社 駒田\n・新ラインの試作データ共有は秘密保持契約 NDA-2026-009 の範囲内で実施する方向。\n・大西部長より、共有範囲の確定を6/16までに文書で連絡してほしいと依頼あり。\n・見積りは初期費用80万円・月額15万円で口頭合意。正式見積は別途。',
    status: '未処理',
    aiReady: false,
    counterparty: '', // 議事録: 手動選択が必要
    masks: [],
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
        '大西様\nお世話になっております。先日の定例で承りました試作データの共有範囲につきまして、秘密保持契約（NDA-2026-009）の範囲を確認のうえ、6/16までに文書でご連絡いたします。',
      knownSensitive: ['大西', 'NDA-2026-009'],
    },
  },
  // AI Ready 済みだがタスク化不要だった例（アクション抽出なし）。
  {
    id: 'in05',
    source: 'slack',
    title: '#sales-general 進捗共有',
    sender: '田村 亮（FS）',
    receivedAt: '2026-06-10T07:15:00',
    body: '先週の商談リスト、Notion に上げました。特にアクション不要ですがご確認ください。',
    status: 'マスキング中',
    aiReady: true,
    counterparty: 'G産業', // Slack: 手動で選択済みの例
    tokens: tokenize(
      '先週の商談リスト、Notion に上げました。特にアクション不要ですがご確認ください。',
    ),
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
  // 処理済みの例。台帳の a04（C製作所 見積もり依頼）はこのメール由来、という設定。
  {
    id: 'in04',
    source: 'mail',
    title: 'お見積もりのご依頼',
    sender: 'C製作所 鈴木 健太',
    receivedAt: '2026-06-10T05:40:00',
    body: 'お世話になっております。C製作所の鈴木です。\n前回と同数量で、お見積もりをお願いできますでしょうか。納期は2週間を希望します。6/11までに概算をいただけると助かります。\nC製作所 購買部 鈴木 健太',
    status: 'タスクあり',
    aiReady: true,
    counterparty: 'C製作所', // メール: ドメイン判定済み
    tokens: tokenize(
      'お世話になっております。C製作所の鈴木です。\n前回と同数量で、お見積もりをお願いできますでしょうか。納期は2週間を希望します。6/11までに概算をいただけると助かります。\nC製作所 購買部 鈴木 健太',
    ),
    masks: [{ text: '鈴木', type: '氏名', token: '〔氏名①〕' }],
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
];
