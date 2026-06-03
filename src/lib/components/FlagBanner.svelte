<script lang="ts">
	import type { NoteFlag } from '$lib/data/types';

	let { flags }: { flags: NoteFlag[] } = $props();

	const meta = {
		critical: { icon: '⚠️', label: '重要', cls: 'critical' },
		caution: { icon: '⚡', label: '注意', cls: 'caution' },
		info: { icon: 'ℹ️', label: '情報', cls: 'info' }
	} as const;
</script>

{#if flags.length}
	<div class="flags">
		{#each flags as f (f.label)}
			<div class="flag {meta[f.level].cls}">
				<span class="ic">{meta[f.level].icon}</span>
				<div>
					<strong>{f.label}</strong>
					<span class="kind">{meta[f.level].label}</span>
					<p>{f.note}</p>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.flags {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.flag {
		display: flex;
		gap: 10px;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		border: 1px solid;
		font-size: 13px;
	}
	.flag p {
		margin: 2px 0 0;
		color: var(--ink-2);
		font-size: 12px;
	}
	.ic {
		font-size: 16px;
		line-height: 1.4;
	}
	.kind {
		font-size: 10px;
		font-weight: 700;
		margin-left: 8px;
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.6);
	}
	.critical {
		background: var(--bad-soft);
		border-color: #f5b5ae;
		color: var(--bad);
	}
	.caution {
		background: var(--warn-soft);
		border-color: #f0d28a;
		color: var(--warn);
	}
	.info {
		background: var(--info-soft);
		border-color: #b6ccef;
		color: var(--info);
	}
</style>
