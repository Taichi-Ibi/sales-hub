export interface Company {
	id: string;
	name: string;
	domain: string;
	industry: string;
	employees: number;
	annualRevenue?: string;
	description: string;
	createdAt: string;
	ownerId: string;
	tags: string[];
}

export interface Person {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	title: string;
	companyId: string;
	createdAt: string;
	ownerId: string;
	isPrimary?: boolean;
}

export type DealStage =
	| 'Qualification'
	| 'Discovery'
	| 'Proposal'
	| 'Negotiation'
	| 'Closed Won'
	| 'Closed Lost';

export const DEAL_STAGES: DealStage[] = [
	'Qualification',
	'Discovery',
	'Proposal',
	'Negotiation',
	'Closed Won',
	'Closed Lost'
];

export const PIPELINE_STAGES: DealStage[] = [
	'Qualification',
	'Discovery',
	'Proposal',
	'Negotiation'
];

export interface Deal {
	id: string;
	name: string;
	companyId: string;
	contactId: string;
	stage: DealStage;
	value: number;
	currency: string;
	probability: number;
	expectedCloseDate: string;
	createdAt: string;
	ownerId: string;
	description: string;
}

export type ActivityType = 'note' | 'email' | 'call' | 'meeting' | 'stage_change' | 'task';

export interface Activity {
	id: string;
	type: ActivityType;
	title: string;
	body: string;
	date: string;
	userId: string;
	companyId?: string;
	dealId?: string;
	personId?: string;
}

export interface User {
	id: string;
	name: string;
	email: string;
	avatarColor: string;
}
