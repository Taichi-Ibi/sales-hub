<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CustomerEventType, SalesEvent } from '$lib/data/types';
	import { TODAY } from '$lib/data/mock';
	import {
		activeProjectCount,
		customerEvents,
		customerMargin,
		customerProjects,
		customerRevenue,
		daysBetween,
		lastContact,
		rankLabel,
		statusClass,
		yen
	} from '$lib/data/utils';
	import FlagBanner from '$lib/components/FlagBanner.svelte';
	import EventTimeline from '$lib/components/EventTimeline.svelte';

	let { data } = $props();
	const customer = $derived(data.customer);

	// イベントソーシング: 追加分はローカル state に append（モック）
	let appended = $state<Record<string, SalesEvent[]>>({});

	const baseEvents = $derived(customerEvents(customer.id));
	const log = $derived<SalesEvent[]>(
		[...(appended[customer.id] ?? []), ...baseEvents].sort((a, b) => b.date.localeCompare(a.date))
	);

	const revenue = $derived(customerRevenue(customer.id));
	const margin = $derived(customerMargin(customer.id));
	const active = $derived(activeProjectCount(customer.id));
	const last = $derived(lastContact(customer.id));
	const projects = $derived(customerProjects(customer.id));

	// イベント追加フォーム
	const eventTypes: CustomerEventType[] = [
		'電話',
		'メール',
		'訪問',
		'定例会',
		'初回接触',
		'担当者追加'
	];
	let formOpen = $state(false);
	let draft = $state({ type: '電話' as CustomerEventType, note: '' });

	function addEvent(e: SubmitEvent) {
		e.preventDefault();
		const ev: SalesEvent = {
			id: `new-${Date.now()}`,
			customerId: customer.id,
			category: 'customer',
			type: draft.type,
			date: TODAY,
			actor: customer.owner,
			note: draft.note || '（メモなし）'
		};
		appended = { ...appended, [customer.id]: [ev, ...(appended[customer.id] ?? [])] };
		draft = { type: '電話', note: '' };
		formOpen = false;
	}
</script>

<div class="breadcrumb">
	<a href={resolve('/')}>ダッシュボード</a> / <a href={resolve('/customers')}>顧客一覧</a> / {customer.name}
</div>

<!-- 顧客ヘッダー -->
<div class="card chead">
	<div class="card-body">
		<div class="row between wrap" style="align-items:flex-start">
			<div>
				<div class="row" style="gap:10px">
					<span class="rank {customer.rank.toLowerCase()}">{customer.rank}</span>
					<span class="badge primary">{rankLabel[customer.rank]}</span>
				</div>
				<h1 style="font-size:24px;margin:8px 0 4px">{customer.name}</h1>
				<div class="muted">
					{customer.industry}・{customer.employees}・
					<a href="https://{customer.url}" target="_blank" rel="noreferrer" class="urllink"
						>{customer.url}</a
					>
				</div>
			</div>
			<div class="kpis-mini">
				<div>
					<span class="ml">売上累計</span><span class="stat-amount mv">{yen(revenue)}</span>
				</div>
				<div>
					<span class="ml">粗利率</span><span class="mv">{revenue ? `${margin}%` : '—'}</span>
				</div>
				<div><span class="ml">進行中案件</span><span class="mv">{active}件</span></div>
				<div><span class="ml">担当営業</span><span class="mv">{customer.owner}</span></div>
			</div>
		</div>
	</div>
</div>

<!-- 注意事項（常時表示） -->
{#if customer.flags.length}
	<div style="margin-top:14px">
		<FlagBanner flags={customer.flags} />
	</div>
{/if}

<div class="grid main-cols" style="margin-top:14px">
	<!-- 中核: イベントタイムライン -->
	<section class="card">
		<div class="card-head">
			<h3>タイムライン</h3>
			<button class="btn primary sm" onclick={() => (formOpen = !formOpen)}>
				{formOpen ? '閉じる' : '＋ イベントを記録'}
			</button>
		</div>
		<div class="card-body">
			{#if formOpen}
				<form class="evform" onsubmit={addEvent}>
					<div class="row" style="gap:10px;margin-bottom:10px">
						<select class="inp" bind:value={draft.type} style="max-width:160px">
							{#each eventTypes as t (t)}<option>{t}</option>{/each}
						</select>
						<span class="muted small">実施者 {customer.owner}・{TODAY}</span>
					</div>
					<textarea
						class="inp"
						bind:value={draft.note}
						placeholder="メモ（顧客の発言・観測した事実・次の一手など）"
					></textarea>
					<div class="row" style="justify-content:flex-end;margin-top:8px">
						<button type="submit" class="btn primary sm">記録する</button>
					</div>
				</form>
			{/if}
			<EventTimeline events={log} showProject />
		</div>
	</section>

	<!-- サイド: 案件一覧・担当者・基本情報 -->
	<aside class="side">
		<section class="card">
			<div class="card-head">
				<h3>案件一覧</h3>
				<span class="muted" style="font-size:12px">{projects.length}件</span>
			</div>
			<div class="card-body" style="padding:0">
				{#each projects as p (p.id)}
					{@const won = p.status === '受注' || p.status === '開発' || p.status === '納品'}
					<a
						href={resolve('/projects/[id]', { id: p.id })}
						class="prow status-bar {statusClass[p.status]}"
					>
						<div class="row between">
							<strong>{p.name}</strong>
							<span class="badge {statusClass[p.status]}">{p.status}</span>
						</div>
						<div class="row between meta">
							<span class="muted">{won ? '受注額' : '想定'} {yen(p.expectedAmount)}</span>
							<span class="muted">粗利 {p.expectedMargin}%</span>
						</div>
					</a>
				{/each}
			</div>
		</section>

		<section class="card">
			<div class="card-head"><h3>担当者</h3></div>
			<div class="card-body" style="display:flex;flex-direction:column;gap:8px">
				{#each customer.contacts as ct (ct.name)}
					<div class="row between">
						<div>
							<strong style="font-size:13px">{ct.name}</strong>
							{#if ct.primary}<span class="badge primary" style="margin-left:6px">主担当</span>{/if}
							<div class="muted small">{ct.role}</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="card">
			<div class="card-head"><h3>基本情報</h3></div>
			<div class="card-body" style="font-size:13px">
				<dl class="dl">
					<dt>業種</dt>
					<dd>{customer.industry}</dd>
					<dt>従業員</dt>
					<dd>{customer.employees}</dd>
					<dt>取引開始</dt>
					<dd>{customer.since}</dd>
					<dt>最終接触</dt>
					<dd>{last ? `${last}（${daysBetween(last)}日前）` : '—'}</dd>
				</dl>
			</div>
		</section>
	</aside>
</div>

<style>
	.urllink:hover {
		color: var(--primary);
		text-decoration: underline;
	}
	.kpis-mini {
		display: grid;
		grid-template-columns: repeat(2, auto);
		gap: 8px 28px;
		text-align: right;
	}
	.kpis-mini > div {
		display: flex;
		flex-direction: column;
	}
	.ml {
		font-size: 11px;
		color: var(--ink-3);
	}
	.mv {
		font-size: 17px;
		font-weight: 700;
	}
	.main-cols {
		grid-template-columns: 1.7fr 1fr;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.prow {
		display: block;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		transition: background 0.12s;
	}
	.prow:last-child {
		border-bottom: none;
	}
	.prow:hover {
		background: var(--surface-2);
	}
	.prow strong {
		font-size: 13px;
	}
	.meta {
		font-size: 12px;
		margin-top: 4px;
	}
	.dl {
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: 8px 12px;
		margin: 0;
	}
	.dl dt {
		color: var(--ink-3);
		font-size: 12px;
	}
	.dl dd {
		margin: 0;
		font-weight: 600;
	}
	/* event form */
	.evform {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 14px;
		margin-bottom: 18px;
	}
	.inp {
		width: 100%;
		padding: 7px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-family: inherit;
		font-size: 13px;
		background: #fff;
	}
	textarea.inp {
		min-height: 60px;
		resize: vertical;
	}
	.small {
		font-size: 11px;
	}
	@media (max-width: 980px) {
		.main-cols {
			grid-template-columns: 1fr;
		}
	}
</style>
