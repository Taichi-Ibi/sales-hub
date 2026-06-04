import { activities, companies, deals, people, TODAY } from './mock';
import type { ActivityType, DealStage } from './types';

const MS_PER_DAY = 86_400_000;

export function formatCurrency(amount: number): string {
	if (amount >= 100_000_000) return `¥${(amount / 100_000_000).toFixed(1)}B`;
	if (amount >= 10_000_000) return `¥${(amount / 1_000_000).toFixed(1)}M`;
	if (amount >= 10_000) return `¥${Math.round(amount / 10_000).toLocaleString()}万`;
	return `¥${amount.toLocaleString()}`;
}

export function daysBetween(from: string, to: string = TODAY): number {
	return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

export function relativeDate(date: string): string {
	const d = daysBetween(date);
	if (d === 0) return 'Today';
	if (d === 1) return 'Yesterday';
	if (d < 7) return `${d}d ago`;
	if (d < 30) return `${Math.floor(d / 7)}w ago`;
	if (d < 365) return `${Math.floor(d / 30)}mo ago`;
	return `${Math.floor(d / 365)}y ago`;
}

export function formatDate(date: string): string {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function companyPeople(companyId: string) {
	return people.filter((p) => p.companyId === companyId);
}

export function companyDeals(companyId: string) {
	return deals.filter((d) => d.companyId === companyId);
}

export function companyActivities(companyId: string) {
	return activities
		.filter((a) => a.companyId === companyId)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function dealActivities(dealId: string) {
	return activities
		.filter((a) => a.dealId === dealId)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function personActivities(personId: string) {
	return activities
		.filter((a) => a.personId === personId)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function personDeals(personId: string) {
	return deals.filter((d) => d.contactId === personId);
}

export function companyRevenue(companyId: string): number {
	return deals
		.filter((d) => d.companyId === companyId && d.stage === 'Closed Won')
		.reduce((s, d) => s + d.value, 0);
}

export function companyOpenDeals(companyId: string): number {
	return deals.filter(
		(d) => d.companyId === companyId && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'
	).length;
}

export const stageColor: Record<DealStage, string> = {
	Qualification: '#6C5CE7',
	Discovery: '#0984E3',
	Proposal: '#00B894',
	Negotiation: '#FDCB6E',
	'Closed Won': '#00B894',
	'Closed Lost': '#636E72'
};

export const activityTypeLabel: Record<ActivityType, string> = {
	note: 'Note',
	email: 'Email',
	call: 'Call',
	meeting: 'Meeting',
	stage_change: 'Update',
	task: 'Task'
};

export interface DashboardMetrics {
	totalRevenue: number;
	openPipeline: number;
	dealsWon: number;
	dealsLost: number;
	winRate: number;
	avgDealSize: number;
	activeCompanies: number;
	totalContacts: number;
}

export function getDashboardMetrics(): DashboardMetrics {
	const won = deals.filter((d) => d.stage === 'Closed Won');
	const lost = deals.filter((d) => d.stage === 'Closed Lost');
	const open = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
	const totalRevenue = won.reduce((s, d) => s + d.value, 0);
	const decided = won.length + lost.length;

	return {
		totalRevenue,
		openPipeline: open.reduce((s, d) => s + d.value, 0),
		dealsWon: won.length,
		dealsLost: lost.length,
		winRate: decided ? Math.round((won.length / decided) * 100) : 0,
		avgDealSize: won.length ? Math.round(totalRevenue / won.length) : 0,
		activeCompanies: companies.length,
		totalContacts: people.length
	};
}
