import type { Account, Deal } from './types';

export const TODAY = '2026-06-02';

export const accounts: Account[] = [
	{
		id: 'a1',
		name: '東洋メディカル製造',
		industry: '医療機器メーカー',
		employees: '1,200名',
		flags: [
			{
				level: 'allergy',
				label: '過去解約あり',
				note: '2023年に旧製品をサポート不足を理由に解約。導入支援の手厚さを必ず訴求すること。'
			},
			{
				level: 'caution',
				label: '競合A社利用中',
				note: '基幹は競合A社。リプレース提案には移行コストの試算が必須。'
			}
		]
	},
	{
		id: 'a2',
		name: 'さくら流通ホールディングス',
		industry: '物流・倉庫',
		employees: '4,500名',
		flags: [
			{
				level: 'caution',
				label: '価格敏感',
				note: '相見積もり前提。値引きより ROI を数値で示すこと。'
			}
		]
	},
	{
		id: 'a3',
		name: 'グリーンフィールド食品',
		industry: '食品製造',
		employees: '600名',
		flags: [
			{
				level: 'info',
				label: '紹介案件',
				note: '既存顧客（北日本飲料）からの紹介。満足度が高く前向き。'
			}
		]
	},
	{
		id: 'a4',
		name: 'みやこ建設',
		industry: '建設',
		employees: '2,800名',
		flags: [
			{
				level: 'caution',
				label: '決裁が遅い',
				note: '稟議に役員会承認が必要。月1回のため期日逆算が重要。'
			}
		]
	},
	{
		id: 'a5',
		name: 'ネクサス情報システム',
		industry: 'SIer',
		employees: '900名',
		flags: [
			{ level: 'info', label: '技術評価重視', note: 'PoC を重視。技術担当の納得が購買の鍵。' }
		]
	}
];

export const deals: Deal[] = [
	{
		id: 'd1',
		title: '東洋メディカル 営業支援基盤リプレース',
		accountId: 'a1',
		owner: '佐藤 健太',
		amount: 18_000_000,
		stage: '提案',
		probability: 45,
		triage: 'critical',
		closeDate: '2026-06-30',
		lastContact: '2026-05-12',
		nextAction: { label: '導入支援体制の提案書を再提出', due: '2026-06-04' },
		handoff:
			'過去解約の経緯から「導入後の伴走」に強い不安。競合A社からの移行コストを懸念。21日間接触が途絶しており失注リスク高。早急な再接触が必要。',
		vitals: [
			{
				key: 'engagement',
				label: '熱量',
				value: 38,
				low: 50,
				hint: '担当者の関心度。提案後の反応が鈍化。'
			},
			{
				key: 'momentum',
				label: 'モメンタム',
				value: 30,
				low: 45,
				hint: 'ステージ進行の勢い。3週間停滞。'
			},
			{
				key: 'freshness',
				label: '鮮度',
				value: 20,
				low: 60,
				hint: '最終接触からの経過。21日経過し危険域。'
			},
			{
				key: 'coverage',
				label: '決裁者接触',
				value: 55,
				low: 50,
				hint: '購買決裁者との接触度。部長まで到達。'
			}
		],
		activities: [
			{
				id: 'd1-3',
				date: '2026-05-12',
				author: '佐藤 健太',
				channel: 'オンライン',
				title: '提案レビュー（一次）',
				soap: {
					s: '「機能は良いが、前回サポートで苦労した。今回は本当に伴走してくれるのか」と強い懸念表明。',
					o: '提案書の機能パートは好反応。一方、導入体制のページで質問が集中。決裁は7月の役員会予定。',
					a: '機能では勝てている。解約トラウマが最大の障壁。導入支援の具体性が決め手になる。',
					p: '導入支援チーム体制・専任CSの提案書を別添で作成し再提出する。'
				}
			},
			{
				id: 'd1-2',
				date: '2026-04-28',
				author: '佐藤 健太',
				channel: '訪問',
				title: '提案プレゼン',
				soap: {
					s: '現場から「入力が二度手間」「他システムと連携できない」との不満を共有された。',
					o: '情報システム部長・営業企画課長が同席。競合A社の契約更新は2026年12月と判明。',
					a: '更新期限が明確なリプレース好機。連携機能が刺さっている。',
					p: '連携機能のデモ環境を用意。導入支援体制を次回提示。'
				}
			},
			{
				id: 'd1-1',
				date: '2026-04-10',
				author: '佐藤 健太',
				channel: '電話',
				title: '初回ヒアリング',
				soap: {
					s: '「営業のレポート作成に毎週時間を取られている」と課題感。',
					o: '営業40名規模。現行は競合A社＋Excel併用。',
					a: 'レポート自動化が一次的な刺さりどころ。',
					p: '提案プレゼンを設定（4/28）。'
				}
			}
		]
	},
	{
		id: 'd2',
		title: 'さくら流通 倉庫管理連携CRM導入',
		accountId: 'a2',
		owner: '鈴木 美咲',
		amount: 9_500_000,
		stage: '見積提示',
		probability: 60,
		triage: 'warning',
		closeDate: '2026-06-20',
		lastContact: '2026-05-26',
		nextAction: { label: 'ROI 試算資料を提出し相見積もりに対抗', due: '2026-06-05' },
		handoff:
			'価格敏感。3社相見積もり中で当社は中位価格。値引きではなく ROI（工数削減）の数値提示で差別化する方針。鮮度はまだ保てている。',
		vitals: [
			{ key: 'engagement', label: '熱量', value: 62, low: 50, hint: '担当者は前向き。' },
			{
				key: 'momentum',
				label: 'モメンタム',
				value: 58,
				low: 45,
				hint: '見積提示まで順調に進行。'
			},
			{ key: 'freshness', label: '鮮度', value: 65, low: 60, hint: '7日前に接触。良好。' },
			{
				key: 'coverage',
				label: '決裁者接触',
				value: 40,
				low: 50,
				hint: '購買部長に未接触。窓口は課長止まり。'
			}
		],
		activities: [
			{
				id: 'd2-2',
				date: '2026-05-26',
				author: '鈴木 美咲',
				channel: 'メール',
				title: '見積提示・質疑',
				soap: {
					s: '「他社より2割高い。決裁を通すには根拠が要る」とのこと。',
					o: '相見積もり3社。当社は2番手の価格帯。担当課長は機能を高評価。',
					a: '価格で負けているが価値訴求の余地。決裁者（購買部長）に未接触が懸念。',
					p: 'ROI試算（年間1,800時間削減）資料を作成。課長経由で購買部長との面談を打診。'
				}
			},
			{
				id: 'd2-1',
				date: '2026-05-14',
				author: '鈴木 美咲',
				channel: 'オンライン',
				title: '要件ヒアリング',
				soap: {
					s: '倉庫システムとの在庫連携が必須要件。',
					o: 'WMS は自社開発。API連携の実績を求められた。',
					a: '連携実績の提示が信頼獲得の鍵。',
					p: '連携事例＋見積もりを提示する。'
				}
			}
		]
	},
	{
		id: 'd3',
		title: 'グリーンフィールド食品 SFA新規導入',
		accountId: 'a3',
		owner: '高橋 涼',
		amount: 6_200_000,
		stage: 'クロージング',
		probability: 80,
		triage: 'stable',
		closeDate: '2026-06-13',
		lastContact: '2026-05-30',
		nextAction: { label: '最終契約条件のすり合わせ', due: '2026-06-06' },
		handoff:
			'紹介案件で温度感が高い。クロージング段階で最も受注確度が高い。契約書レビュー中で順調。',
		vitals: [
			{ key: 'engagement', label: '熱量', value: 85, low: 50, hint: '紹介経由で非常に前向き。' },
			{
				key: 'momentum',
				label: 'モメンタム',
				value: 78,
				low: 45,
				hint: '短期間でクロージングまで到達。'
			},
			{ key: 'freshness', label: '鮮度', value: 80, low: 60, hint: '3日前に接触。良好。' },
			{
				key: 'coverage',
				label: '決裁者接触',
				value: 75,
				low: 50,
				hint: '社長・経営企画と直接接触済み。'
			}
		],
		activities: [
			{
				id: 'd3-2',
				date: '2026-05-30',
				author: '高橋 涼',
				channel: '訪問',
				title: '最終提案・条件協議',
				soap: {
					s: '「来期から全社展開したい。早く始めたい」と前のめり。',
					o: '社長・経営企画部長が同席。契約書を法務レビューに回す合意。',
					a: '受注確度高。スケジュールが決め手。',
					p: '契約条件を確定し、6月中旬の締結を目指す。'
				}
			},
			{
				id: 'd3-1',
				date: '2026-05-18',
				author: '高橋 涼',
				channel: 'オンライン',
				title: '紹介・初回提案',
				soap: {
					s: '北日本飲料からの紹介。「同じ成果を出したい」と期待大。',
					o: '営業25名。導入障壁は低い。',
					a: '紹介の信頼貯金が大きい。スピード重視で進める。',
					p: '最終提案を1週間以内に設定。'
				}
			}
		]
	},
	{
		id: 'd4',
		title: 'みやこ建設 案件管理システム導入',
		accountId: 'a4',
		owner: '佐藤 健太',
		amount: 14_000_000,
		stage: 'ヒアリング',
		probability: 30,
		triage: 'warning',
		closeDate: '2026-08-29',
		lastContact: '2026-05-20',
		nextAction: { label: '役員会（6/15）向けの稟議サマリを窓口に提供', due: '2026-06-10' },
		handoff:
			'決裁が遅い組織。役員会が月1回（毎月15日）のため期日逆算が要。今は窓口の課長を稟議資料で支援するフェーズ。',
		vitals: [
			{ key: 'engagement', label: '熱量', value: 60, low: 50, hint: '窓口担当は協力的。' },
			{
				key: 'momentum',
				label: 'モメンタム',
				value: 42,
				low: 45,
				hint: '決裁プロセスが長く進行が緩やか。'
			},
			{
				key: 'freshness',
				label: '鮮度',
				value: 55,
				low: 60,
				hint: '13日前に接触。やや空きつつある。'
			},
			{
				key: 'coverage',
				label: '決裁者接触',
				value: 35,
				low: 50,
				hint: '役員に未接触。課長経由のみ。'
			}
		],
		activities: [
			{
				id: 'd4-1',
				date: '2026-05-20',
				author: '佐藤 健太',
				channel: '訪問',
				title: '課題ヒアリング',
				soap: {
					s: '「現場ごとに進捗管理がバラバラ。全社で可視化したい」。',
					o: '稟議は役員会承認が必須。次回役員会は6/15。',
					a: '6/15の役員会に載せられるかが当面の勝負。',
					p: '窓口課長が稟議を通しやすい1枚サマリを作成して支援する。'
				}
			}
		]
	},
	{
		id: 'd5',
		title: 'ネクサス情報 SFA PoC案件',
		accountId: 'a5',
		owner: '鈴木 美咲',
		amount: 4_800_000,
		stage: 'アプローチ',
		probability: 20,
		triage: 'stable',
		closeDate: '2026-09-30',
		lastContact: '2026-05-28',
		nextAction: { label: 'PoC のスコープ定義MTGを設定', due: '2026-06-09' },
		handoff: '技術評価重視の顧客。PoC をこれから設計。早期段階だが温度感は悪くない。',
		vitals: [
			{
				key: 'engagement',
				label: '熱量',
				value: 55,
				low: 50,
				hint: '技術担当が興味を示している。'
			},
			{
				key: 'momentum',
				label: 'モメンタム',
				value: 50,
				low: 45,
				hint: '初期段階だが動き出している。'
			},
			{ key: 'freshness', label: '鮮度', value: 70, low: 60, hint: '5日前に接触。良好。' },
			{
				key: 'coverage',
				label: '決裁者接触',
				value: 30,
				low: 50,
				hint: '技術担当のみ。購買は未接触。'
			}
		],
		activities: [
			{
				id: 'd5-1',
				date: '2026-05-28',
				author: '鈴木 美咲',
				channel: 'オンライン',
				title: '初回商談',
				soap: {
					s: '「まず技術的に自社要件を満たすか検証したい」。',
					o: 'SIerのため評価基準が厳格。技術担当が主導。',
					a: 'PoC の設計品質が勝敗を分ける。',
					p: 'PoC スコープ定義のMTGを設定する。'
				}
			}
		]
	}
];

export function getDeal(id: string): Deal | undefined {
	return deals.find((d) => d.id === id);
}

export function getAccount(id: string): Account | undefined {
	return accounts.find((a) => a.id === id);
}
