// ドメイン型定義。
// 逆V字構造: 「①集約 → ②加工（受信箱の目視ゲート）→ 商談Wiki（頂点）→ ③助言 → ④対話と伝達」。
// 痕跡は昇り、助言は降りる。
// セキュリティ原則: 機密情報がないことを保証できるのは人間のみ。
// すべてのデータは、ロジック（パターン・辞書）の自動マスクで下ごしらえした上で、
// **人が全件目視確認**してからAIに渡す。ロジックは確認を速くする補助であり、
// ゲートの通過判定は常に人が行う。

// マスク種別。トークン名にそのまま使うため、AI/人間どちらが見ても
// プレースホルダの役割が分かる短い語にする（例 〔氏名①〕〔会社①〕）。
export type MaskType = '氏名' | '会社' | '連絡先' | '契約番号';

export interface MaskedEntity {
  token: string; // 例 "〔氏名①〕"
  type: MaskType;
  decryptedValue: string; // 例 "田中 一郎"（表示層で復元する値）
  occurrences: number;
}

// ───────── 受信箱（②加工 / マスキング目視ゲート） ─────────
// Slack/メールの原文が入る。ローカル前処理（分かち書き・ルール/辞書による
// 自動マスク・案件の自動判定）はデータを外に出さずに自動で行う。
// **目視ゲート（全件必須）**: 機密情報がないことを保証できるのは人間のみ。
// すべてのアイテムは人が目視確認して「確認してAIに渡す」を押すまでAIに送信されない。
// ロジックが検出した注意点（辞書未登録の氏名・案件不明など）は `attention` で
// 警告し、目視確認を速くする。
//
//   要確認   : 目視確認待ち（AI送信前）。人がマスク補正・案件選択をしてAIに渡す
//   処理済み : 目視確認→AI解析が完了し、痕跡（trace）として商談Wikiの根拠になった
//   アーカイブ: AIに渡さないと人が判断したもの

export type InboxSource = 'slack' | 'mail';

export type InboxStatus = '要確認' | '処理済み' | 'アーカイブ';

export interface InboxMask {
  text: string; // 分かち書きトークンの文字列。同一文字列は一括で同じトークンに置換
  type: MaskType;
  token: string; // 例 "〔氏名①〕"
  auto?: boolean; // ルール・辞書による自動マスクか（false/未指定 = 人手）
  excludedIndices?: number[]; // 個別に復元されたトークン開始位置（その位置だけチップを非表示）
}

// AIが目視確認済みの痕跡を取り込んだ結果のシミュレート用シード。
// wikiLines は原文（マスク前）で持ち、取込時に Inbox のマスクを適用する。
export interface IngestSeed {
  /** 取込先の案件（dealId）。空ならアイテムの counterparty から解決 */
  dealId: string;
  /** 当日スナップショットに追記される行（マスク前テキスト。取込時にマスク適用） */
  wikiLines: string[];
  /** 取込で新しい助言が生成される場合、data/advice.ts の RUNTIME_ADVICE のキー */
  adviceId?: string;
  /** 取込結果の補足（例 "Wiki更新なし（共有のみ）"） */
  analysisNote?: string;
}

export interface InboxItem {
  id: string;
  source: InboxSource;
  title: string; // 件名 / チャンネル
  sender: string; // 送信者・起票者
  receivedAt: string; // "2026-06-10T08:40:00"
  body: string; // 原文
  status: InboxStatus;
  attention?: string[]; // 目視確認時の注意点（ロジックの警告。未マスクの疑い・案件不明など）
  processedAt?: string; // 目視確認→AI解析の完了時刻
  verifiedBy?: string; // 目視確認した人（監査ログ。機密がないことの保証者は常に人間）
  analysisNote?: string; // 解析結果の補足（例 "Wiki更新なし（共有のみ）"）
  counterparty: string; // 案件名。メール: ドメイン / 本文一致で自動判定。不明なら警告を出す
  tokens?: string[]; // 分かち書き結果（ストア初期化時に付与）
  masks: InboxMask[];
  /** 本来マスクすべき語（未マスク警告の判定用） */
  knownSensitive: string[];
  ingest: IngestSeed;
  // メール専用（任意）
  mailTo?: string; // 受信者（宛先）
  // ユーザーメモ（任意）
  memo?: string;
}

// ───────── ④対話と伝達（relay） ─────────
// 伝達の実行（コピー）は必ず人の操作。コピーした内容は relay ログに記録され、
// 将来①集約の入力（新たな痕跡）として還流する想定なので traces 互換のidを持つ。
export interface RelayLogEntry {
  id: string; // "tr-relay-1" 形式（traces 互換）
  dealId: string;
  adviceId: string;
  recipient: string; // 法務 / 経理 / 営業チーム
  subject: string;
  content: string; // コピーした本文（マスクトークンのまま保存。表示層で復元）
  copiedAt: string; // "6/10 10:00"
}
