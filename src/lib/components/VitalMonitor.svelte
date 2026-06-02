<script lang="ts">
	import type { Vital } from '$lib/data/types';
	import { vitalStatus } from '$lib/data/utils';

	let { vitals, compact = false }: { vitals: Vital[]; compact?: boolean } = $props();

	const color = {
		normal: 'var(--monitor-green)',
		caution: 'var(--monitor-amber)',
		alert: 'var(--monitor-red)'
	};
</script>

<div class="monitor" class:compact>
	{#each vitals as v (v.key)}
		{@const s = vitalStatus(v)}
		<div class="vital" title={v.hint}>
			<div class="vlabel">
				{v.label}
				{#if s === 'alert'}<span class="blip">▲</span>{/if}
			</div>
			<div class="vval mono" style="color:{color[s]}">
				{v.value}<span class="vunit">/100</span>
			</div>
			<div class="track">
				<div class="fill" style="width:{v.value}%;background:{color[s]}"></div>
				<div class="threshold" style="left:{v.low}%" title="正常下限 {v.low}"></div>
			</div>
		</div>
	{/each}
</div>

<style>
	.monitor {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--monitor-grid);
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--monitor-grid);
	}
	.compact {
		grid-template-columns: repeat(4, 1fr);
	}
	.vital {
		background: var(--monitor-bg);
		padding: 12px 14px;
		background-image: linear-gradient(var(--monitor-grid) 1px, transparent 1px);
		background-size: 100% 14px;
	}
	.compact .vital {
		padding: 8px 10px;
	}
	.vlabel {
		font-size: 11px;
		color: #8fa3bb;
		letter-spacing: 0.04em;
		display: flex;
		align-items: center;
		gap: 5px;
	}
	.blip {
		color: var(--monitor-red);
		font-size: 9px;
		animation: pulse 1.1s infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.25;
		}
	}
	.vval {
		font-size: 28px;
		font-weight: 700;
		line-height: 1.2;
		text-shadow: 0 0 12px currentColor;
	}
	.compact .vval {
		font-size: 20px;
	}
	.vunit {
		font-size: 11px;
		color: #5e748a;
		margin-left: 2px;
		text-shadow: none;
	}
	.track {
		position: relative;
		height: 4px;
		background: #1c2c3f;
		border-radius: 3px;
		margin-top: 6px;
	}
	.fill {
		height: 100%;
		border-radius: 3px;
		box-shadow: 0 0 8px currentColor;
	}
	.threshold {
		position: absolute;
		top: -2px;
		width: 2px;
		height: 8px;
		background: #64748b;
	}
</style>
