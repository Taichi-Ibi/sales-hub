// ドメイン型定義（仕様書 §8.1）。

export type Category = '法務' | '契約' | '期限付き返信' | '対応漏れ';

export type Risk = '高' | '低';

export type Status = '未確認' | '対応中' | 'FS承認待ち' | '承認済み' | '送信済み' | '棄却';

export type MaskType = '人物' | 'NDA';

export interface MaskedEntity {
  token: string; // 例 "〔人物①〕"
  type: MaskType;
  decryptedValue: string; // 例 "田中 一郎"（IS閲覧用）
  occurrences: number;
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
