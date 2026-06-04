// ロール × 操作の可否（要件定義書 第3.2 権限ポリシー）
//
// 方針:
//  - 閲覧は原則全ログインユーザーに公開（「文脈が渡らない」を防ぐため見える側に倒す）
//  - 編集はロールで制限（営業 / PSE / 法務 / PM が各領域のみ）
//  - 課長はリソース要件への対応ステータス返信のみ可
//  - 機密案件は指定メンバーのみ閲覧可（単一の例外）

import type { Deal, Role } from './types';

/** 機密案件の閲覧可否（第3.2 / 5.1） */
export function canView(deal: Deal, user: { name: string; role: Role }): boolean {
	if (!deal.confidential) return true;
	// 担当営業 と 指定メンバー のみ
	if (deal.owner === user.name) return true;
	return deal.allowedMembers.includes(user.name);
}

/** 案件の作成・編集（基本情報 / ステータス遷移）。担当分。 */
export function canEditDeal(role: Role): boolean {
	return role === '営業' || role === 'PM';
}

/** やり取り履歴の記録（第4.3） */
export function canLogInteraction(role: Role): boolean {
	return role === '営業' || role === 'PSE' || role === 'PM';
}

/** 申し送り・特殊条項の編集（やり取り履歴の構造化部分） */
export function canEditBriefing(role: Role): boolean {
	return role === '営業' || role === 'PSE' || role === 'PM';
}

/** 法務レビュー依頼の発行（営業が主導） */
export function canRequestLegal(role: Role): boolean {
	return role === '営業' || role === 'PM';
}

/** 法務レビューの完了 / 差し戻し（第4.4） */
export function canResolveLegal(role: Role): boolean {
	return role === '法務';
}

/** リソース要件の登録（PSE / 営業が起案する場合あり） */
export function canRequestResource(role: Role): boolean {
	return role === 'PSE' || role === '営業';
}

/** リソース要件への対応ステータス返信（課長のみ / 第4.5） */
export function canRespondResource(role: Role): boolean {
	return role === '課長';
}

/** 機密フラグの設定 */
export function canSetConfidential(role: Role): boolean {
	return role === '営業' || role === 'PM';
}
