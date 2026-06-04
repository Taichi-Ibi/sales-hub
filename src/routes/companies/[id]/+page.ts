import { error } from '@sveltejs/kit';
import { companies, getCompany } from '$lib/data/mock';

export const prerender = true;

export function entries() {
	return companies.map((c) => ({ id: c.id }));
}

export function load({ params }: { params: { id: string } }) {
	const company = getCompany(params.id);
	if (!company) throw error(404, '企業が見つかりません');
	return { company };
}
