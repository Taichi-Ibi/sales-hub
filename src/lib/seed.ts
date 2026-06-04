// 案件マスタCSVの初回インポート（第4.8）を模擬したサンプルデータ。
// 「初期データ投入 / リセット」で投入される。インポート後はツールが正本となる。

import type { DealEvent, Role } from './types';

let seq = 0;
function eid(): string {
	seq += 1;
	return `seed-${seq.toString().padStart(4, '0')}`;
}

// デモ用の登場人物（固有名詞は一般名 / 要件定義書の方針に合わせる）
export const PEOPLE: Record<Role, { name: string; email: string }> = {
	営業: { name: '佐藤（営業）', email: 'sato@example.com' },
	PSE: { name: '田中（PSE）', email: 'tanaka@example.com' },
	法務: { name: '鈴木（法務）', email: 'suzuki@example.com' },
	PM: { name: '高橋（PM）', email: 'takahashi@example.com' },
	課長: { name: '渡辺（課長）', email: 'watanabe@example.com' },
	閲覧者: { name: '伊藤（経営）', email: 'ito@example.com' }
};

function actor(role: Role) {
	return { name: PEOPLE[role].name, role };
}

// 相対的な時刻を作る（基準日からの日・時間オフセット）
const base = new Date('2026-05-01T09:00:00+09:00').getTime();
function at(dayOffset: number, hour = 0): string {
	return new Date(base + dayOffset * 86400000 + hour * 3600000).toISOString();
}

interface SeedStep {
	t: number; // 日オフセット
	h?: number; // 時オフセット
	type: DealEvent['type'];
	role: Role;
	payload: Record<string, unknown>;
}

function buildDeal(dealId: string, steps: SeedStep[]): DealEvent[] {
	return steps.map((s) => ({
		id: eid(),
		dealId,
		type: s.type,
		at: at(s.t, s.h ?? 0),
		actor: actor(s.role),
		payload: s.payload
	}));
}

export function seedEvents(): DealEvent[] {
	const events: DealEvent[] = [];

	// 案件1: 法務ゲートを通過し、リソース手配中。提案フェーズ。
	events.push(
		...buildDeal('deal-1001', [
			{
				t: 0,
				type: 'deal_created',
				role: '営業',
				payload: { name: 'A社 基幹システム刷新', customer: 'A株式会社', owner: PEOPLE.営業.name }
			},
			{
				t: 0,
				h: 2,
				type: 'interaction_logged',
				role: '営業',
				payload: { channel: '電話', summary: '情シス部長と初回ヒアリング。年度内導入を希望。' }
			},
			{ t: 1, type: 'status_changed', role: '営業', payload: { from: 'リード', to: '商談' } },
			{
				t: 2,
				type: 'briefing_updated',
				role: '営業',
				payload: {
					hasSpecialTerms: true,
					briefing: '損害賠償の上限撤廃を先方法務が要求。要確認の特殊条項あり。'
				}
			},
			{
				t: 2,
				h: 1,
				type: 'legal_requested',
				role: '営業',
				payload: {
					note: '基本契約。損害賠償上限の撤廃要求あり（特殊条項）。可否と代替案を相談したい。'
				}
			},
			{
				t: 4,
				type: 'legal_resolved',
				role: '法務',
				payload: {
					result: '承認',
					comment: '上限撤廃は不可。賠償上限＝契約金額の条項で先方に再提示する形で承認。'
				}
			},
			{ t: 5, type: 'status_changed', role: '営業', payload: { from: '商談', to: '提案' } },
			{
				t: 6,
				type: 'resource_requested',
				role: 'PSE',
				payload: {
					requirement: {
						members: [
							{
								skill: 'Java / Spring（リード）',
								rotation: 'フル稼働',
								note: '金融ドメイン経験者が望ましい。'
							},
							{ skill: 'PostgreSQL / 基幹システム移行', rotation: 'フル稼働', note: '' }
						],
						startTime: '2026年7月',
						duration: '約6ヶ月',
						note: ''
					}
				}
			},
			{
				t: 7,
				type: 'resource_responded',
				role: '課長',
				payload: { status: '手配中', comment: '1名は確保見込み。残り1名は他案件の終了待ち。' }
			}
		])
	);

	// 案件2: 法務ゲート未通過（特殊条項・申し送りが未入力で依頼できない状態）。商談中。
	events.push(
		...buildDeal('deal-1002', [
			{
				t: 3,
				type: 'deal_created',
				role: '営業',
				payload: { name: 'B社 SaaS導入支援', customer: 'B商事', owner: PEOPLE.営業.name }
			},
			{
				t: 3,
				h: 3,
				type: 'interaction_logged',
				role: '営業',
				payload: { channel: '議事録', summary: '現場部門と要件すり合わせ。NDA締結が前提との話。' }
			},
			{ t: 5, type: 'status_changed', role: '営業', payload: { from: 'リード', to: '商談' } }
		])
	);

	// 案件3: 受注 → PMハンドオフ済み。完了。
	events.push(
		...buildDeal('deal-1003', [
			{
				t: -10,
				type: 'deal_created',
				role: '営業',
				payload: { name: 'C社 データ基盤構築', customer: 'C製作所', owner: PEOPLE.営業.name }
			},
			{ t: -9, type: 'status_changed', role: '営業', payload: { from: 'リード', to: '商談' } },
			{
				t: -8,
				type: 'briefing_updated',
				role: '営業',
				payload: {
					hasSpecialTerms: false,
					briefing: '標準契約で問題なし。検収条件のみ通常どおり。'
				}
			},
			{
				t: -7,
				type: 'legal_requested',
				role: '営業',
				payload: { note: 'NDA + 基本契約。特殊条項なし。' }
			},
			{
				t: -6,
				type: 'legal_resolved',
				role: '法務',
				payload: { result: '承認', comment: '標準雛形で問題なし。承認します。' }
			},
			{ t: -5, type: 'status_changed', role: '営業', payload: { from: '商談', to: '提案' } },
			{
				t: -3,
				type: 'resource_requested',
				role: 'PSE',
				payload: {
					requirement: {
						members: [
							{ skill: 'BigQuery / dbt / データモデリング', rotation: '一部稼働（週3）', note: '' }
						],
						startTime: '2026年6月',
						duration: '約3ヶ月',
						note: ''
					}
				}
			},
			{
				t: -2,
				type: 'resource_responded',
				role: '課長',
				payload: { status: '対応済', comment: '担当アサイン完了。6月から着手可能。' }
			},
			{ t: -1, type: 'deal_closed', role: '営業', payload: { result: '受注' } },
			{ t: -1, h: 1, type: 'pm_handoff', role: '営業', payload: { to: PEOPLE.PM.name } }
		])
	);

	// 案件4: 機密案件（指定メンバーのみ閲覧可）。リード。
	events.push(
		...buildDeal('deal-1004', [
			{
				t: 1,
				type: 'deal_created',
				role: '営業',
				payload: { name: '【機密】D社 M&A関連支援', customer: 'D社', owner: PEOPLE.営業.name }
			},
			{
				t: 1,
				h: 1,
				type: 'confidential_set',
				role: '営業',
				payload: {
					confidential: true,
					allowedMembers: [PEOPLE.営業.name, PEOPLE.PM.name, PEOPLE.法務.name]
				}
			},
			{
				t: 1,
				h: 2,
				type: 'interaction_logged',
				role: '営業',
				payload: { channel: '電話', summary: '公表前の案件。関係者限定で進行。' }
			}
		])
	);

	// 案件5: 失注。
	events.push(
		...buildDeal('deal-1005', [
			{
				t: -15,
				type: 'deal_created',
				role: '営業',
				payload: { name: 'E社 業務システム保守', customer: 'E工業', owner: PEOPLE.営業.name }
			},
			{ t: -14, type: 'status_changed', role: '営業', payload: { from: 'リード', to: '商談' } },
			{ t: -12, type: 'status_changed', role: '営業', payload: { from: '商談', to: '提案' } },
			{
				t: -10,
				type: 'deal_closed',
				role: '営業',
				payload: { result: '失注', reason: '価格折り合わず。競合（既存ベンダー）が継続。' }
			}
		])
	);

	return events;
}
