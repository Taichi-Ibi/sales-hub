import type { Customer, Project, SalesEvent } from './types';

/** 基準日（モックの「今日」） */
export const TODAY = '2026-06-03';

/** ダッシュボードKPIの集計対象期間（今期）の開始日 */
export const PERIOD_START = '2026-01-01';

// ============================================================
// Customer（顧客）— CRM の最上位エンティティ
// ============================================================
export const customers: Customer[] = [
	{
		id: 'c1',
		name: '東洋メディカル製造',
		industry: '医療機器メーカー',
		employees: '1,200名',
		url: 'toyo-medical.co.jp',
		owner: '佐藤 健太',
		rank: 'A',
		since: '2024-02-15',
		flags: [
			{
				level: 'critical',
				label: '過去解約あり',
				note: '2023年に旧製品をサポート不足を理由に解約。導入支援の手厚さを必ず訴求すること。'
			},
			{
				level: 'caution',
				label: '競合A社利用中',
				note: '基幹は競合A社。リプレース提案には移行コストの試算が必須。'
			}
		],
		contacts: [
			{ name: '大野 隆', role: '情報システム部 部長', primary: true },
			{ name: '西村 彩', role: '営業企画課 課長' }
		]
	},
	{
		id: 'c2',
		name: 'さくら流通ホールディングス',
		industry: '物流・倉庫',
		employees: '4,500名',
		url: 'sakura-logi.co.jp',
		owner: '鈴木 美咲',
		rank: 'B',
		since: '2026-05-01',
		flags: [
			{
				level: 'caution',
				label: '価格敏感',
				note: '相見積もり前提。値引きより ROI を数値で示すこと。'
			}
		],
		contacts: [{ name: '田所 健', role: '物流DX推進室 課長', primary: true }]
	},
	{
		id: 'c3',
		name: 'グリーンフィールド食品',
		industry: '食品製造',
		employees: '600名',
		url: 'greenfield-foods.co.jp',
		owner: '高橋 涼',
		rank: 'A',
		since: '2026-05-12',
		flags: [
			{
				level: 'info',
				label: '紹介案件',
				note: '既存顧客（北日本飲料）からの紹介。満足度が高く前向き。'
			}
		],
		contacts: [
			{ name: '森 大輔', role: '代表取締役社長', primary: true },
			{ name: '岡田 直樹', role: '経営企画部 部長' }
		]
	},
	{
		id: 'c4',
		name: 'みやこ建設',
		industry: '建設',
		employees: '2,800名',
		url: 'miyako-const.co.jp',
		owner: '佐藤 健太',
		rank: 'C',
		since: '2026-05-10',
		flags: [
			{
				level: 'caution',
				label: '決裁が遅い',
				note: '稟議に役員会承認が必要。月1回（毎月15日）のため期日逆算が重要。'
			}
		],
		contacts: [{ name: '山本 浩二', role: '経営管理部 課長', primary: true }]
	},
	{
		id: 'c5',
		name: 'ネクサス情報システム',
		industry: 'SIer',
		employees: '900名',
		url: 'nexus-is.co.jp',
		owner: '鈴木 美咲',
		rank: 'B',
		since: '2026-05-20',
		flags: [
			{ level: 'info', label: '技術評価重視', note: 'PoC を重視。技術担当の納得が購買の鍵。' }
		],
		contacts: [{ name: '近藤 拓', role: '技術統括部 主任', primary: true }]
	},
	{
		id: 'c6',
		name: '北日本飲料',
		industry: '飲料製造',
		employees: '3,200名',
		url: 'kitanihon-bev.co.jp',
		owner: '高橋 涼',
		rank: 'S',
		since: '2023-04-10',
		flags: [
			{
				level: 'info',
				label: '優良顧客 / 紹介元',
				note: '3年で3案件を継続発注。満足度が高く、他社紹介も多い最重要アカウント。'
			}
		],
		contacts: [
			{ name: '三浦 誠', role: '執行役員 CDO', primary: true },
			{ name: '今井 香織', role: 'DX推進部 部長' },
			{ name: '長谷川 亮', role: '情報システム部 課長' }
		]
	}
];

// ============================================================
// Project（案件）— 顧客配下。ステータスはイベントから導出する。
// ============================================================
export const projects: Project[] = [
	// 東洋メディカル製造
	{
		id: 'p1',
		customerId: 'c1',
		name: '営業支援基盤リプレース',
		expectedAmount: 18_000_000,
		expectedMargin: 35,
		closeDate: '2026-06-30'
	},
	{
		id: 'p2',
		customerId: 'c1',
		name: '保守運用サポート契約',
		expectedAmount: 5_000_000,
		expectedMargin: 50,
		closeDate: '2024-04-25',
		dueDate: '2024-06-30'
	},
	{
		id: 'p11',
		customerId: 'c1',
		name: 'BIダッシュボード導入',
		expectedAmount: 7_000_000,
		expectedMargin: 30
	},
	// さくら流通
	{
		id: 'p3',
		customerId: 'c2',
		name: '倉庫管理連携CRM導入',
		expectedAmount: 9_500_000,
		expectedMargin: 30,
		closeDate: '2026-06-20'
	},
	// グリーンフィールド食品
	{
		id: 'p4',
		customerId: 'c3',
		name: 'SFA新規導入',
		expectedAmount: 6_200_000,
		expectedMargin: 42,
		closeDate: '2026-06-01',
		dueDate: '2026-09-30'
	},
	// みやこ建設
	{
		id: 'p5',
		customerId: 'c4',
		name: '案件管理システム導入',
		expectedAmount: 14_000_000,
		expectedMargin: 32,
		closeDate: '2026-08-29'
	},
	// ネクサス情報システム
	{
		id: 'p6',
		customerId: 'c5',
		name: 'SFA PoC',
		expectedAmount: 4_800_000,
		expectedMargin: 25,
		closeDate: '2026-09-30'
	},
	// 北日本飲料（高LTV・リピート）
	{
		id: 'p7',
		customerId: 'c6',
		name: 'SFA導入',
		expectedAmount: 8_000_000,
		expectedMargin: 45,
		closeDate: '2023-06-20',
		dueDate: '2023-09-30'
	},
	{
		id: 'p8',
		customerId: 'c6',
		name: 'BI分析基盤構築',
		expectedAmount: 12_000_000,
		expectedMargin: 40,
		closeDate: '2024-11-15',
		dueDate: '2025-03-31'
	},
	{
		id: 'p9',
		customerId: 'c6',
		name: 'AI需要予測基盤',
		expectedAmount: 15_000_000,
		expectedMargin: 38,
		closeDate: '2026-03-10',
		dueDate: '2026-10-31'
	}
];

// ============================================================
// SalesEvent（イベント）— 唯一の真実。全状態はここから導出する。
// 配列は時系列（昇順）で保持する。
// ============================================================
export const events: SalesEvent[] = [
	// ---------- c1 東洋メディカル製造 ----------
	{
		id: 'e-c1-01',
		customerId: 'c1',
		category: 'customer',
		type: '顧客登録',
		date: '2024-02-15',
		actor: '佐藤 健太',
		note: '展示会での名刺交換を起点に顧客登録。医療機器メーカー、営業40名規模。'
	},
	{
		id: 'e-c1-02',
		customerId: 'c1',
		category: 'customer',
		type: '担当者追加',
		date: '2024-02-20',
		actor: '佐藤 健太',
		note: '情報システム部・大野部長をキーパーソンとして登録。'
	},
	{
		id: 'e-c1-03',
		customerId: 'c1',
		projectId: 'p2',
		category: 'project',
		type: '案件作成',
		date: '2024-03-01',
		actor: '佐藤 健太',
		note: '保守運用サポート契約の案件を起票。'
	},
	{
		id: 'e-c1-04',
		customerId: 'c1',
		projectId: 'p2',
		category: 'project',
		type: '提案提出',
		date: '2024-03-20',
		actor: '佐藤 健太',
		note: '年間保守プランを提案。',
		attachments: [{ name: '保守運用提案書_v1.pdf', kind: '提案書' }]
	},
	{
		id: 'e-c1-05',
		customerId: 'c1',
		projectId: 'p2',
		category: 'project',
		type: '見積提出',
		date: '2024-04-05',
		actor: '佐藤 健太',
		note: '年額500万円で見積提示。',
		attachments: [{ name: '保守運用見積書.pdf', kind: '見積書' }]
	},
	{
		id: 'e-c1-06',
		customerId: 'c1',
		projectId: 'p2',
		category: 'project',
		type: '受注',
		date: '2024-04-25',
		actor: '佐藤 健太',
		note: '保守運用サポート契約を受注。',
		amount: 5_000_000,
		margin: 50,
		attachments: [{ name: '保守契約書_2024.pdf', kind: '契約書' }]
	},
	{
		id: 'e-c1-07',
		customerId: 'c1',
		projectId: 'p2',
		category: 'project',
		type: '納品',
		date: '2024-06-30',
		actor: '佐藤 健太',
		note: '保守体制の引き渡し完了。'
	},
	// 失注案件 p11（受注率の分母に効く）
	{
		id: 'e-c1-08',
		customerId: 'c1',
		projectId: 'p11',
		category: 'project',
		type: '案件作成',
		date: '2025-12-10',
		actor: '佐藤 健太',
		note: 'BIダッシュボード導入の引き合いを起票。'
	},
	{
		id: 'e-c1-09',
		customerId: 'c1',
		projectId: 'p11',
		category: 'project',
		type: '提案提出',
		date: '2026-01-20',
		actor: '佐藤 健太',
		note: '可視化ダッシュボードを提案。',
		attachments: [{ name: 'BI提案書.pdf', kind: '提案書' }]
	},
	{
		id: 'e-c1-10',
		customerId: 'c1',
		projectId: 'p11',
		category: 'project',
		type: '失注',
		date: '2026-02-15',
		actor: '佐藤 健太',
		note: '競合A社の既存基盤との親和性を理由に失注。価格差は僅少だった。'
	},
	// 現行案件 p1
	{
		id: 'e-c1-11',
		customerId: 'c1',
		projectId: 'p1',
		category: 'project',
		type: '案件作成',
		date: '2026-04-08',
		actor: '佐藤 健太',
		note: '営業支援基盤リプレースの新規案件を起票。'
	},
	{
		id: 'e-c1-12',
		customerId: 'c1',
		projectId: 'p1',
		category: 'project',
		type: 'ヒアリング',
		date: '2026-04-10',
		actor: '佐藤 健太',
		note: '「営業のレポート作成に毎週時間を取られている」と課題感。現行は競合A社＋Excel併用。'
	},
	{
		id: 'e-c1-13',
		customerId: 'c1',
		projectId: 'p1',
		category: 'project',
		type: '提案提出',
		date: '2026-04-28',
		actor: '佐藤 健太',
		note: '情報システム部長・営業企画課長が同席。連携機能が好反応。競合A社の更新期限は2026/12。',
		attachments: [{ name: '営業支援基盤_提案書_v1.pdf', kind: '提案書' }]
	},
	{
		id: 'e-c1-14',
		customerId: 'c1',
		projectId: 'p1',
		category: 'customer',
		type: '電話',
		date: '2026-05-12',
		actor: '佐藤 健太',
		note: '提案レビュー。「前回サポートで苦労した。今回は本当に伴走してくれるのか」と強い懸念。導入支援体制の具体化が決め手。'
	},
	// ---------- c2 さくら流通 ----------
	{
		id: 'e-c2-01',
		customerId: 'c2',
		category: 'customer',
		type: '顧客登録',
		date: '2026-05-01',
		actor: '鈴木 美咲',
		note: '物流DXのWebセミナー申込を起点に顧客登録。'
	},
	{
		id: 'e-c2-02',
		customerId: 'c2',
		category: 'customer',
		type: '初回接触',
		date: '2026-05-08',
		actor: '鈴木 美咲',
		note: '物流DX推進室・田所課長とメールで初回コンタクト。倉庫システム連携に関心。'
	},
	{
		id: 'e-c2-03',
		customerId: 'c2',
		projectId: 'p3',
		category: 'project',
		type: '案件作成',
		date: '2026-05-10',
		actor: '鈴木 美咲',
		note: '倉庫管理連携CRM導入の案件を起票。'
	},
	{
		id: 'e-c2-04',
		customerId: 'c2',
		projectId: 'p3',
		category: 'project',
		type: 'ヒアリング',
		date: '2026-05-14',
		actor: '鈴木 美咲',
		note: '倉庫システム（自社開発WMS）との在庫連携が必須要件。API連携の実績を求められた。'
	},
	{
		id: 'e-c2-05',
		customerId: 'c2',
		projectId: 'p3',
		category: 'project',
		type: '提案提出',
		date: '2026-05-20',
		actor: '鈴木 美咲',
		note: 'WMS連携事例を添えて提案。担当課長は機能を高評価。',
		attachments: [{ name: '倉庫連携CRM提案書.pdf', kind: '提案書' }]
	},
	{
		id: 'e-c2-06',
		customerId: 'c2',
		projectId: 'p3',
		category: 'project',
		type: '見積提出',
		date: '2026-05-26',
		actor: '鈴木 美咲',
		note: '相見積もり3社の中位価格。「他社より2割高い、決裁の根拠が要る」。ROI試算（年1,800時間削減）で追撃予定。',
		attachments: [{ name: '倉庫連携CRM見積書.pdf', kind: '見積書' }]
	},
	// ---------- c3 グリーンフィールド食品 ----------
	{
		id: 'e-c3-01',
		customerId: 'c3',
		category: 'customer',
		type: '顧客登録',
		date: '2026-05-12',
		actor: '高橋 涼',
		note: '北日本飲料からの紹介で顧客登録。'
	},
	{
		id: 'e-c3-02',
		customerId: 'c3',
		category: 'customer',
		type: '初回接触',
		date: '2026-05-18',
		actor: '高橋 涼',
		note: '社長・経営企画部長とオンラインで初回面談。「（紹介元と）同じ成果を出したい」と期待大。'
	},
	{
		id: 'e-c3-03',
		customerId: 'c3',
		projectId: 'p4',
		category: 'project',
		type: '案件作成',
		date: '2026-05-18',
		actor: '高橋 涼',
		note: 'SFA新規導入の案件を起票。営業25名規模、導入障壁は低い。'
	},
	{
		id: 'e-c3-04',
		customerId: 'c3',
		projectId: 'p4',
		category: 'project',
		type: 'ヒアリング',
		date: '2026-05-22',
		actor: '高橋 涼',
		note: '来期からの全社展開を希望。スピード重視。'
	},
	{
		id: 'e-c3-05',
		customerId: 'c3',
		projectId: 'p4',
		category: 'project',
		type: '提案提出',
		date: '2026-05-26',
		actor: '高橋 涼',
		note: '最短導入プランを提案。前のめりな反応。',
		attachments: [{ name: 'SFA導入提案書.pdf', kind: '提案書' }]
	},
	{
		id: 'e-c3-06',
		customerId: 'c3',
		projectId: 'p4',
		category: 'project',
		type: '見積提出',
		date: '2026-05-29',
		actor: '高橋 涼',
		note: '620万円で見積提示。即決の意向。',
		attachments: [{ name: 'SFA導入見積書.pdf', kind: '見積書' }]
	},
	{
		id: 'e-c3-07',
		customerId: 'c3',
		projectId: 'p4',
		category: 'project',
		type: '受注',
		date: '2026-06-01',
		actor: '高橋 涼',
		note: 'SFA新規導入を受注。紹介経由でスピード成約。',
		amount: 6_200_000,
		margin: 42,
		attachments: [{ name: 'SFA導入契約書.pdf', kind: '契約書' }]
	},
	// ---------- c4 みやこ建設 ----------
	{
		id: 'e-c4-01',
		customerId: 'c4',
		category: 'customer',
		type: '顧客登録',
		date: '2026-05-10',
		actor: '佐藤 健太',
		note: '建設業向け案件管理の問い合わせフォーム経由で顧客登録。'
	},
	{
		id: 'e-c4-02',
		customerId: 'c4',
		projectId: 'p5',
		category: 'project',
		type: '案件作成',
		date: '2026-05-15',
		actor: '佐藤 健太',
		note: '案件管理システム導入の案件を起票。'
	},
	{
		id: 'e-c4-03',
		customerId: 'c4',
		projectId: 'p5',
		category: 'project',
		type: 'ヒアリング',
		date: '2026-05-20',
		actor: '佐藤 健太',
		note: '「現場ごとに進捗管理がバラバラ。全社で可視化したい」。稟議は役員会承認必須、次回は6/15。'
	},
	// ---------- c5 ネクサス情報システム ----------
	{
		id: 'e-c5-01',
		customerId: 'c5',
		category: 'customer',
		type: '顧客登録',
		date: '2026-05-20',
		actor: '鈴木 美咲',
		note: 'パートナー経由の紹介で顧客登録。SIer、評価基準が厳格。'
	},
	{
		id: 'e-c5-02',
		customerId: 'c5',
		category: 'customer',
		type: '初回接触',
		date: '2026-05-28',
		actor: '鈴木 美咲',
		note: '技術統括部・近藤主任とオンラインで初回商談。「まず技術的に自社要件を満たすか検証したい」。'
	},
	{
		id: 'e-c5-03',
		customerId: 'c5',
		projectId: 'p6',
		category: 'project',
		type: '案件作成',
		date: '2026-05-28',
		actor: '鈴木 美咲',
		note: 'SFA PoC の案件を起票。PoC設計の品質が勝敗を分ける。'
	},
	// ---------- c6 北日本飲料（高LTV・リピート） ----------
	{
		id: 'e-c6-01',
		customerId: 'c6',
		category: 'customer',
		type: '顧客登録',
		date: '2023-04-10',
		actor: '高橋 涼',
		note: '飲料メーカー。DX推進の引き合いから顧客登録。'
	},
	{
		id: 'e-c6-02',
		customerId: 'c6',
		projectId: 'p7',
		category: 'project',
		type: '案件作成',
		date: '2023-04-20',
		actor: '高橋 涼',
		note: 'SFA導入の案件を起票。'
	},
	{
		id: 'e-c6-03',
		customerId: 'c6',
		projectId: 'p7',
		category: 'project',
		type: '受注',
		date: '2023-06-20',
		actor: '高橋 涼',
		note: '初回案件 SFA導入を受注。関係構築の起点。',
		amount: 8_000_000,
		margin: 45,
		attachments: [{ name: 'SFA契約書_2023.pdf', kind: '契約書' }]
	},
	{
		id: 'e-c6-04',
		customerId: 'c6',
		projectId: 'p7',
		category: 'project',
		type: '納品',
		date: '2023-09-30',
		actor: '高橋 涼',
		note: 'SFA導入を完了。現場定着も良好。'
	},
	{
		id: 'e-c6-05',
		customerId: 'c6',
		category: 'customer',
		type: '担当者追加',
		date: '2024-09-01',
		actor: '高橋 涼',
		note: 'DX推進部・今井部長を新たにキーパーソンとして登録。'
	},
	{
		id: 'e-c6-06',
		customerId: 'c6',
		projectId: 'p8',
		category: 'project',
		type: '案件作成',
		date: '2024-09-05',
		actor: '高橋 涼',
		note: 'SFA活用の発展として BI分析基盤の案件を起票（アップセル）。'
	},
	{
		id: 'e-c6-07',
		customerId: 'c6',
		projectId: 'p8',
		category: 'project',
		type: '受注',
		date: '2024-11-15',
		actor: '高橋 涼',
		note: 'BI分析基盤構築を受注。2件目の継続発注。',
		amount: 12_000_000,
		margin: 40,
		attachments: [{ name: 'BI基盤契約書_2024.pdf', kind: '契約書' }]
	},
	{
		id: 'e-c6-08',
		customerId: 'c6',
		projectId: 'p8',
		category: 'project',
		type: '納品',
		date: '2025-03-31',
		actor: '高橋 涼',
		note: 'BI分析基盤を納品。経営ダッシュボードが定着。'
	},
	{
		id: 'e-c6-09',
		customerId: 'c6',
		projectId: 'p9',
		category: 'project',
		type: '案件作成',
		date: '2026-01-15',
		actor: '高橋 涼',
		note: 'AI需要予測基盤の案件を起票。蓄積データの活用提案。'
	},
	{
		id: 'e-c6-10',
		customerId: 'c6',
		projectId: 'p9',
		category: 'project',
		type: '受注',
		date: '2026-03-10',
		actor: '高橋 涼',
		note: 'AI需要予測基盤を受注。3件目の継続発注で過去最大規模。',
		amount: 15_000_000,
		margin: 38,
		attachments: [{ name: 'AI予測基盤契約書_2026.pdf', kind: '契約書' }]
	},
	{
		id: 'e-c6-11',
		customerId: 'c6',
		projectId: 'p9',
		category: 'project',
		type: '開発開始',
		date: '2026-04-01',
		actor: '高橋 涼',
		note: '要件定義を完了し開発フェーズへ移行。'
	},
	{
		id: 'e-c6-12',
		customerId: 'c6',
		category: 'customer',
		type: '定例会',
		date: '2026-05-15',
		actor: '高橋 涼',
		note: '月次定例。AI予測の進捗共有に加え、グループ会社への横展開を打診された。'
	}
];

// ---------- アクセサ ----------
export function getCustomer(id: string): Customer | undefined {
	return customers.find((c) => c.id === id);
}

export function getProject(id: string): Project | undefined {
	return projects.find((p) => p.id === id);
}
