import { error } from '@sveltejs/kit';
import { getPerson, people } from '$lib/data/mock';

export const prerender = true;

export function entries() {
	return people.map((p) => ({ id: p.id }));
}

export function load({ params }: { params: { id: string } }) {
	const person = getPerson(params.id);
	if (!person) throw error(404, 'Person not found');
	return { person };
}
