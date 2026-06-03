<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { getCustomer, projects } from '$lib/data/mock';
	import type { ProjectStatus } from '$lib/data/types';
	import { PROJECT_PATH } from '$lib/data/types';
	import { deriveProjectStatus, isOpen, statusClass, yen } from '$lib/data/utils';

	let filter = $state<'all' | 'open' | 'won' | 'lost'>('all');

	const rows = $derived(
		projects
			.map((p) => ({ p, status: deriveProjectStatus(p.id), customer: getCustomer(p.customerId) }))
			.filter((r) => {
				if (filter === 'all') return true;
				if (filter === 'open') return isOpen(r.status);
				if (filter === 'won') return ['受注', '開発', '納品'].includes(r.status);
				return r.status === '失注';
			})
			.sort((a, b) => {
				const order = (s: ProjectStatus) => PROJECT_PATH.indexOf(s);
				return order(b.status) - order(a.status) || b.p.expectedAmount - a.p.expectedAmount;
			})
	);

	const tabs: { key: typeof filter; label: string }[] = [
		{ key: 'all', label: 'すべて' },
		{ key: 'open', label: '進行中' },
		{ key: 'won', label: '受注' },
		{ key: 'lost', label: '失注' }
	];

	function count(key: typeof filter) {
		return projects.filter((p) => {
			const s = deriveProjectStatus(p.id);
			if (key === 'all') return true;
			if (key === 'open') return isOpen(s);
			if (key === 'won') return ['受注', '開発', '納品'].includes(s);
			return s === '失注';
		}).length;
	}
</script>

<div class="page-head">
	<div class="title">
		<h1>案件一覧</h1>
		<p>顧客配下の全案件。ステータスはイベント履歴から導出</p>
	</div>
</div>

<div class="tabs">
	{#each tabs as t (t.key)}
		<button class="tab" class:active={filter === t.key} onclick={() => (filter = t.key)}>
			{t.label}
			<span class="cnt">{count(t.key)}</span>
		</button>
	{/each}
</div>

<div class="card">
	<table>
		<thead>
			<tr>
				<th>ステータス</th>
				<th>案件 / 顧客</th>
				<th class="num">想定 / 受注額</th>
				<th class="num">粗利率</th>
				<th>受注(予定)日</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.p.id)}
				<tr onclick={() => goto(resolve('/projects/[id]', { id: r.p.id }))}>
					<td><span class="badge {statusClass[r.status]}">{r.status}</span></td>
					<td>
						<a href={resolve('/projects/[id]', { id: r.p.id })} class="pname">{r.p.name}</a>
						<div class="muted small">{r.customer?.name}</div>
					</td>
					<td class="num stat-amount">{yen(r.p.expectedAmount)}</td>
					<td class="num">{r.p.expectedMargin}%</td>
					<td>{r.p.closeDate ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.tabs {
		display: flex;
		gap: 6px;
		margin-bottom: 14px;
	}
	.tab {
		border: 1px solid var(--border);
		background: var(--surface);
		padding: 7px 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		color: var(--ink-2);
		display: inline-flex;
		gap: 7px;
		align-items: center;
	}
	.tab.active {
		background: var(--primary);
		border-color: var(--primary);
		color: #fff;
	}
	.cnt {
		font-size: 11px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 999px;
		padding: 0 7px;
	}
	.tab.active .cnt {
		background: rgba(255, 255, 255, 0.25);
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th {
		text-align: left;
		font-size: 11px;
		color: var(--ink-3);
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
	}
	td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		font-size: 13px;
		vertical-align: middle;
	}
	tbody tr {
		cursor: pointer;
		transition: background 0.12s;
	}
	tbody tr:hover {
		background: var(--surface-2);
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	.num {
		text-align: right;
	}
	.pname {
		font-weight: 700;
	}
	.pname:hover {
		color: var(--primary);
	}
	.small {
		font-size: 11px;
		margin-top: 2px;
	}
</style>
