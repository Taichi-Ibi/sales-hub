import { error } from '@sveltejs/kit';
import { getCustomer, getProject, projects } from '$lib/data/mock';

export const prerender = true;

// 静的生成する案件ページの一覧
export function entries() {
	return projects.map((p) => ({ id: p.id }));
}

export function load({ params }: { params: { id: string } }) {
	const project = getProject(params.id);
	if (!project) throw error(404, '案件が見つかりません');
	return { project, customer: getCustomer(project.customerId) };
}
