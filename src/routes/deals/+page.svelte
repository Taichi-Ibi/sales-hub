<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { deals, getAccount } from '$lib/data/mock';
	import { yen, relativeDays, triageLabel, triageOrder, vitalStatus } from '$lib/data/utils';
	import type { Triage } from '$lib/data/types';

	let filter = $state<'all' | Triage>('all');

	const filtered = $derived(
		[...deals]
			.filter((d) => filter === 'all' || d.triage === filter)
			.sort((a, b) => triageOrder[a.triage] - triageOrder[b.triage] || b.amount - a.amount)
	);

	const tabs: { key: 'all' | Triage; label: string }[] = [
		{ key: 'all', label: 'すべて' },
		{ key: 'critical', label: '要対応' },
		{ key: 'warning', label: '注意' },
		{ key: 'stable', label: '順調' }
	];

	function alertCount(d: (typeof deals)[number]) {
		return d.vitals.filter((v) => vitalStatus(v) === 'alert').length;
	}
</script>

<div class="page-head">
	<div class="title">
		<h1>商談一覧</h1>
		<p>全商談をトリアージ・バイタルとともに一覧（病棟一覧ビュー）</p>
	</div>
</div>

<div class="tabs">
	{#each tabs as t (t.key)}
		<button class="tab" class:active={filter === t.key} onclick={() => (filter = t.key)}>
			{t.label}
			<span class="cnt"
				>{t.key === 'all' ? deals.length : deals.filter((d) => d.triage === t.key).length}</span
			>
		</button>
	{/each}
</div>

<div class="card">
	<table>
		<thead>
			<tr>
				<th>トリアージ</th>
				<th>商談 / 取引先</th>
				<th>ステージ</th>
				<th class="num">金額</th>
				<th class="num">確度</th>
				<th>最終接触</th>
				<th>バイタル</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as d (d.id)}
				{@const acc = getAccount(d.accountId)}
				{@const ac = alertCount(d)}
				<tr onclick={() => goto(resolve('/deals/[id]', { id: d.id }))}>
					<td>
						<span class="badge {d.triage}"
							><span class="dot {d.triage}"></span>{triageLabel[d.triage]}</span
						>
					</td>
					<td>
						<a href={resolve('/deals/[id]', { id: d.id })} class="dtitle">{d.title}</a>
						<div class="muted small">{acc?.name}・{acc?.industry}</div>
					</td>
					<td><span class="badge neutral">{d.stage}</span></td>
					<td class="num stat-amount">{yen(d.amount)}</td>
					<td class="num">{d.probability}%</td>
					<td>{relativeDays(d.lastContact)}</td>
					<td>
						{#if ac > 0}
							<span class="badge critical">異常 {ac}</span>
						{:else}
							<span class="badge stable">正常</span>
						{/if}
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
	.dtitle {
		font-weight: 700;
	}
	.dtitle:hover {
		color: var(--primary);
	}
	.small {
		font-size: 11px;
		margin-top: 2px;
	}
</style>
