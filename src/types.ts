// ドメイン型定義（仕様書 §8.1）。

export type Category = '法務' | '契約' | '期限付き返信' | '対応漏れ';

export type Risk = '高' | '低';

export type Status = '未確認' | '対応中' | 'FS承認待ち' | '承認済み' | '送信済み' | '棄却';

// マスク種別。トークン名にそのまま使うため、AI/人間どちらが見ても
// プレースホルダの役割が分かる短い語にする（例 〔氏名①〕〔会社①〕）。
export type MaskType = '氏名' | '会社' | '連絡先' | '契約番号';

export interface MaskedEntity {
  token: string; // 例 "〔人物①〕"
  type: MaskType;
  decryptedValue: string; // 例 "田中 一郎"（IS閲覧用）
  occurrences: number;
}

// ───────── Inbox（IS向け受信箱） ─────────
// Slack/メール/予定の原文が入り、分かち書き(CPU)→人手マスキング→AIタスク化 と進む。
// マスキングは Inbox 内の原文に対して行い、台帳側では復元のみを行う。

export type InboxSource = 'slack' | 'mail' | 'schedule';

// 分かち書き・AI解析の実行中はページ側の一時状態で表現し、status には持たない。
export type InboxStatus = '未処理' | 'マスキング中' | 'タスクあり' | 'キャンセル';

export interface InboxMask {
  text: string; // 分かち書きトークンの文字列。同一文字列は一括で同じトークンに置換
  type: MaskType;
  token: string; // 例 "〔氏名①〕"
  excludedIndices?: number[]; // 個別に復元されたトークン開始位置（その位置だけチップを非表示）
}

// AIが「経緯を読み取ってタスク化」した結果のシミュレート用シード。
// draft 等は原文（マスク前）で持ち、タスク化時に Inbox のマスクを適用する。
export interface DistilledSeed {
  category: Category;
  risk: Risk;
  title: string;
  counterparty: string;
  dueDate: string;
  summary: string;
  context: string[];
  draft: string;
  knownSensitive: string[]; // 本来マスクすべき語。未マスクのままなら「未マスクの疑い」へ
}

export interface InboxItem {
  id: string;
  source: InboxSource;
  title: string; // 件名 / チャンネル / 会議名
  sender: string; // 送信者・起票者
  receivedAt: string; // "2026-06-10T08:40:00"
  body: string; // 原文
  status: InboxStatus;
  aiReady: boolean; // AI が安全に読める状態（マスク済み・案件選択済み）か。タスク化とは独立
  counterparty: string; // 案件名。メール: ドメインから自動判定。Slack/予定: 手動選択
  tokens?: string[]; // 分かち書き結果（CPU実行のシミュレート完了後にセット）
  masks: InboxMask[];
  resultActionId?: string; // タスク化で生成された Action
  distilled: DistilledSeed;
  // 予定・会議専用メタ情報（任意）
  eventAt?: string; // イベント開始日時 "2026-06-11T19:00:00"
  eventEnd?: string; // イベント終了日時（任意）
  participants?: string[]; // 参加者名
  location?: string; // 場所・会場
  eventType?: '商談' | '会食' | '移動' | '社内MTG' | 'その他';
  // メール専用（任意）
  mailTo?: string; // 受信者（宛先）
  // ユーザーメモ（任意）
  memo?: string;
}

// タスクの出どころ（経緯ドリルダウン用）。原文の抜粋を Action 自身が持ち、
// Inbox に実体が残っていれば inboxItemId で遷移できる。
// body は原文（マスク前）。表示時に maskedEntities を適用してチップにする。
export interface ActionOrigin {
  source: InboxSource;
  title: string;
  sender: string;
  receivedAt: string;
  body: string;
  inboxItemId?: string;
}

export interface Action {
  id: string;
  category: Category;
  risk: Risk;
  title: string; // 蒸留された一文
  counterparty: string; // 取引先（架空）
  dueDate: string; // "2026-06-12"
  createdAt: string; // 経過の基準。"2026-06-05T09:00:00"
  status: Status;
  summary: string; // 要約 1〜2行
  context: string[]; // 背景の箇条書き
  draft: string; // 下書き本文（トークン埋め込み）
  maskedEntities: MaskedEntity[];
  suspectedUnmasked: string[]; // 未マスクの疑い文字列
  origin?: ActionOrigin; // 経緯: 元になった原文（Slack/メール/議事録）
  // S4/S5 表示用の補助情報（任意）
  handedOffLabel?: string; // 例 "FSへ回した: 1時間前"
  completedDate?: string; // 例 "6/9"
}
