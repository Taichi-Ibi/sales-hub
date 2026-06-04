<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { companies } from '$lib/data/mock';
	import { companyOpenDeals, companyRevenue, formatCurrency, relativeDate } from '$lib/data/utils';

	const rows = $derived(
		companies
			.map((c) => ({
				company: c,
				revenue: companyRevenue(c.id),
				openDeals: companyOpenDeals(c.id)
			}))
			.sort((a, b) => b.revenue - a.revenue)
	);
</script>

<div class="page-header">
	<div class="page-header-row">
		<div>
			<h1>Companies</h1>
			<p>{companies.length} companies in workspace</p>
		</div>
	</div>
</div>

<div class="card">
	<table class="data-table">
		<thead>
			<tr>
				<th>Company</th>
				<th>Industry</th>
				<th>Employees</th>
				<th class="num">Revenue</th>
				<th class="num">Open Deals</th>
				<th>Created</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.company.id)}
				<tr onclick={() => goto(resolve('/companies/[id]', { id: r.company.id }))}>
					<td>
						<div style="display:flex;align-items:center;gap:10px">
							<div class="company-icon">{r.company.name[0]}</div>
							<div>
								<a
									href={resolve('/companies/[id]', { id: r.company.id })}
									class="record-name"
									>{r.company.name}</a
								>
								<div class="text-tertiary" style="font-size:12px">{r.company.domain}</div>
							</div>
						</div>
					</td>
					<td><span class="tag">{r.company.industry}</span></td>
					<td>{r.company.employees.toLocaleString()}</td>
					<td class="num" style="font-weight:600">
						{r.revenue ? formatCurrency(r.revenue) : '—'}
					</td>
					<td class="num">
						{#if r.openDeals > 0}
							<span class="badge accent">{r.openDeals}</span>
						{:else}
							<span class="text-tertiary">—</span>
						{/if}
					</td>
					<td class="text-secondary">{relativeDate(r.company.createdAt)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.company-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius);
		background: var(--surface-active);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 14px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}
</style>
