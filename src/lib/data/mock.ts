import type { Activity, Company, Deal, Person, User } from './types';

export const TODAY = '2026-06-04';

export const users: User[] = [
	{ id: 'u1', name: '佐藤 健太', email: 'k.sato@example.com', avatarColor: '#4f46e5' },
	{ id: 'u2', name: '鈴木 美咲', email: 'm.suzuki@example.com', avatarColor: '#10b981' },
	{ id: 'u3', name: '高橋 涼', email: 'r.takahashi@example.com', avatarColor: '#ef4444' }
];

export const companies: Company[] = [
	{
		id: 'co1',
		name: '東洋メディカル製造',
		domain: 'toyo-medical.co.jp',
		industry: 'ヘルスケア',
		employees: 1200,
		annualRevenue: '120億円',
		description: '診断機器を専門とする大手医療機器メーカー。',
		createdAt: '2024-02-15',
		ownerId: 'u1',
		tags: ['エンタープライズ', 'ヘルスケア']
	},
	{
		id: 'co2',
		name: 'サクラロジスティクスホールディングス',
		domain: 'sakura-logi.co.jp',
		industry: '物流',
		employees: 4500,
		annualRevenue: '450億円',
		description: '全国規模の倉庫・物流ネットワークを持ち、DX変革に取り組む企業。',
		createdAt: '2026-05-01',
		ownerId: 'u2',
		tags: ['エンタープライズ', '物流']
	},
	{
		id: 'co3',
		name: 'グリーンフィールド食品',
		domain: 'greenfield-foods.co.jp',
		industry: '食品・飲料',
		employees: 600,
		annualRevenue: '32億円',
		description: 'DX対応を拡大している中堅食品メーカー。',
		createdAt: '2026-05-12',
		ownerId: 'u3',
		tags: ['ミッドマーケット', '紹介']
	},
	{
		id: 'co4',
		name: '都建設',
		domain: 'miyako-const.co.jp',
		industry: '建設',
		employees: 2800,
		annualRevenue: '280億円',
		description: 'プロジェクト管理の刷新を目指す大手建設会社。',
		createdAt: '2026-05-10',
		ownerId: 'u1',
		tags: ['エンタープライズ', '建設']
	},
	{
		id: 'co5',
		name: 'ネクサス情報システム',
		domain: 'nexus-is.co.jp',
		industry: 'テクノロジー',
		employees: 900,
		annualRevenue: '80億円',
		description: '厳格な技術評価プロセスを持つシステムインテグレーター。',
		createdAt: '2026-05-20',
		ownerId: 'u2',
		tags: ['ミッドマーケット', 'テクノロジー']
	},
	{
		id: 'co6',
		name: '北日本ビバレッジ',
		domain: 'kitanihon-bev.co.jp',
		industry: '食品・飲料',
		employees: 3200,
		annualRevenue: '350億円',
		description: '3年間の取引実績を持つ重要顧客。リピート購入があり、主要なリファレンス顧客。',
		createdAt: '2023-04-10',
		ownerId: 'u3',
		tags: ['エンタープライズ', '重要顧客']
	}
];

export const people: Person[] = [
	{
		id: 'pe1',
		firstName: '隆',
		lastName: '大野',
		email: 't.ohno@toyo-medical.co.jp',
		phone: '03-1234-5678',
		title: 'IT部長',
		companyId: 'co1',
		createdAt: '2024-02-20',
		ownerId: 'u1',
		isPrimary: true
	},
	{
		id: 'pe2',
		firstName: '彩',
		lastName: '西村',
		email: 'a.nishimura@toyo-medical.co.jp',
		title: '営業企画マネージャー',
		companyId: 'co1',
		createdAt: '2024-02-20',
		ownerId: 'u1'
	},
	{
		id: 'pe3',
		firstName: '健',
		lastName: '田所',
		email: 'k.tadokoro@sakura-logi.co.jp',
		phone: '06-2345-6789',
		title: '物流DXマネージャー',
		companyId: 'co2',
		createdAt: '2026-05-08',
		ownerId: 'u2',
		isPrimary: true
	},
	{
		id: 'pe4',
		firstName: '大輔',
		lastName: '森',
		email: 'd.mori@greenfield-foods.co.jp',
		phone: '052-3456-7890',
		title: '代表取締役社長',
		companyId: 'co3',
		createdAt: '2026-05-18',
		ownerId: 'u3',
		isPrimary: true
	},
	{
		id: 'pe5',
		firstName: '直樹',
		lastName: '岡田',
		email: 'n.okada@greenfield-foods.co.jp',
		title: '経営企画部長',
		companyId: 'co3',
		createdAt: '2026-05-18',
		ownerId: 'u3'
	},
	{
		id: 'pe6',
		firstName: '浩二',
		lastName: '山本',
		email: 'k.yamamoto@miyako-const.co.jp',
		title: '管理部マネージャー',
		companyId: 'co4',
		createdAt: '2026-05-10',
		ownerId: 'u1',
		isPrimary: true
	},
	{
		id: 'pe7',
		firstName: '拓',
		lastName: '近藤',
		email: 't.kondo@nexus-is.co.jp',
		phone: '03-4567-8901',
		title: 'テクニカルリード',
		companyId: 'co5',
		createdAt: '2026-05-28',
		ownerId: 'u2',
		isPrimary: true
	},
	{
		id: 'pe8',
		firstName: '誠',
		lastName: '三浦',
		email: 'm.miura@kitanihon-bev.co.jp',
		phone: '011-5678-9012',
		title: '執行役員 / CDO',
		companyId: 'co6',
		createdAt: '2023-04-10',
		ownerId: 'u3',
		isPrimary: true
	},
	{
		id: 'pe9',
		firstName: '香織',
		lastName: '今井',
		email: 'k.imai@kitanihon-bev.co.jp',
		title: 'DX推進部長',
		companyId: 'co6',
		createdAt: '2024-09-01',
		ownerId: 'u3'
	},
	{
		id: 'pe10',
		firstName: '亮',
		lastName: '長谷川',
		email: 'r.hasegawa@kitanihon-bev.co.jp',
		title: 'ITインフラマネージャー',
		companyId: 'co6',
		createdAt: '2024-09-01',
		ownerId: 'u3'
	}
];

export const deals: Deal[] = [
	{
		id: 'd1',
		name: '営業基盤リプレース',
		companyId: 'co1',
		contactId: 'pe1',
		stage: 'Proposal',
		value: 18_000_000,
		currency: 'JPY',
		probability: 40,
		expectedCloseDate: '2026-06-30',
		createdAt: '2026-04-08',
		ownerId: 'u1',
		description: 'レガシーCRMを最新の営業基盤へ刷新。主な懸念点：移行支援。'
	},
	{
		id: 'd2',
		name: '保守・サポート契約',
		companyId: 'co1',
		contactId: 'pe1',
		stage: 'Closed Won',
		value: 5_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2024-04-25',
		createdAt: '2024-03-01',
		ownerId: 'u1',
		description: '年間保守・サポート契約。'
	},
	{
		id: 'd3',
		name: '倉庫CRM連携',
		companyId: 'co2',
		contactId: 'pe3',
		stage: 'Negotiation',
		value: 9_500_000,
		currency: 'JPY',
		probability: 55,
		expectedCloseDate: '2026-06-20',
		createdAt: '2026-05-10',
		ownerId: 'u2',
		description: '自社WMSとのCRM連携。API連携が必須要件。'
	},
	{
		id: 'd4',
		name: 'SFA新規導入',
		companyId: 'co3',
		contactId: 'pe4',
		stage: 'Closed Won',
		value: 6_200_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2026-06-01',
		createdAt: '2026-05-18',
		ownerId: 'u3',
		description: '営業担当25名向けのSFA早期展開。北日本ビバレッジからの紹介案件。'
	},
	{
		id: 'd5',
		name: 'プロジェクト管理システム',
		companyId: 'co4',
		contactId: 'pe6',
		stage: 'Discovery',
		value: 14_000_000,
		currency: 'JPY',
		probability: 20,
		expectedCloseDate: '2026-08-29',
		createdAt: '2026-05-15',
		ownerId: 'u1',
		description: '全社的なプロジェクト進捗の可視化。取締役会の承認が必要（毎月15日）。'
	},
	{
		id: 'd6',
		name: 'SFA概念実証（PoC）',
		companyId: 'co5',
		contactId: 'pe7',
		stage: 'Qualification',
		value: 4_800_000,
		currency: 'JPY',
		probability: 15,
		expectedCloseDate: '2026-09-30',
		createdAt: '2026-05-28',
		ownerId: 'u2',
		description: '厳格な技術基準でのPoC評価。PoC設計の品質が重要。'
	},
	{
		id: 'd7',
		name: 'SFA初期導入',
		companyId: 'co6',
		contactId: 'pe8',
		stage: 'Closed Won',
		value: 8_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2023-06-20',
		createdAt: '2023-04-20',
		ownerId: 'u3',
		description: '最初の案件。関係構築の基盤を築いた。'
	},
	{
		id: 'd8',
		name: 'BI分析基盤',
		companyId: 'co6',
		contactId: 'pe9',
		stage: 'Closed Won',
		value: 12_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2024-11-15',
		createdAt: '2024-09-05',
		ownerId: 'u3',
		description: 'SFAの成功からのアップセル。経営層向けダッシュボードが日常的に活用されている。'
	},
	{
		id: 'd9',
		name: 'AI需要予測',
		companyId: 'co6',
		contactId: 'pe8',
		stage: 'Closed Won',
		value: 15_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2026-03-10',
		createdAt: '2026-01-15',
		ownerId: 'u3',
		description: '3件連続の案件。これまでで最大規模。現在開発中。'
	},
	{
		id: 'd10',
		name: 'BIダッシュボード案件',
		companyId: 'co1',
		contactId: 'pe2',
		stage: 'Closed Lost',
		value: 7_000_000,
		currency: 'JPY',
		probability: 0,
		expectedCloseDate: '2026-02-15',
		createdAt: '2025-12-10',
		ownerId: 'u1',
		description: '既存プラットフォームとの親和性により競合に失注。価格差は僅かだった。'
	}
];

export const activities: Activity[] = [
	{
		id: 'a1',
		type: 'meeting',
		title: '初回ヒアリング',
		body: '既存CRMの課題についてヒアリング。レポート作成に毎週数時間を要している。競合A製品とExcelを併用中。',
		date: '2026-04-10',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a2',
		type: 'note',
		title: '提案書を提出',
		body: 'IT部長と営業企画マネージャーに提案。連携機能が好評。競合A製品の契約は2026年12月で満了。',
		date: '2026-04-28',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a3',
		type: 'call',
		title: '提案に関する懸念のフォローアップ',
		body: '「前回はサポートに苦労した。本当に手厚い導入支援をしてもらえるのか？」導入支援に強い懸念。',
		date: '2026-05-12',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a4',
		type: 'email',
		title: 'ウェビナーからの初回アプローチ',
		body: '物流ウェビナー申込後にDXチームリーダーと接触。倉庫システム連携に関心。',
		date: '2026-05-08',
		userId: 'u2',
		companyId: 'co2',
		personId: 'pe3'
	},
	{
		id: 'a5',
		type: 'meeting',
		title: '要件ヒアリング',
		body: '自社WMSとの連携が必須要件。API連携の実証が必要。事例の提示を依頼された。',
		date: '2026-05-14',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a6',
		type: 'note',
		title: 'WMS連携事例を交えた提案',
		body: 'WMS連携の事例を提示。マネージャーが機能性を高く評価。条件交渉フェーズへ移行。',
		date: '2026-05-20',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a7',
		type: 'note',
		title: '価格交渉 — 競合プレッシャー',
		body: '「他社より20%高い。承認にはROIの根拠が必要だ。」ROI分析を準備中（年間約1,800時間の削減見込み）。',
		date: '2026-05-26',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a8',
		type: 'meeting',
		title: '紹介による初回面談',
		body: '代表取締役社長と経営企画部長が出席。「北日本ビバレッジと同じ成果を出したい。」期待が高く前向きな雰囲気。',
		date: '2026-05-18',
		userId: 'u3',
		companyId: 'co3',
		dealId: 'd4',
		personId: 'pe4'
	},
	{
		id: 'a9',
		type: 'stage_change',
		title: '受注 — SFA新規導入',
		body: '紹介による早期受注。620万円で契約締結。初回接触から14日でクローズ。',
		date: '2026-06-01',
		userId: 'u3',
		companyId: 'co3',
		dealId: 'd4',
		personId: 'pe4'
	},
	{
		id: 'a10',
		type: 'meeting',
		title: 'ニーズ把握ミーティング',
		body: '「各現場で進捗管理の方法がバラバラ。全社的な可視化が必要だ。」取締役会の承認が必要 — 次回は6月15日。',
		date: '2026-05-20',
		userId: 'u1',
		companyId: 'co4',
		dealId: 'd5',
		personId: 'pe6'
	},
	{
		id: 'a11',
		type: 'meeting',
		title: '技術評価のキックオフ',
		body: '「まず当社の要件に対する技術的な実現可能性を検証する必要がある。」厳格な評価フレームワークが想定される。',
		date: '2026-05-28',
		userId: 'u2',
		companyId: 'co5',
		dealId: 'd6',
		personId: 'pe7'
	},
	{
		id: 'a12',
		type: 'meeting',
		title: '月次レビュー — 拡大の機会',
		body: 'AI予測の開発は順調。顧客からグループ会社への展開の打診あり。大型アップセルの可能性。',
		date: '2026-05-15',
		userId: 'u3',
		companyId: 'co6',
		dealId: 'd9',
		personId: 'pe8'
	},
	{
		id: 'a13',
		type: 'stage_change',
		title: 'AI需要予測 — 開発開始',
		body: '要件が確定。開発フェーズへ移行。納品目標：2026年10月31日。',
		date: '2026-04-01',
		userId: 'u3',
		companyId: 'co6',
		dealId: 'd9'
	},
	{
		id: 'a14',
		type: 'task',
		title: 'サクラロジスティクス向けROI分析の作成',
		body: '20%の価格プレミアムを正当化するため、年間1,800時間削減を示す詳細なROI試算が必要。',
		date: '2026-05-27',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3'
	},
	{
		id: 'a15',
		type: 'task',
		title: '導入支援計画の草案作成',
		body: '東洋メディカルの導入に関する懸念に対応。具体的なスケジュールと専任サポート体制が必要。',
		date: '2026-05-13',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1'
	},
	{
		id: 'a16',
		type: 'stage_change',
		title: 'BIダッシュボード — 競合に失注',
		body: '競合A製品のプラットフォーム親和性が決め手となった。価格差は僅かだった。',
		date: '2026-02-15',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd10'
	}
];

export function getCompany(id: string): Company | undefined {
	return companies.find((c) => c.id === id);
}

export function getPerson(id: string): Person | undefined {
	return people.find((p) => p.id === id);
}

export function getDeal(id: string): Deal | undefined {
	return deals.find((d) => d.id === id);
}

export function getUser(id: string): User | undefined {
	return users.find((u) => u.id === id);
}
