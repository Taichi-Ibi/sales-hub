// 営業支援ツール モックアップ — ドメイン型定義
//
// 設計思想（要件定義書 第7章）に従い、案件は「現在状態の箱」ではなく
// 「案件に起きた出来事（イベント）の連なり」として保持する。
// 現在状態（Deal）はイベント列から導出する（events.ts の deriveDeal）。

/** ロール（要件定義書 第3章） */
export type Role = '営業' | 'PSE' | '法務' | 'PM' | '課長' | '閲覧者';

export const ROLES: Role[] = ['営業', 'PSE', '法務', 'PM', '課長', '閲覧者'];

/** メインステータス（直線フロー / 第4.2節） */
export type MainStatus = 'リード' | '商談' | '提案' | '受注' | '失注';

export const MAIN_FLOW: MainStatus[] = ['リード', '商談', '提案'];
export const CLOSED_STATUSES: MainStatus[] = ['受注', '失注'];

/** 法務サブフローの状態（第4.4節） */
export type LegalStatus = '未依頼' | '依頼中' | '承認' | '差し戻し';

/** リソース要件サブフローの対応ステータス（第4.5節） */
export type ResourceStatus = '未登録' | '登録済' | '手配中' | '対応済';

/** リソース要件（5項目で確定 / 第4.5節） */
export interface ResourceRequirement {
	skills: string; // 1. 必要スキル（言語・領域 等）
	headcount: string; // 2. 人数
	startTime: string; // 3. 開始時期
	duration: string; // 4. 想定期間
	utilization: string; // 5. 稼働率（フル / 一部 等）
	note: string; // 補足用の自由記述欄
}

/** ログインユーザー（GWS SSO を模擬 / 第4.7節） */
export interface User {
	name: string;
	email: string;
	role: Role;
}

// ── イベント定義（イベントソーシング志向） ──────────────────────────

export type EventType =
	| 'deal_created' // 案件作成
	| 'status_changed' // メインステータス遷移
	| 'interaction_logged' // やり取り履歴の記録
	| 'briefing_updated' // 特殊条項の有無・申し送りの更新
	| 'confidential_set' // 機密案件フラグの変更
	| 'legal_requested' // 法務レビュー依頼の発行
	| 'legal_resolved' // 法務レビューの完了（承認 / 差し戻し）
	| 'resource_requested' // リソース要件の登録
	| 'resource_responded' // リソース要件への対応ステータス返信
	| 'pm_handoff' // 受注時のPMハンドオフ
	| 'deal_closed'; // クローズ（受注 / 失注）

/** すべての状態変化はこのイベントとして追記保存される（消さない） */
export interface DealEvent {
	id: string;
	dealId: string;
	type: EventType;
	at: string; // ISO8601
	actor: { name: string; role: Role };
	payload: Record<string, unknown>;
}

// ── 導出される現在状態 ───────────────────────────────────────────

export interface Interaction {
	at: string;
	by: string;
	channel: string; // 電話 / 議事録 / メール 等
	summary: string;
}

/** イベント列から導出される案件の現在状態 */
export interface Deal {
	id: string;
	name: string;
	customer: string;
	owner: string; // 担当営業
	createdAt: string;

	status: MainStatus;
	lossReason?: string;

	// 機密案件（第3.2 / 5.1）。指定メンバーのみ閲覧可。
	confidential: boolean;
	allowedMembers: string[];

	// やり取り履歴・特殊事情（第4.3）
	interactions: Interaction[];
	hasSpecialTerms: boolean | null; // 特殊条項の有無（null = 未入力）
	briefing: string; // 申し送り事項

	// 法務サブフロー（第4.4）
	legal: {
		status: LegalStatus;
		requestNote?: string;
		resolution?: { result: '承認' | '差し戻し'; comment: string; by: string; at: string };
	};

	// リソース要件サブフロー（第4.5）
	resource: {
		status: ResourceStatus;
		requirement?: ResourceRequirement;
		response?: { status: '手配中' | '対応済'; comment: string; by: string; at: string };
	};

	handedOff: boolean; // PMへのハンドオフ済み
}

/** Slack通知（第4.6）を模擬したフィード項目 */
export interface Notification {
	id: string;
	at: string;
	dealId: string;
	dealName: string;
	text: string;
	channel: string; // 模擬Slackチャンネル
}
