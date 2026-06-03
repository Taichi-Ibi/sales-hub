<script lang="ts">
	import { resolve } from '$app/paths';
	import type { SalesEvent } from '$lib/data/types';
	import { getProject } from '$lib/data/mock';
	import { attachmentIcon, eventIcon, eventTone, relativeDays, yen } from '$lib/data/utils';

	let { events, showProject = false }: { events: SalesEvent[]; showProject?: boolean } = $props();
</script>

<div class="tl">
	{#each events as ev (ev.id)}
		{@const proj = ev.projectId ? getProject(ev.projectId) : undefined}
		<div class="entry">
			<div class="rail">
				<div class="bullet {eventTone[ev.type]}">{eventIcon[ev.type]}</div>
			</div>
			<div class="content">
				<div class="ehead">
					<div class="row wrap" style="gap:8px">
						<strong>{ev.type}</strong>
						<span class="badge {ev.category === 'project' ? 'primary' : 'neutral'}">
							{ev.category === 'project' ? '案件' : '顧客'}
						</span>
						{#if showProject && proj}
							<a class="plink" href={resolve('/projects/[id]', { id: proj.id })}>
								📁 {proj.name}
							</a>
						{/if}
					</div>
					<div class="when">{ev.date}・{relativeDays(ev.date)}・{ev.actor}</div>
				</div>
				<p class="note">{ev.note}</p>
				{#if ev.amount}
					<div class="payload">
						受注金額 <span class="stat-amount">{yen(ev.amount)}</span>
						{#if ev.margin}<span class="muted">／ 粗利率 {ev.margin}%</span>{/if}
					</div>
				{/if}
				{#if ev.attachments?.length}
					<div class="atts">
						{#each ev.attachments as a (a.name)}
							<span class="att">{attachmentIcon[a.kind]} {a.name}</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.tl {
		display: flex;
		flex-direction: column;
	}
	.entry {
		display: grid;
		grid-template-columns: 40px 1fr;
		gap: 10px;
	}
	.rail {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.rail::before {
		content: '';
		flex: 0 0 6px;
		width: 2px;
		background: var(--border);
	}
	.entry:first-child .rail::before {
		background: transparent;
	}
	.bullet {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--surface-2);
		border: 1px solid var(--border);
		display: grid;
		place-items: center;
		font-size: 15px;
		flex-shrink: 0;
	}
	.bullet.info {
		border-color: var(--info);
		box-shadow: 0 0 0 3px var(--info-soft);
	}
	.bullet.ok {
		border-color: var(--ok);
		box-shadow: 0 0 0 3px var(--ok-soft);
	}
	.bullet.warn {
		border-color: var(--warn);
		box-shadow: 0 0 0 3px var(--warn-soft);
	}
	.bullet.bad {
		border-color: var(--bad);
		box-shadow: 0 0 0 3px var(--bad-soft);
	}
	.rail::after {
		content: '';
		flex: 1;
		width: 2px;
		background: var(--border);
	}
	.entry:last-child .rail::after {
		background: transparent;
	}
	.content {
		padding-bottom: 18px;
		min-width: 0;
	}
	.ehead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.ehead strong {
		font-size: 14px;
	}
	.plink {
		font-size: 12px;
		color: var(--primary-strong);
		font-weight: 600;
	}
	.plink:hover {
		text-decoration: underline;
	}
	.when {
		font-size: 11px;
		color: var(--ink-3);
	}
	.note {
		margin: 4px 0 0;
		font-size: 13px;
		color: var(--ink);
	}
	.payload {
		margin-top: 6px;
		font-size: 12px;
		color: var(--ok);
		background: var(--ok-soft);
		display: inline-flex;
		gap: 8px;
		align-items: center;
		padding: 3px 10px;
		border-radius: 6px;
	}
	.atts {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.att {
		font-size: 11px;
		color: var(--ink-2);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 2px 8px;
	}
</style>
