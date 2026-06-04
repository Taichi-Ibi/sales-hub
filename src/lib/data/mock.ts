import type { Activity, Company, Deal, Person, User } from './types';

export const TODAY = '2026-06-04';

export const users: User[] = [
	{ id: 'u1', name: '佐藤 健太', email: 'k.sato@example.com', avatarColor: '#6C5CE7' },
	{ id: 'u2', name: '鈴木 美咲', email: 'm.suzuki@example.com', avatarColor: '#00B894' },
	{ id: 'u3', name: '高橋 涼', email: 'r.takahashi@example.com', avatarColor: '#E17055' }
];

export const companies: Company[] = [
	{
		id: 'co1',
		name: 'Toyo Medical Manufacturing',
		domain: 'toyo-medical.co.jp',
		industry: 'Healthcare',
		employees: 1200,
		annualRevenue: '¥12B',
		description: 'Leading medical device manufacturer specializing in diagnostic equipment.',
		createdAt: '2024-02-15',
		ownerId: 'u1',
		tags: ['Enterprise', 'Healthcare']
	},
	{
		id: 'co2',
		name: 'Sakura Logistics Holdings',
		domain: 'sakura-logi.co.jp',
		industry: 'Logistics',
		employees: 4500,
		annualRevenue: '¥45B',
		description: 'National warehousing and logistics network with DX transformation initiatives.',
		createdAt: '2026-05-01',
		ownerId: 'u2',
		tags: ['Enterprise', 'Logistics']
	},
	{
		id: 'co3',
		name: 'Greenfield Foods',
		domain: 'greenfield-foods.co.jp',
		industry: 'Food & Beverage',
		employees: 600,
		annualRevenue: '¥3.2B',
		description: 'Mid-market food manufacturer expanding DX capabilities.',
		createdAt: '2026-05-12',
		ownerId: 'u3',
		tags: ['Mid-Market', 'Referral']
	},
	{
		id: 'co4',
		name: 'Miyako Construction',
		domain: 'miyako-const.co.jp',
		industry: 'Construction',
		employees: 2800,
		annualRevenue: '¥28B',
		description: 'Major construction company seeking project management modernization.',
		createdAt: '2026-05-10',
		ownerId: 'u1',
		tags: ['Enterprise', 'Construction']
	},
	{
		id: 'co5',
		name: 'Nexus Information Systems',
		domain: 'nexus-is.co.jp',
		industry: 'Technology',
		employees: 900,
		annualRevenue: '¥8B',
		description: 'System integrator with strict technical evaluation process.',
		createdAt: '2026-05-20',
		ownerId: 'u2',
		tags: ['Mid-Market', 'Technology']
	},
	{
		id: 'co6',
		name: 'Kita Nihon Beverages',
		domain: 'kitanihon-bev.co.jp',
		industry: 'Food & Beverage',
		employees: 3200,
		annualRevenue: '¥35B',
		description: 'Premium account with 3-year relationship, repeat buyer, key reference customer.',
		createdAt: '2023-04-10',
		ownerId: 'u3',
		tags: ['Enterprise', 'Key Account']
	}
];

export const people: Person[] = [
	{
		id: 'pe1',
		firstName: '隆',
		lastName: '大野',
		email: 't.ohno@toyo-medical.co.jp',
		phone: '03-1234-5678',
		title: 'Director of IT',
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
		title: 'Sales Planning Manager',
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
		title: 'Logistics DX Manager',
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
		title: 'CEO',
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
		title: 'Head of Corporate Planning',
		companyId: 'co3',
		createdAt: '2026-05-18',
		ownerId: 'u3'
	},
	{
		id: 'pe6',
		firstName: '浩二',
		lastName: '山本',
		email: 'k.yamamoto@miyako-const.co.jp',
		title: 'Administration Manager',
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
		title: 'Technical Lead',
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
		title: 'Executive Officer / CDO',
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
		title: 'DX Division Director',
		companyId: 'co6',
		createdAt: '2024-09-01',
		ownerId: 'u3'
	},
	{
		id: 'pe10',
		firstName: '亮',
		lastName: '長谷川',
		email: 'r.hasegawa@kitanihon-bev.co.jp',
		title: 'IT Infrastructure Manager',
		companyId: 'co6',
		createdAt: '2024-09-01',
		ownerId: 'u3'
	}
];

export const deals: Deal[] = [
	{
		id: 'd1',
		name: 'Sales Platform Replacement',
		companyId: 'co1',
		contactId: 'pe1',
		stage: 'Proposal',
		value: 18_000_000,
		currency: 'JPY',
		probability: 40,
		expectedCloseDate: '2026-06-30',
		createdAt: '2026-04-08',
		ownerId: 'u1',
		description: 'Replace legacy CRM with modern sales platform. Key concern: migration support.'
	},
	{
		id: 'd2',
		name: 'Support & Maintenance Contract',
		companyId: 'co1',
		contactId: 'pe1',
		stage: 'Closed Won',
		value: 5_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2024-04-25',
		createdAt: '2024-03-01',
		ownerId: 'u1',
		description: 'Annual maintenance and support contract.'
	},
	{
		id: 'd3',
		name: 'Warehouse CRM Integration',
		companyId: 'co2',
		contactId: 'pe3',
		stage: 'Negotiation',
		value: 9_500_000,
		currency: 'JPY',
		probability: 55,
		expectedCloseDate: '2026-06-20',
		createdAt: '2026-05-10',
		ownerId: 'u2',
		description: 'CRM integration with proprietary WMS. API connectivity is a hard requirement.'
	},
	{
		id: 'd4',
		name: 'SFA New Implementation',
		companyId: 'co3',
		contactId: 'pe4',
		stage: 'Closed Won',
		value: 6_200_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2026-06-01',
		createdAt: '2026-05-18',
		ownerId: 'u3',
		description: 'Fast-track SFA rollout for 25 sales reps. Referral deal from Kita Nihon.'
	},
	{
		id: 'd5',
		name: 'Project Management System',
		companyId: 'co4',
		contactId: 'pe6',
		stage: 'Discovery',
		value: 14_000_000,
		currency: 'JPY',
		probability: 20,
		expectedCloseDate: '2026-08-29',
		createdAt: '2026-05-15',
		ownerId: 'u1',
		description: 'Company-wide visibility into project progress. Board approval required (15th each month).'
	},
	{
		id: 'd6',
		name: 'SFA Proof of Concept',
		companyId: 'co5',
		contactId: 'pe7',
		stage: 'Qualification',
		value: 4_800_000,
		currency: 'JPY',
		probability: 15,
		expectedCloseDate: '2026-09-30',
		createdAt: '2026-05-28',
		ownerId: 'u2',
		description: 'PoC evaluation with strict technical criteria. Quality of PoC design is critical.'
	},
	{
		id: 'd7',
		name: 'SFA Initial Deployment',
		companyId: 'co6',
		contactId: 'pe8',
		stage: 'Closed Won',
		value: 8_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2023-06-20',
		createdAt: '2023-04-20',
		ownerId: 'u3',
		description: 'First deal. Established the relationship foundation.'
	},
	{
		id: 'd8',
		name: 'BI Analytics Platform',
		companyId: 'co6',
		contactId: 'pe9',
		stage: 'Closed Won',
		value: 12_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2024-11-15',
		createdAt: '2024-09-05',
		ownerId: 'u3',
		description: 'Upsell from SFA success. Executive dashboard now in daily use.'
	},
	{
		id: 'd9',
		name: 'AI Demand Forecasting',
		companyId: 'co6',
		contactId: 'pe8',
		stage: 'Closed Won',
		value: 15_000_000,
		currency: 'JPY',
		probability: 100,
		expectedCloseDate: '2026-03-10',
		createdAt: '2026-01-15',
		ownerId: 'u3',
		description: 'Third consecutive deal. Largest engagement to date. Development in progress.'
	},
	{
		id: 'd10',
		name: 'BI Dashboard Project',
		companyId: 'co1',
		contactId: 'pe2',
		stage: 'Closed Lost',
		value: 7_000_000,
		currency: 'JPY',
		probability: 0,
		expectedCloseDate: '2026-02-15',
		createdAt: '2025-12-10',
		ownerId: 'u1',
		description: 'Lost to competitor due to existing platform affinity. Price gap was minimal.'
	}
];

export const activities: Activity[] = [
	{
		id: 'a1',
		type: 'meeting',
		title: 'Initial discovery call',
		body: 'Discussed current pain points with legacy CRM. Reporting takes hours weekly. Running competitor A + Excel.',
		date: '2026-04-10',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a2',
		type: 'note',
		title: 'Proposal submitted',
		body: 'Presented to IT Director and Sales Planning Manager. Integration capabilities well received. Competitor A contract expires 2026/12.',
		date: '2026-04-28',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a3',
		type: 'call',
		title: 'Follow-up on proposal concerns',
		body: '"We struggled with support last time. Will you actually provide hands-on onboarding?" Strong concern about implementation support.',
		date: '2026-05-12',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1',
		personId: 'pe1'
	},
	{
		id: 'a4',
		type: 'email',
		title: 'Initial outreach from webinar',
		body: 'Connected with DX team lead after logistics webinar signup. Interest in warehouse system integration.',
		date: '2026-05-08',
		userId: 'u2',
		companyId: 'co2',
		personId: 'pe3'
	},
	{
		id: 'a5',
		type: 'meeting',
		title: 'Requirements gathering',
		body: 'WMS (in-house) integration is a hard requirement. Need API connectivity proof. Asked for case studies.',
		date: '2026-05-14',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a6',
		type: 'note',
		title: 'Proposal with WMS case study',
		body: 'Presented WMS integration case study. Manager impressed with functionality. Moving to commercial discussion.',
		date: '2026-05-20',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a7',
		type: 'note',
		title: 'Pricing discussion — competitive pressure',
		body: '"20% higher than other vendors. Need ROI justification for approval." Preparing ROI analysis (est. 1,800 hrs/yr savings).',
		date: '2026-05-26',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3',
		personId: 'pe3'
	},
	{
		id: 'a8',
		type: 'meeting',
		title: 'First meeting via referral',
		body: 'CEO and Head of Corporate Planning attended. "We want the same results as Kita Nihon." High expectations, positive energy.',
		date: '2026-05-18',
		userId: 'u3',
		companyId: 'co3',
		dealId: 'd4',
		personId: 'pe4'
	},
	{
		id: 'a9',
		type: 'stage_change',
		title: 'Deal closed — SFA New Implementation',
		body: 'Referral-driven fast close. Contract signed at ¥6.2M. 14-day cycle from first contact.',
		date: '2026-06-01',
		userId: 'u3',
		companyId: 'co3',
		dealId: 'd4',
		personId: 'pe4'
	},
	{
		id: 'a10',
		type: 'meeting',
		title: 'Discovery session',
		body: '"Each site tracks progress differently. We need company-wide visibility." Board approval required — next window June 15.',
		date: '2026-05-20',
		userId: 'u1',
		companyId: 'co4',
		dealId: 'd5',
		personId: 'pe6'
	},
	{
		id: 'a11',
		type: 'meeting',
		title: 'Technical evaluation kick-off',
		body: '"First we need to verify technical feasibility against our requirements." Strict evaluation framework expected.',
		date: '2026-05-28',
		userId: 'u2',
		companyId: 'co5',
		dealId: 'd6',
		personId: 'pe7'
	},
	{
		id: 'a12',
		type: 'meeting',
		title: 'Monthly review — expansion opportunity',
		body: 'AI forecasting dev on track. Client floated group company expansion. Major upsell potential.',
		date: '2026-05-15',
		userId: 'u3',
		companyId: 'co6',
		dealId: 'd9',
		personId: 'pe8'
	},
	{
		id: 'a13',
		type: 'stage_change',
		title: 'AI Demand Forecasting — development started',
		body: 'Requirements finalized. Moving to development phase. Target delivery: 2026-10-31.',
		date: '2026-04-01',
		userId: 'u3',
		companyId: 'co6',
		dealId: 'd9'
	},
	{
		id: 'a14',
		type: 'task',
		title: 'Prepare ROI analysis for Sakura Logistics',
		body: 'Need detailed ROI calculation showing 1,800 hr/year savings to justify 20% price premium.',
		date: '2026-05-27',
		userId: 'u2',
		companyId: 'co2',
		dealId: 'd3'
	},
	{
		id: 'a15',
		type: 'task',
		title: 'Draft implementation support plan',
		body: 'Address Toyo Medical concerns about onboarding. Need concrete timeline and dedicated support structure.',
		date: '2026-05-13',
		userId: 'u1',
		companyId: 'co1',
		dealId: 'd1'
	},
	{
		id: 'a16',
		type: 'stage_change',
		title: 'BI Dashboard — Lost to competitor',
		body: 'Competitor A platform affinity was the deciding factor. Price gap was minimal.',
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
