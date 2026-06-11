// ドメイン型定義。
// New Version: 「raw（受信箱）→ wiki（案件ページ）→ ビュー（今日/待ち/済み）」の3層構造。
// セキュリティ原則: 機密情報がないことを保証できるのは人間のみ。
// すべてのデータは、ロジック（パターン・辞書）の自動マスクで下ごしらえした上で、
// **人が全件目視確認**してからAIに渡す。ロジックは確認を速くする補助であり、
// ゲートの通過判定は常に人が行う。

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

// ───────── 受信箱（raw 層 / マスキング目視ゲート） ─────────
// Slack/メール/予定の原文が入る。ローカル前処理（分かち書き・ルール/辞書による
// 自動マスク・案件の自動判定）はデータを外に出さずに自動で行う。
// **目視ゲート（全件必須）**: 機密情報がないことを保証できるのは人間のみ。
// すべてのアイテムは人が目視確認して「確認してAIに渡す」を押すまでAIに送信されない。
// ロジックが検出した注意点（辞書未登録の氏名・案件不明など）は `attention` で
// 警告し、目視確認を速くする。
//
//   待機中   : 予定・会議。イベント終了後、議事録がゲートに入る
//   要確認   : 目視確認待ち（AI送信前）。人がマスク補正・案件選択をしてAIに渡す
//   処理済み : 目視確認→AI解析が完了。確認した人を verifiedBy に記録（監査ログ）
//   アーカイブ: AIに渡さないと人が判断したもの

export type InboxSource = 'slack' | 'mail' | 'schedule';

export type InboxStatus = '待機中' | '要確認' | '処理済み' | 'アーカイブ';

export interface InboxMask {
  text: string; // 分かち書きトークンの文字列。同一文字列は一括で同じトークンに置換
  type: MaskType;
  token: string; // 例 "〔氏名①〕"
  auto?: boolean; // ルール・辞書による自動マスクか（false/未指定 = 人手）
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
  attention?: string[]; // 目視確認時の注意点（ロジックの警告。未マスクの疑い・案件不明など）
  processedAt?: string; // 目視確認→AI解析の完了時刻
  verifiedBy?: string; // 目視確認した人（監査ログ。機密がないことの保証者は常に人間）
  analysisNote?: string; // 解析結果の補足（例 "タスクなし（共有のみ）"）
  counterparty: string; // 案件名。メール: ドメイン / 本文一致で自動判定。不明なら警告を出す
  tokens?: string[]; // 分かち書き結果（ストア初期化時に付与）
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
  // 補助情報（任意）
  handedOffLabel?: string; // 例 "FSへ回した: 1時間前"
  completedDate?: string; // 例 "6/9"
}
