import type { AppSettings, Deal, EventLog, Task } from './types.js';
import { STORAGE_KEYS } from './constants.js';

export interface SeedDeps {
	now?: () => Date;
	uuid?: () => string;
}

export interface SeedState {
	eventLogs: EventLog[];
	deals: Deal[];
	tasks: Task[];
	settings: AppSettings;
	isSeeded: boolean;
}

export function getInitialSettings(): AppSettings {
	return {
		maskingRules: [],
		allowedDomains: ['example-client.co.jp', 'bigcorp.com', 'partner-inc.jp'],
		assignmentRules: [],
		isAdmin: false
	};
}

export function isSeeded(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(STORAGE_KEYS.SEED_INITIALIZED) === 'true';
}

export function markSeeded(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEYS.SEED_INITIALIZED, 'true');
}

export function seedIfNeeded(state: SeedState, deps?: SeedDeps): SeedState {
	if (state.isSeeded || state.eventLogs.length > 0) return state;
	const seed = generateSeedData(deps);
	return { ...seed, isSeeded: true };
}

export function generateSeedData(deps?: SeedDeps): Omit<SeedState, 'isSeeded'> {
	const nowFn = deps?.now ?? (() => new Date());
	const uuid = deps?.uuid ?? (() => crypto.randomUUID());
	const base = nowFn();

	const ms = (n: number) => n * 24 * 60 * 60 * 1000;
	const daysAgo = (n: number) => new Date(base.getTime() - ms(n));
	const hoursFromNow = (h: number) => new Date(base.getTime() + h * 60 * 60 * 1000);
	const daysFromNow = (n: number) => new Date(base.getTime() + ms(n));

	const idA = uuid();
	const idB = uuid();
	const idC = uuid();
	const idD = uuid();

	const deals: Deal[] = [
		{
			id: idA,
			name: 'A社 SaaS導入支援',
			phase: 'decision_maker',
			assignee: '田中太郎',
			createdAt: daysAgo(30),
			updatedAt: daysAgo(2),
			phaseHistory: [
				{
					fromPhase: 'qualification',
					toPhase: 'issue_identification',
					transitionAt: daysAgo(25),
					operator: '田中太郎',
					changeType: 'manual'
				},
				{
					fromPhase: 'issue_identification',
					toPhase: 'value_proposition',
					transitionAt: daysAgo(18),
					operator: '田中太郎',
					changeType: 'manual'
				},
				{
					fromPhase: 'value_proposition',
					toPhase: 'decision_maker',
					transitionAt: daysAgo(8),
					operator: '田中太郎',
					changeType: 'ai_proposal_accepted'
				}
			]
		},
		{
			id: idB,
			name: 'B社 システムリプレース',
			phase: 'value_proposition',
			assignee: '鈴木一郎',
			createdAt: daysAgo(20),
			updatedAt: daysAgo(5),
			phaseHistory: [
				{
					fromPhase: 'qualification',
					toPhase: 'issue_identification',
					transitionAt: daysAgo(15),
					operator: '鈴木一郎',
					changeType: 'manual'
				},
				{
					fromPhase: 'issue_identification',
					toPhase: 'value_proposition',
					transitionAt: daysAgo(7),
					operator: '鈴木一郎',
					changeType: 'manual'
				}
			]
		},
		{
			id: idC,
			name: 'C社 新規開拓',
			phase: 'qualification',
			assignee: '田中太郎',
			createdAt: daysAgo(5),
			updatedAt: daysAgo(1),
			phaseHistory: []
		},
		{
			id: idD,
			name: 'D社 保守契約更新',
			phase: 'contract_agreement',
			assignee: '佐藤花子',
			createdAt: daysAgo(60),
			updatedAt: daysAgo(3),
			phaseHistory: [
				{
					fromPhase: 'qualification',
					toPhase: 'issue_identification',
					transitionAt: daysAgo(55),
					operator: '佐藤花子',
					changeType: 'manual'
				},
				{
					fromPhase: 'issue_identification',
					toPhase: 'value_proposition',
					transitionAt: daysAgo(45),
					operator: '佐藤花子',
					changeType: 'manual'
				},
				{
					fromPhase: 'value_proposition',
					toPhase: 'decision_maker',
					transitionAt: daysAgo(35),
					operator: '佐藤花子',
					changeType: 'manual'
				},
				{
					fromPhase: 'decision_maker',
					toPhase: 'risk_elimination',
					transitionAt: daysAgo(20),
					operator: '佐藤花子',
					changeType: 'manual'
				},
				{
					fromPhase: 'risk_elimination',
					toPhase: 'contract_agreement',
					transitionAt: daysAgo(7),
					operator: '佐藤花子',
					changeType: 'ai_proposal_accepted'
				}
			]
		}
	];

	const approved = (approvalAt: Date) => ({
		status: 'approved' as const,
		isMasked: false,
		approvalType: 'auto_no_masking_needed' as const,
		approvalAt,
		annotations: [],
		comments: [],
		isRead: true,
		isDeleted: false
	});

	const slackLogs: EventLog[] = [
		{
			id: uuid(),
			source: 'slack',
			title: 'A社 SaaS導入のキックオフについて',
			body: 'A社の田中様よりSaaS導入プロジェクトのキックオフMTG設定依頼がありました。来週中に日程調整お願いします。',
			timestamp: daysAgo(7),
			createdAt: daysAgo(7),
			slackSender: '田中太郎',
			slackChannel: 'sales-a-corp',
			threadTs: 'thread_001',
			dealId: idA,
			...approved(daysAgo(7))
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'A社 SaaS導入のキックオフについて (返信)',
			body: '了解しました。来週火曜日14時でいかがでしょうか。Zoom URLを送付します。',
			timestamp: daysAgo(7),
			createdAt: daysAgo(7),
			slackSender: '鈴木一郎',
			slackChannel: 'sales-a-corp',
			threadTs: 'thread_001',
			dealId: idA,
			...approved(daysAgo(7))
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'A社 SaaS導入のキックオフについて (返信2)',
			body: '田中様に連絡しました。火曜14時で確定します。資料の準備をお願いします。',
			timestamp: daysAgo(6),
			createdAt: daysAgo(6),
			slackSender: '田中太郎',
			slackChannel: 'sales-a-corp',
			threadTs: 'thread_001',
			dealId: idA,
			...approved(daysAgo(6))
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'B社 システム要件ヒアリング結果',
			body: 'B社の山田様からシステム要件をヒアリングしました。課題は処理速度とメンテナンスコストです。',
			timestamp: daysAgo(5),
			createdAt: daysAgo(5),
			slackSender: '鈴木一郎',
			slackChannel: 'sales-b-corp',
			threadTs: 'thread_002',
			dealId: idB,
			...approved(daysAgo(5))
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'B社 システム要件ヒアリング結果 (返信)',
			body: '要件整理資料を作成しました。来週の提案に向けて確認してください。コスト試算も添付します。',
			timestamp: daysAgo(4),
			createdAt: daysAgo(4),
			slackSender: '田中太郎',
			slackChannel: 'sales-b-corp',
			threadTs: 'thread_002',
			dealId: idB,
			status: 'approved',
			isMasked: false,
			approvalType: 'auto_no_masking_needed',
			approvalAt: daysAgo(4),
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'C社 新規リード情報',
			body: 'C社よりWebからのお問い合わせがありました。IT基盤刷新に興味をお持ちです。担当をアサインしてください。',
			timestamp: daysAgo(2),
			createdAt: daysAgo(2),
			slackSender: '山本拓海',
			slackChannel: 'sales-leads',
			dealId: idC,
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		},
		{
			id: uuid(),
			source: 'slack',
			title: 'D社 保守契約更新の確認',
			body: 'D社の保守契約が来月末で満了となります。更新意向を確認済み、契約書の最終確認待ちです。',
			timestamp: daysAgo(1),
			createdAt: daysAgo(1),
			slackSender: '佐藤花子',
			slackChannel: 'sales-d-corp',
			dealId: idD,
			status: 'approved',
			isMasked: false,
			approvalType: 'auto_no_masking_needed',
			approvalAt: daysAgo(1),
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		}
	];

	const emailA001 = 'email-a-001@example-client.co.jp';
	const emailA002 = 'email-a-002@estyle-inc.jp';
	const emailA003 = 'email-a-003@example-client.co.jp';
	const emailB001 = 'email-b-001@bigcorp.com';
	const emailB002 = 'email-b-002@estyle-inc.jp';

	const emailLogs: EventLog[] = [
		{
			id: uuid(),
			source: 'email',
			title: '[A社] SaaS導入のご提案について',
			body: 'ご提案書を拝受しました。来週中にご回答します。価格とサポート体制について詳細を伺いたいです。',
			timestamp: daysAgo(14),
			createdAt: daysAgo(14),
			emailFrom: 'tanaka@example-client.co.jp',
			emailTo: 'sales@estyle-inc.jp',
			emailSubject: '[A社] SaaS導入のご提案について',
			messageId: emailA001,
			dealId: idA,
			...approved(daysAgo(14))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'Re: [A社] SaaS導入のご提案について',
			body: 'ご連絡ありがとうございます。月額・年額プランをご用意しております。サポートは24h365日対応可能です。',
			timestamp: daysAgo(13),
			createdAt: daysAgo(13),
			emailFrom: 'suzuki@estyle-inc.jp',
			emailTo: 'tanaka@example-client.co.jp',
			emailSubject: 'Re: [A社] SaaS導入のご提案について',
			messageId: emailA002,
			inReplyTo: emailA001,
			references: [emailA001],
			dealId: idA,
			...approved(daysAgo(13))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'Re: Re: [A社] SaaS導入のご提案について',
			body: '資料を確認しました。年額プランで進めたいです。契約書ドラフトをお送りいただけますか。',
			timestamp: daysAgo(10),
			createdAt: daysAgo(10),
			emailFrom: 'tanaka@example-client.co.jp',
			emailTo: 'suzuki@estyle-inc.jp',
			emailSubject: 'Re: Re: [A社] SaaS導入のご提案について',
			messageId: emailA003,
			inReplyTo: emailA002,
			references: [emailA001, emailA002],
			dealId: idA,
			...approved(daysAgo(10))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'Re: Re: Re: [A社] SaaS導入のご提案について',
			body: '契約書ドラフトをお送りします。修正があればお知らせください。',
			timestamp: daysAgo(8),
			createdAt: daysAgo(8),
			emailFrom: 'suzuki@estyle-inc.jp',
			emailTo: 'tanaka@example-client.co.jp',
			emailSubject: 'Re: Re: Re: [A社] SaaS導入のご提案について',
			messageId: 'email-a-004@estyle-inc.jp',
			inReplyTo: emailA003,
			references: [emailA001, emailA002, emailA003],
			dealId: idA,
			...approved(daysAgo(8))
		},
		{
			id: uuid(),
			source: 'email',
			title: '[B社] システムリプレース要件定義書の送付',
			body: '要件定義書を作成しましたのでご確認ください。データ移行方式と並行稼働期間についてご意見をいただきたいです。',
			timestamp: daysAgo(12),
			createdAt: daysAgo(12),
			emailFrom: 'yamada@bigcorp.com',
			emailTo: 'sales@estyle-inc.jp',
			emailSubject: '[B社] システムリプレース要件定義書の送付',
			messageId: emailB001,
			dealId: idB,
			...approved(daysAgo(12))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'Re: [B社] システムリプレース要件定義書の送付',
			body: '要件定義書を確認しました。段階移行方式を提案します。並行稼働は3ヶ月想定です。',
			timestamp: daysAgo(11),
			createdAt: daysAgo(11),
			emailFrom: 'tanaka@estyle-inc.jp',
			emailTo: 'yamada@bigcorp.com',
			emailSubject: 'Re: [B社] システムリプレース要件定義書の送付',
			messageId: emailB002,
			inReplyTo: emailB001,
			references: [emailB001],
			dealId: idB,
			...approved(daysAgo(11))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'Re: Re: [B社] システムリプレース要件定義書の送付',
			body: '段階移行方式、了解しました。スケジュール案を来週月曜日までにお送りします。',
			timestamp: daysAgo(9),
			createdAt: daysAgo(9),
			emailFrom: 'yamada@bigcorp.com',
			emailTo: 'tanaka@estyle-inc.jp',
			emailSubject: 'Re: Re: [B社] システムリプレース要件定義書の送付',
			messageId: 'email-b-003@bigcorp.com',
			inReplyTo: emailB002,
			references: [emailB001, emailB002],
			dealId: idB,
			...approved(daysAgo(9))
		},
		{
			id: uuid(),
			source: 'email',
			title: 'C社 初回ヒアリングのご案内',
			body: 'C社の担当者様より初回ヒアリングの日程調整依頼をいただきました。今月中にオンラインMTGを希望されています。',
			timestamp: daysAgo(3),
			createdAt: daysAgo(3),
			emailFrom: 'nakamura@partner-inc.jp',
			emailTo: 'sales@estyle-inc.jp',
			emailSubject: 'C社 初回ヒアリングのご案内',
			messageId: 'email-c-001@partner-inc.jp',
			dealId: idC,
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		},
		{
			id: uuid(),
			source: 'email',
			title: 'D社 保守契約更新書類のご確認',
			body: 'D社との保守契約更新に関する書類一式を添付します。署名・捺印をお願いいたします。',
			timestamp: daysAgo(4),
			createdAt: daysAgo(4),
			emailFrom: 'sato@example-client.co.jp',
			emailTo: 'sales@estyle-inc.jp',
			emailSubject: 'D社 保守契約更新書類のご確認',
			messageId: 'email-d-001@example-client.co.jp',
			dealId: idD,
			...approved(daysAgo(4))
		},
		{
			id: uuid(),
			source: 'email',
			title: '月次営業レポートの共有',
			body: '今月の営業活動レポートをお送りします。A社・B社ともに順調に進捗しています。',
			timestamp: daysAgo(6),
			createdAt: daysAgo(6),
			emailFrom: 'ito@bigcorp.com',
			emailTo: 'manager@estyle-inc.jp',
			emailSubject: '月次営業レポートの共有',
			messageId: 'email-report-001@bigcorp.com',
			...approved(daysAgo(6))
		},
		{
			id: uuid(),
			source: 'email',
			title: '新規パートナー提携のご提案',
			body: 'パートナー企業との提携強化について提案書をお送りします。共同ソリューション提供をご検討ください。',
			timestamp: daysAgo(8),
			createdAt: daysAgo(8),
			emailFrom: 'kato@partner-inc.jp',
			emailTo: 'sales@estyle-inc.jp',
			emailSubject: '新規パートナー提携のご提案',
			messageId: 'email-partner-001@partner-inc.jp',
			status: 'pending',
			isMasked: false,
			annotations: [],
			comments: [],
			isRead: false,
			isDeleted: false
		}
	];

	const calendarLogs: EventLog[] = [
		{
			id: uuid(),
			source: 'calendar',
			title: 'A社 キックオフミーティング',
			body: 'A社とのSaaS導入プロジェクトキックオフ。参加者: A社田中様・鈴木部長・弊社田中・鈴木',
			timestamp: hoursFromNow(2),
			createdAt: daysAgo(7),
			eventName: 'A社 キックオフミーティング',
			startTime: hoursFromNow(2),
			endTime: hoursFromNow(4),
			attendees: ['田中太郎', '鈴木一郎', 'A社田中様'],
			location: 'Zoom オンライン',
			dealId: idA,
			...approved(daysAgo(6)),
			isRead: false
		},
		{
			id: uuid(),
			source: 'calendar',
			title: 'B社 提案プレゼン',
			body: 'B社向けシステムリプレース提案のプレゼン。コスト試算と移行スケジュールを中心に説明。',
			timestamp: daysFromNow(2),
			createdAt: daysAgo(5),
			eventName: 'B社 提案プレゼン',
			startTime: daysFromNow(2),
			endTime: new Date(daysFromNow(2).getTime() + 2 * 3600 * 1000),
			attendees: ['鈴木一郎', 'B社山田様'],
			location: 'B社 会議室A',
			dealId: idB,
			...approved(daysAgo(4)),
			isRead: false
		},
		{
			id: uuid(),
			source: 'calendar',
			title: 'D社 契約最終確認ミーティング',
			body: 'D社との保守契約更新の最終確認。契約書の読み合わせと署名日程確認。',
			timestamp: daysAgo(3),
			createdAt: daysAgo(10),
			eventName: 'D社 契約最終確認ミーティング',
			startTime: daysAgo(3),
			endTime: new Date(daysAgo(3).getTime() + 3600 * 1000),
			attendees: ['佐藤花子', 'D社鈴木様'],
			location: 'D社 応接室',
			dealId: idD,
			...approved(daysAgo(10))
		},
		{
			id: uuid(),
			source: 'calendar',
			title: '週次営業MTG',
			body: '週次の営業進捗確認MTG。各案件の状況共有と課題対応の協議。',
			timestamp: daysAgo(7),
			createdAt: daysAgo(14),
			eventName: '週次営業MTG',
			startTime: daysAgo(7),
			endTime: new Date(daysAgo(7).getTime() + 3600 * 1000),
			attendees: ['田中太郎', '鈴木一郎', '佐藤花子'],
			location: '社内 第1会議室',
			...approved(daysAgo(14))
		},
		{
			id: uuid(),
			source: 'calendar',
			title: 'C社 初回ヒアリング',
			body: 'C社との初回ヒアリング。現状のITシステムの課題と要望をヒアリング。',
			timestamp: daysAgo(1),
			createdAt: daysAgo(5),
			eventName: 'C社 初回ヒアリング',
			startTime: daysAgo(1),
			endTime: new Date(daysAgo(1).getTime() + 5400 * 1000),
			attendees: ['田中太郎', 'C社中村様'],
			location: 'Zoom オンライン',
			dealId: idC,
			...approved(daysAgo(5))
		},
		{
			id: uuid(),
			source: 'calendar',
			title: '月次レビュー会議',
			body: '月次の全体レビュー会議。KPIの確認と来月の計画策定。',
			timestamp: daysAgo(15),
			createdAt: daysAgo(30),
			eventName: '月次レビュー会議',
			startTime: daysAgo(15),
			endTime: new Date(daysAgo(15).getTime() + 7200 * 1000),
			attendees: ['田中太郎', '鈴木一郎', '佐藤花子', 'マネージャー'],
			location: '社内 大会議室',
			...approved(daysAgo(30))
		}
	];

	const tasks: Task[] = [
		{
			id: uuid(),
			title: 'A社との契約書最終確認',
			dealId: idA,
			status: 'in_progress',
			priority: 'high',
			dueDate: daysFromNow(3),
			createdAt: daysAgo(8),
			updatedAt: daysAgo(2),
			source: 'manual',
			isProposal: false
		},
		{
			id: uuid(),
			title: 'B社向け提案資料の作成',
			dealId: idB,
			status: 'in_progress',
			priority: 'high',
			dueDate: daysFromNow(1),
			createdAt: daysAgo(5),
			updatedAt: daysAgo(1),
			source: 'ai',
			isProposal: false
		},
		{
			id: uuid(),
			title: 'C社ヒアリング結果の整理',
			dealId: idC,
			status: 'not_started',
			priority: 'medium',
			dueDate: daysFromNow(5),
			createdAt: daysAgo(1),
			updatedAt: daysAgo(1),
			source: 'ai',
			isProposal: false
		},
		{
			id: uuid(),
			title: 'D社保守契約書の最終署名',
			dealId: idD,
			status: 'not_started',
			priority: 'high',
			dueDate: daysFromNow(7),
			createdAt: daysAgo(4),
			updatedAt: daysAgo(4),
			source: 'manual',
			isProposal: false
		},
		{
			id: uuid(),
			title: '月次レポートの作成',
			status: 'not_started',
			priority: 'medium',
			dueDate: daysFromNow(10),
			createdAt: daysAgo(2),
			updatedAt: daysAgo(2),
			source: 'manual',
			isProposal: false
		}
	];

	return {
		eventLogs: [...slackLogs, ...emailLogs, ...calendarLogs],
		deals,
		tasks,
		settings: getInitialSettings()
	};
}
