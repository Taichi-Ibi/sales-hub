<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { EVENT_LABEL, eventColor, formatDateTime } from '$lib/ui';
	import type { DealEvent } from '$lib/types';

	let { dealId }: { dealId: string } = $props();

	const events = $derived(store.eventsOf(dealId));

	function detail(e: DealEvent): string {
		const p = e.payload;
		switch (e.type) {
			case 'deal_created':
				return `${p.name}（${p.customer}）`;
			case 'status_changed':
				return `${p.from} → ${p.to}`;
			case 'interaction_logged':
				return `[${p.channel}] ${p.summary}`;
			case 'briefing_updated':
				return `特殊条項: ${p.hasSpecialTerms ? 'あり' : 'なし'} / ${p.briefing}`;
			case 'confidential_set':
				return p.confidential ? '機密案件に設定' : '機密を解除';
			case 'legal_requested':
				return `申し送り: ${p.note}`;
			case 'legal_resolved':
				return `${p.result}: ${p.comment}`;
			case 'resource_requested': {
				const r = p.requirement as { skills: string; headcount: string };
				return `${r.skills} / ${r.headcount}`;
			}
			case 'resource_responded':
				return `${p.status}: ${p.comment}`;
			case 'pm_handoff':
				return `PM（${p.to}）へ引き渡し`;
			case 'deal_closed':
				return p.result === '失注' ? `失注: ${p.reason}` : '受注';
			default:
				return '';
		}
	}
</script>

<div class="tl">
	<div class="spread head">
		<h4>イベントタイムライン</h4>
		<span class="badge gray">追記のみ・消さない</span>
	</div>
	<p class="faint hint">
		全ての状態変化を出来事として時系列で保持し、現在状態はここから導出します（イベントソーシング志向）。
	</p>
	<ol class="events">
		{#each events as e (e.id)}
			<li>
				<span class="dot {eventColor(e.type)}"></span>
				<div class="body">
					<div class="line">
						<span class="badge {eventColor(e.type)}">{EVENT_LABEL[e.type]}</span>
						<span class="who faint">{e.actor.name}</span>
						<span class="when faint mono">{formatDateTime(e.at)}</span>
					</div>
					<div class="det">{detail(e)}</div>
				</div>
			</li>
		{/each}
	</ol>
</div>

<style>
	.head {
		margin-bottom: 4px;
	}
	.hint {
		font-size: 12px;
		margin: 0 0 12px;
	}
	.events {
		list-style: none;
		margin: 0;
		padding: 0;
		position: relative;
	}
	.events::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 4px;
		bottom: 4px;
		width: 2px;
		background: var(--border);
	}
	.events li {
		position: relative;
		display: flex;
		gap: 12px;
		padding: 0 0 14px 0;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex: 0 0 auto;
		margin-top: 3px;
		z-index: 1;
		border: 2px solid var(--surface);
	}
	.dot.gray {
		background: var(--text-faint);
	}
	.dot.blue {
		background: var(--accent);
	}
	.dot.green {
		background: var(--green);
	}
	.dot.amber {
		background: var(--amber);
	}
	.dot.red {
		background: var(--red);
	}
	.dot.purple {
		background: var(--purple);
	}
	.body {
		flex: 1;
	}
	.line {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.who {
		font-size: 12px;
	}
	.when {
		font-size: 11px;
		margin-left: auto;
	}
	.det {
		font-size: 13px;
		margin-top: 3px;
		line-height: 1.5;
		word-break: break-word;
	}
</style>
