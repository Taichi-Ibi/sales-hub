import { error } from '@sveltejs/kit';
import { deals, getAccount, getDeal } from '$lib/data/mock';

export const prerender = true;

// 静的生成する商談ページの一覧
export function entries() {
	return deals.map((d) => ({ id: d.id }));
}

export function load({ params }: { params: { id: string } }) {
	const deal = getDeal(params.id);
	if (!deal) throw error(404, '商談が見つかりません');
	return { deal, account: getAccount(deal.accountId) };
}
