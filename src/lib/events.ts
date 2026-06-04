// イベント列 → 現在状態の導出（イベントソーシング志向 / 要件定義書 第7章）
//
// 状態は上書きせず、出来事（DealEvent）を追記していく。
// 画面に出す「現在のステータス・申し送り・リソース要件」は、ここで
// イベント列を畳み込んで導出する。

import type { Deal, DealEvent, Notification, ResourceRequirement, MainStatus } from './types';

/** 1案件分のイベント列から現在状態を導出する */
export function deriveDeal(events: DealEvent[]): Deal | null {
	const created = events.find((e) => e.type === 'deal_created');
	if (!created) return null;

	const p = created.payload as {
		name: string;
		customer: string;
		owner: string;
	};

	const deal: Deal = {
		id: created.dealId,
		name: p.name,
		customer: p.customer,
		owner: p.owner,
		createdAt: created.at,
		status: 'リード',
		confidential: false,
		allowedMembers: [],
		interactions: [],
		hasSpecialTerms: null,
		briefing: '',
		legal: { status: '未依頼' },
		resource: { status: '未登録' },
		handedOff: false
	};

	for (const e of events) {
		applyEvent(deal, e);
	}
	return deal;
}

function applyEvent(deal: Deal, e: DealEvent): void {
	switch (e.type) {
		case 'status_changed': {
			deal.status = (e.payload.to as MainStatus) ?? deal.status;
			break;
		}
		case 'interaction_logged': {
			deal.interactions.push({
				at: e.at,
				by: e.actor.name,
				channel: (e.payload.channel as string) ?? 'メモ',
				summary: (e.payload.summary as string) ?? ''
			});
			break;
		}
		case 'briefing_updated': {
			if ('hasSpecialTerms' in e.payload) {
				deal.hasSpecialTerms = e.payload.hasSpecialTerms as boolean;
			}
			if ('briefing' in e.payload) {
				deal.briefing = (e.payload.briefing as string) ?? '';
			}
			break;
		}
		case 'confidential_set': {
			deal.confidential = Boolean(e.payload.confidential);
			deal.allowedMembers = (e.payload.allowedMembers as string[]) ?? [];
			break;
		}
		case 'legal_requested': {
			deal.legal.status = '依頼中';
			deal.legal.requestNote = (e.payload.note as string) ?? '';
			deal.legal.resolution = undefined;
			break;
		}
		case 'legal_resolved': {
			const result = e.payload.result as '承認' | '差し戻し';
			deal.legal.status = result;
			deal.legal.resolution = {
				result,
				comment: (e.payload.comment as string) ?? '',
				by: e.actor.name,
				at: e.at
			};
			break;
		}
		case 'resource_requested': {
			deal.resource.status = '登録済';
			deal.resource.requirement = e.payload.requirement as ResourceRequirement;
			deal.resource.response = undefined;
			break;
		}
		case 'resource_responded': {
			const status = e.payload.status as '手配中' | '対応済';
			deal.resource.status = status;
			deal.resource.response = {
				status,
				comment: (e.payload.comment as string) ?? '',
				by: e.actor.name,
				at: e.at
			};
			break;
		}
		case 'pm_handoff': {
			deal.handedOff = true;
			break;
		}
		case 'deal_closed': {
			deal.status = e.payload.result as MainStatus; // 受注 / 失注
			if (e.payload.result === '失注') {
				deal.lossReason = (e.payload.reason as string) ?? '';
			}
			break;
		}
		case 'deal_created':
			break;
	}
}

/** 全イベントから案件ごとの現在状態を導出 */
export function deriveAllDeals(events: DealEvent[]): Deal[] {
	const byDeal = new Map<string, DealEvent[]>();
	for (const e of events) {
		const arr = byDeal.get(e.dealId) ?? [];
		arr.push(e);
		byDeal.set(e.dealId, arr);
	}
	const deals: Deal[] = [];
	for (const [, evs] of byDeal) {
		const d = deriveDeal(evs);
		if (d) deals.push(d);
	}
	// 作成日時の新しい順
	deals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	return deals;
}

// ── 通知（Slack模擬 / 第4.6） ──────────────────────────────────
// 「書く場所を増やさず、既に全員がいるSlackに届ける」方針を、
// 通知対象イベントから導出するフィードで表現する。

const NOTIFY_TYPES = new Set([
	'legal_requested',
	'legal_resolved',
	'resource_requested',
	'resource_responded',
	'pm_handoff'
]);

export function deriveNotifications(events: DealEvent[], deals: Deal[]): Notification[] {
	const nameById = new Map(deals.map((d) => [d.id, d.name]));
	const out: Notification[] = [];
	for (const e of events) {
		if (!NOTIFY_TYPES.has(e.type)) continue;
		const dealName = nameById.get(e.dealId) ?? '(不明な案件)';
		out.push({
			id: e.id,
			at: e.at,
			dealId: e.dealId,
			dealName,
			text: notificationText(e, dealName),
			channel: notificationChannel(e.type)
		});
	}
	return out.reverse(); // 新しい順
}

function notificationChannel(type: string): string {
	switch (type) {
		case 'legal_requested':
		case 'legal_resolved':
			return '#legal-review';
		case 'resource_requested':
		case 'resource_responded':
			return '#resource-request';
		case 'pm_handoff':
			return '#pm-handoff';
		default:
			return '#sales-hub';
	}
}

function notificationText(e: DealEvent, dealName: string): string {
	const who = `${e.actor.name}（${e.actor.role}）`;
	switch (e.type) {
		case 'legal_requested':
			return `📝 ${who} が「${dealName}」の法務レビューを依頼しました。`;
		case 'legal_resolved':
			return `⚖️ 法務が「${dealName}」のレビューを${e.payload.result}しました。`;
		case 'resource_requested':
			return `🧩 ${who} が「${dealName}」のリソース要件を登録しました。`;
		case 'resource_responded':
			return `🛠️ ${who} が「${dealName}」のリソース手配を「${e.payload.status}」に更新しました。`;
		case 'pm_handoff':
			return `🤝 「${dealName}」が受注し、PMへハンドオフされました。`;
		default:
			return `「${dealName}」が更新されました。`;
	}
}
