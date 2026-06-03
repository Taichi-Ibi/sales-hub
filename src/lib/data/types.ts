// ドメインモデル — 「顧客中心 × イベントソーシング」
//
// 設計の根幹:
//   - 最上位エンティティは Customer（顧客）。
//   - Project（案件）は顧客配下に存在する。
//   - SalesEvent（イベント）が唯一の真実。現在の状態はイベント履歴から導出する。
//
// 着想は電子カルテ: 患者 = 顧客 / カルテ = イベントタイムライン / 診療・治療 = 案件。

/** 顧客ランク（取引重要度） */
export type CustomerRank = 'S' | 'A' | 'B' | 'C';

/** 注意事項フラグ（与信・取引上の常時表示メモ） */
export interface NoteFlag {
	level: 'critical' | 'caution' | 'info';
	label: string;
	note: string;
}

/** 顧客の担当者（先方キーパーソン） */
export interface Contact {
	name: string;
	role: string;
	primary?: boolean;
}

/** Customer（顧客）— CRM の最上位エンティティ */
export interface Customer {
	id: string;
	name: string;
	industry: string;
	employees: string;
	url: string;
	owner: string; // 担当営業
	rank: CustomerRank;
	since: string; // 取引開始日 YYYY-MM-DD
	flags: NoteFlag[];
	contacts: Contact[];
}

/** 案件ステータス（イベント履歴から導出される） */
export type ProjectStatus =
	| 'リード'
	| 'ヒアリング'
	| '提案'
	| '見積'
	| '受注'
	| '開発'
	| '納品'
	| '失注';

/** 案件の標準進行（失注は分岐、納品が最終） */
export const PROJECT_PATH: ProjectStatus[] = [
	'リード',
	'ヒアリング',
	'提案',
	'見積',
	'受注',
	'開発',
	'納品'
];

/** Project（案件）— 顧客配下に存在する */
export interface Project {
	id: string;
	customerId: string;
	name: string;
	expectedAmount: number; // 想定売上（円）
	expectedMargin: number; // 想定粗利率（%）
	closeDate?: string; // 受注予定 / 受注日 YYYY-MM-DD
	dueDate?: string; // 納期 YYYY-MM-DD
}

/** イベント分類 */
export type EventCategory = 'customer' | 'project';

/** 顧客イベント種別 */
export type CustomerEventType =
	| '顧客登録'
	| '担当者追加'
	| '初回接触'
	| '電話'
	| 'メール'
	| '訪問'
	| '定例会';

/** 案件イベント種別 */
export type ProjectEventType =
	| '案件作成'
	| 'ヒアリング'
	| '提案提出'
	| '見積提出'
	| '契約締結'
	| '受注'
	| '失注'
	| '開発開始'
	| '納品';

export type EventType = CustomerEventType | ProjectEventType;

/** 添付資料 */
export interface Attachment {
	name: string;
	kind: '提案書' | '見積書' | '契約書' | '資料' | '議事録';
}

/**
 * SalesEvent（イベント）— 全ての営業活動を記録する。
 *
 * イベントソーシングの中核。状態を保持せず、発生した事実を時系列で積む。
 * projectId が付くイベントは案件に紐づく（接触系イベントも案件に関連付け可能）。
 */
export interface SalesEvent {
	id: string;
	customerId: string;
	projectId?: string;
	category: EventCategory;
	type: EventType;
	date: string; // YYYY-MM-DD
	actor: string; // 実施者
	note: string;
	amount?: number; // 状態に効くペイロード（受注金額など）
	margin?: number; // 受注時の粗利率（%）
	attachments?: Attachment[];
}
