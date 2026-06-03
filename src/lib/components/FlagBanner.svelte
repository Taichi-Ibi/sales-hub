<script lang="ts">
	import type { NoteFlag } from '$lib/data/types';

	let { flags }: { flags: NoteFlag[] } = $props();

	const meta = {
		critical: { label: '重要', cls: 'critical' },
		caution: { label: '注意', cls: 'caution' },
		info: { label: '情報', cls: 'info' }
	} as const;
</script>

{#if flags.length}
	<div class="flags">
		{#each flags as f (f.label)}
			<div class="flag {meta[f.level].cls}">
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
		border: 1px solid var(--border-strong);
		border-left-width: 3px;
		font-size: 13px;
		color: var(--ink);
		background: var(--surface);
	}
	.flag p {
		margin: 2px 0 0;
		color: var(--ink-2);
		font-size: 12px;
	}
	.kind {
		font-size: 10px;
		font-weight: 700;
		margin-left: 8px;
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-strong);
		color: var(--ink-2);
	}
	/* 重大度は左罫線の濃さ・太さで示す */
	.critical {
		border-left-color: var(--ink);
		border-left-width: 4px;
	}
	.caution {
		border-left-color: var(--ink-2);
	}
	.info {
		border-left-color: var(--ink-3);
	}
</style>
