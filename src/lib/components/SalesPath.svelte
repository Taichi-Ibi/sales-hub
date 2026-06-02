<script lang="ts">
	import { SALES_PATH, type Stage } from '$lib/data/types';

	let { stage }: { stage: Stage } = $props();

	// 失注は別扱い。受注は最終ステージ。
	const idx = $derived(SALES_PATH.indexOf(stage));
	const lost = $derived(stage === '失注');
</script>

<div class="path" class:lost>
	{#each SALES_PATH as s, i (s)}
		{@const state = lost ? 'lost' : i < idx ? 'done' : i === idx ? 'current' : 'todo'}
		<div class="step {state}">
			<div class="node">
				{#if state === 'done'}✓{:else}{i + 1}{/if}
			</div>
			<div class="lbl">{s}</div>
			{#if i < SALES_PATH.length - 1}
				<div class="conn" class:filled={!lost && i < idx}></div>
			{/if}
		</div>
	{/each}
</div>
{#if lost}
	<p class="lostnote">この商談は失注として記録されています。</p>
{/if}

<style>
	.path {
		display: flex;
		align-items: flex-start;
	}
	.step {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.node {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		background: var(--surface-2);
		color: var(--ink-3);
		border: 2px solid var(--border);
		z-index: 1;
	}
	.lbl {
		font-size: 11px;
		margin-top: 6px;
		color: var(--ink-3);
		font-weight: 600;
	}
	.conn {
		position: absolute;
		top: 14px;
		left: 50%;
		width: 100%;
		height: 2px;
		background: var(--border);
	}
	.conn.filled {
		background: var(--primary);
	}
	.step.done .node {
		background: var(--primary);
		border-color: var(--primary);
		color: #fff;
	}
	.step.done .lbl {
		color: var(--ink-2);
	}
	.step.current .node {
		background: #fff;
		border-color: var(--primary);
		color: var(--primary-strong);
		box-shadow: 0 0 0 4px var(--primary-soft);
	}
	.step.current .lbl {
		color: var(--primary-strong);
		font-weight: 700;
	}
	.lostnote {
		color: var(--triage-critical);
		font-size: 12px;
		margin: 12px 0 0;
	}
</style>
