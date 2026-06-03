<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { customers } from '$lib/data/mock';
	import type { CustomerRank } from '$lib/data/types';
	import {
		activeProjectCount,
		customerMargin,
		customerRevenue,
		daysBetween,
		lastContact,
		rankLabel,
		relativeDays
	} from '$lib/data/utils';

	let filter = $state<'all' | CustomerRank>('all');

	const rows = $derived(
		customers
			.map((c) => ({
				c,
				revenue: customerRevenue(c.id),
				margin: customerMargin(c.id),
				active: activeProjectCount(c.id),
				last: lastContact(c.id)
			}))
			.filter((r) => filter === 'all' || r.c.rank === filter)
			.sort((a, b) => b.revenue - a.revenue)
	);

	const tabs: { key: 'all' | CustomerRank; label: string }[] = [
		{ key: 'all', label: 'すべて' },
		{ key: 'S', label: 'S・最重要' },
		{ key: 'A', label: 'A・重要' },
		{ key: 'B', label: 'B・通常' },
		{ key: 'C', label: 'C・育成' }
	];
</script>

<div class="page-head">
	<div class="title">
		<h1>顧客一覧</h1>
		<p>顧客を最上位に、売上累計・粗利率・進行中案件・最終接触を一覧</p>
	</div>
</div>

<div class="tabs">
	{#each tabs as t (t.key)}
		<button class="tab" class:active={filter === t.key} onclick={() => (filter = t.key)}>
			{t.label}
			<span class="cnt"
				>{t.key === 'all'
					? customers.length
					: customers.filter((c) => c.rank === t.key).length}</span
			>
		</button>
	{/each}
</div>

<div class="card">
	<table>
		<thead>
			<tr>
				<th>ランク</th>
				<th>顧客 / 業種</th>
				<th>担当営業</th>
				<th class="num">売上累計</th>
				<th class="num">粗利率</th>
				<th class="num">進行中案件</th>
				<th>最終接触</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.c.id)}
				{@const stale = r.last !== null && daysBetween(r.last) >= 14}
				<tr onclick={() => goto(resolve('/customers/[id]', { id: r.c.id }))}>
					<td>
						<span class="rank {r.c.rank.toLowerCase()}" title={rankLabel[r.c.rank]}>{r.c.rank}</span
						>
					</td>
					<td>
						<a href={resolve('/customers/[id]', { id: r.c.id })} class="cname">{r.c.name}</a>
						<div class="muted small">{r.c.industry}・{r.c.employees}</div>
					</td>
					<td>{r.c.owner}</td>
					<td class="num stat-amount"
						>{r.revenue ? `¥${(r.revenue / 10000).toLocaleString()}万` : '—'}</td
					>
					<td class="num">{r.revenue ? `${r.margin}%` : '—'}</td>
					<td class="num">
						{#if r.active > 0}<span class="badge info">{r.active}件</span>{:else}<span class="muted"
								>—</span
							>{/if}
					</td>
					<td>
						{#if r.last}
							<span class:stale>{relativeDays(r.last)}</span>
						{:else}<span class="muted">—</span>{/if}
					</td>
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
		flex-wrap: wrap;
	}
	.tab {
		border: 1px solid var(--border-strong);
		background: var(--surface);
		padding: 7px 14px;
		border-radius: var(--radius-sm);
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
		background: var(--ink);
		border-color: var(--ink);
		color: #fff;
	}
	.cnt {
		font-size: 11px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: var(--radius-sm);
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
	.cname {
		font-weight: 700;
	}
	.cname:hover {
		color: var(--primary);
	}
	.small {
		font-size: 11px;
		margin-top: 2px;
	}
	.stale {
		color: var(--bad);
		font-weight: 700;
	}
</style>
