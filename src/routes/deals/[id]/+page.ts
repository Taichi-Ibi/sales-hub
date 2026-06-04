import { error } from '@sveltejs/kit';
import { deals, getDeal } from '$lib/data/mock';

export const prerender = true;

export function entries() {
	return deals.map((d) => ({ id: d.id }));
}

export function load({ params }: { params: { id: string } }) {
	const deal = getDeal(params.id);
	if (!deal) throw error(404, '案件が見つかりません');
	return { deal };
}
