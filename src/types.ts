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
// Slack/メール/議事録の原文が入り、分かち書き(CPU)→人手マスキング→AIタスク化 と進む。
// マスキングは Inbox 内の原文に対して行い、台帳側では復元のみを行う。

export type InboxSource = 'slack' | 'mail' | 'minutes';

// 分かち書き・AI解析の実行中はページ側の一時状態で表現し、status には持たない。
export type InboxStatus = '未処理' | 'マスキング中' | 'タスク化済み';

export interface InboxMask {
  text: string; // 分かち書きトークンの文字列。同一文字列は一括で同じトークンに置換
  type: MaskType;
  token: string; // 例 "〔氏名①〕"
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
  tokens?: string[]; // 分かち書き結果（CPU実行のシミュレート完了後にセット）
  masks: InboxMask[];
  resultActionId?: string; // タスク化で生成された Action
  distilled: DistilledSeed;
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
  // S4/S5 表示用の補助情報（任意）
  handedOffLabel?: string; // 例 "FSへ回した: 1時間前"
  completedDate?: string; // 例 "6/9"
}
