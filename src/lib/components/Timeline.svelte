<script lang="ts">
	import type { Activity } from '$lib/data/types';
	import { channelIcon, relativeDays } from '$lib/data/utils';

	let { activities }: { activities: Activity[] } = $props();

	const soapMeta = [
		{ key: 's', tag: 'S', name: '主観 / 顧客の声', cls: 's' },
		{ key: 'o', tag: 'O', name: '客観 / 事実', cls: 'o' },
		{ key: 'a', tag: 'A', name: '評価 / 見立て', cls: 'a' },
		{ key: 'p', tag: 'P', name: '計画 / 次の一手', cls: 'p' }
	] as const;
</script>

<div class="tl">
	{#each activities as act (act.id)}
		<div class="entry">
			<div class="rail">
				<div class="bullet">{channelIcon[act.channel] ?? '•'}</div>
			</div>
			<div class="content">
				<div class="ehead">
					<div>
						<strong>{act.title}</strong>
						<span class="badge neutral">{act.channel}</span>
					</div>
					<div class="when">{act.date}・{relativeDays(act.date)}・{act.author}</div>
				</div>
				<div class="soap">
					{#each soapMeta as m (m.key)}
						<div class="line">
							<span class="tag {m.cls}" title={m.name}>{m.tag}</span>
							<p>{act.soap[m.key]}</p>
						</div>
					{/each}
				</div>
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
		gap: 8px;
	}
	.rail {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.rail::before {
		content: '';
		flex: 1;
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
		padding-bottom: 20px;
		min-width: 0;
	}
	.ehead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}
	.ehead strong {
		font-size: 14px;
		margin-right: 8px;
	}
	.when {
		font-size: 11px;
		color: var(--ink-3);
	}
	.soap {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.line {
		display: grid;
		grid-template-columns: 22px 1fr;
		gap: 10px;
		align-items: start;
	}
	.line p {
		margin: 0;
		font-size: 13px;
		color: var(--ink);
	}
	.tag {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		display: grid;
		place-items: center;
		font-size: 11px;
		font-weight: 800;
		color: #fff;
	}
	.tag.s {
		background: #2563eb;
	}
	.tag.o {
		background: #0e7490;
	}
	.tag.a {
		background: #7c3aed;
	}
	.tag.p {
		background: #079455;
	}
</style>
