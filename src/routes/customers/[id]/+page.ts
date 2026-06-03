import { error } from '@sveltejs/kit';
import { customers, getCustomer } from '$lib/data/mock';

export const prerender = true;

// 静的生成する顧客ページの一覧
export function entries() {
	return customers.map((c) => ({ id: c.id }));
}

export function load({ params }: { params: { id: string } }) {
	const customer = getCustomer(params.id);
	if (!customer) throw error(404, '顧客が見つかりません');
	return { customer };
}
