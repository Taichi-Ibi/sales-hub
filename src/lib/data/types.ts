// ドメインモデル — 商談を「患者」、カルテを「電子カルテ」と見立てる

/** トリアージ区分（救急の重症度判定に相当） */
export type Triage = 'critical' | 'warning' | 'stable';

/** セールスパス（クリニカルパス相当）の標準ステージ */
export type Stage =
	| 'リード'
	| 'アプローチ'
	| 'ヒアリング'
	| '提案'
	| '見積提示'
	| 'クロージング'
	| '受注'
	| '失注';

export const SALES_PATH: Stage[] = [
	'リード',
	'アプローチ',
	'ヒアリング',
	'提案',
	'見積提示',
	'クロージング',
	'受注'
];

/** アカウントの注意フラグ（既往歴・アレルギー警告に相当・常時表示） */
export interface AccountFlag {
	level: 'allergy' | 'caution' | 'info';
	label: string;
	note: string;
}

export interface Account {
	id: string;
	name: string;
	industry: string;
	employees: string;
	flags: AccountFlag[];
}

/** 商談バイタル（バイタルサイン相当）。value は 0–100。 */
export interface Vital {
	key: string;
	label: string;
	value: number;
	/** 正常範囲の下限。これを下回ると注意/警告。 */
	low: number;
	unit?: string;
	hint: string;
}

/** SOAP 形式の活動記録（診療記録に相当） */
export interface Activity {
	id: string;
	date: string; // YYYY-MM-DD
	author: string;
	channel: '訪問' | 'オンライン' | '電話' | 'メール';
	title: string;
	soap: {
		s: string; // Subjective — 顧客の発言・要望
		o: string; // Objective — 観測した事実・データ
		a: string; // Assessment — 営業としての見立て
		p: string; // Plan — 次の一手
	};
}

export interface Deal {
	id: string;
	title: string;
	accountId: string;
	owner: string;
	amount: number; // 円
	stage: Stage;
	probability: number; // %
	triage: Triage;
	closeDate: string; // 予定 YYYY-MM-DD
	lastContact: string; // 最終接触 YYYY-MM-DD
	nextAction: { label: string; due: string } | null;
	handoff: string; // 申し送りサマリ
	vitals: Vital[];
	activities: Activity[]; // 新しい順
}
