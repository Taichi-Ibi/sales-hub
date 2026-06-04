<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { canView } from '$lib/permissions';
	import { statusColor, legalColor, resourceColor, formatDate } from '$lib/ui';
	import type { Deal, MainStatus } from '$lib/types';

	let { onOpenDeal }: { onOpenDeal: (id: string) => void } = $props();

	// 機密案件は閲覧権限のあるユーザーにのみ表示（第3.2 / 5.1）
	const visible = $derived(store.deals.filter((d) => canView(d, store.user)));

	const columns: { key: MainStatus; label: string }[] = [
		{ key: 'リード', label: 'リード' },
		{ key: '商談', label: '商談' },
		{ key: '提案', label: '提案' },
		{ key: '受注', label: 'クローズ（受注）' },
		{ key: '失注', label: 'クローズ（失注）' }
	];

	function dealsIn(status: MainStatus): Deal[] {
		return visible.filter((d) => d.status === status);
	}
</script>

<div class="board">
	{#each columns as col (col.key)}
		<section class="col">
			<div class="col-head">
				<span class="badge {statusColor(col.key)}">{col.label}</span>
				<span class="count faint">{dealsIn(col.key).length}</span>
			</div>
			<div class="col-body">
				{#each dealsIn(col.key) as d (d.id)}
					<button class="deal card" onclick={() => onOpenDeal(d.id)}>
						<div class="dname">
							{#if d.confidential}<span class="lock" title="機密案件">🔒</span>{/if}
							{d.name}
						</div>
						<div class="cust faint">{d.customer}</div>
						<div class="tags">
							<span class="badge {legalColor(d.legal.status)}">法務: {d.legal.status}</span>
							<span class="badge {resourceColor(d.resource.status)}">
								リソース: {d.resource.status}
							</span>
							{#if d.handedOff}<span class="badge green">PM引継済</span>{/if}
						</div>
						<div class="foot faint">
							<span>{d.owner}</span>
							<span class="mono">{formatDate(d.createdAt)}</span>
						</div>
					</button>
				{:else}
					<div class="empty faint">—</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(5, minmax(220px, 1fr));
		gap: 12px;
		align-items: start;
	}
	.col {
		background: var(--gray-weak);
		border-radius: 10px;
		padding: 10px;
		min-height: 120px;
	}
	.col-head {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.count {
		font-size: 12px;
		font-weight: 600;
	}
	.col-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.deal {
		text-align: left;
		padding: 12px;
		width: 100%;
		display: block;
	}
	.deal:hover {
		border-color: var(--accent);
		background: var(--surface);
	}
	.dname {
		font-weight: 600;
		font-size: 13.5px;
		line-height: 1.4;
	}
	.lock {
		margin-right: 2px;
	}
	.cust {
		font-size: 12px;
		margin: 2px 0 8px;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}
	.empty {
		text-align: center;
		padding: 12px;
		font-size: 12px;
	}
</style>
