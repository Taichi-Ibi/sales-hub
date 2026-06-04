<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { getCompany, people } from '$lib/data/mock';
	import { personDeals, relativeDate } from '$lib/data/utils';

	const rows = $derived(
		people.map((p) => ({
			person: p,
			company: getCompany(p.companyId),
			dealCount: personDeals(p.id).length
		}))
	);
</script>

<div class="page-header">
	<div class="page-header-row">
		<div>
			<h1>担当者</h1>
			<p>ワークスペース内の{people.length}名</p>
		</div>
	</div>
</div>

<div class="card">
	<table class="data-table">
		<thead>
			<tr>
				<th>氏名</th>
				<th>役職</th>
				<th>企業</th>
				<th>メール</th>
				<th class="num">案件</th>
				<th>追加日</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.person.id)}
				<tr onclick={() => goto(resolve('/people/[id]', { id: r.person.id }))}>
					<td>
						<div style="display:flex;align-items:center;gap:10px">
							<div
								class="avatar sm"
								style="background:{r.person.isPrimary ? '#6C5CE7' : '#9AA0A6'}"
							>
								{r.person.lastName[0]}
							</div>
							<div>
								<a
									href={resolve('/people/[id]', { id: r.person.id })}
									class="record-name"
								>
									{r.person.lastName} {r.person.firstName}
								</a>
								{#if r.person.isPrimary}
									<span class="badge accent" style="font-size:10px;margin-left:4px">主担当</span>
								{/if}
							</div>
						</div>
					</td>
					<td class="text-secondary">{r.person.title}</td>
					<td>
						{#if r.company}
							<a
								href={resolve('/companies/[id]', { id: r.company.id })}
								class="text-secondary"
								style="font-weight:500"
								onclick={(e) => e.stopPropagation()}
							>
								{r.company.name}
							</a>
						{/if}
					</td>
					<td class="text-tertiary" style="font-size:12px">{r.person.email}</td>
					<td class="num">
						{#if r.dealCount > 0}
							<span class="badge accent">{r.dealCount}</span>
						{:else}
							<span class="text-tertiary">—</span>
						{/if}
					</td>
					<td class="text-secondary">{relativeDate(r.person.createdAt)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
