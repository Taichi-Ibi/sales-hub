<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		deriveProjectStatus,
		isWon,
		projectAttachments,
		projectEvents,
		statusClass,
		yen
	} from '$lib/data/utils';
	import EventTimeline from '$lib/components/EventTimeline.svelte';
	import ProjectPath from '$lib/components/ProjectPath.svelte';

	let { data } = $props();
	const project = $derived(data.project);
	const customer = $derived(data.customer);

	const status = $derived(deriveProjectStatus(project.id));
	const log = $derived(projectEvents(project.id));
	const attachments = $derived(projectAttachments(project.id));
	const won = $derived(isWon(status));

	// 受注イベント（確定金額・契約情報の取得元）
	const orderEvent = $derived(log.find((e) => e.type === '受注'));

	// 添付を種別ごとに（提案書・見積書・契約書）
	const byKind = $derived({
		提案書: attachments.filter((a) => a.attachment.kind === '提案書'),
		見積書: attachments.filter((a) => a.attachment.kind === '見積書'),
		契約書: attachments.filter((a) => a.attachment.kind === '契約書')
	});
</script>

<div class="breadcrumb">
	<a href={resolve('/')}>ダッシュボード</a> /
	<a href={resolve('/customers')}>顧客一覧</a> /
	{#if customer}<a href={resolve('/customers/[id]', { id: customer.id })}>{customer.name}</a> /
	{/if}
	{project.name}
</div>

<!-- 案件ヘッダー -->
<div class="card phead status-bar {statusClass[status]}">
	<div class="card-body">
		<div class="row between wrap" style="align-items:flex-start">
			<div>
				<div class="row" style="gap:10px">
					<span class="badge {statusClass[status]}">{status}</span>
					<span class="muted" style="font-size:12px">← イベント履歴から導出</span>
				</div>
				<h1 style="font-size:22px;margin:8px 0 4px">{project.name}</h1>
				{#if customer}
					<a class="urllink muted" href={resolve('/customers/[id]', { id: customer.id })}>
						{customer.name}・{customer.industry}
					</a>
				{/if}
			</div>
			<div class="kpis-mini">
				<div>
					<span class="ml">{won ? '受注額' : '売上予測'}</span>
					<span class="stat-amount mv">{yen(orderEvent?.amount ?? project.expectedAmount)}</span>
				</div>
				<div>
					<span class="ml">粗利率</span>
					<span class="mv">{orderEvent?.margin ?? project.expectedMargin}%</span>
				</div>
				<div>
					<span class="ml">受注(予定)日</span><span class="mv">{project.closeDate ?? '—'}</span>
				</div>
				<div><span class="ml">納期</span><span class="mv">{project.dueDate ?? '—'}</span></div>
			</div>
		</div>
	</div>
</div>

<!-- ステータス進行 -->
<section class="card" style="margin-top:14px">
	<div class="card-head"><h3>案件ステータス</h3></div>
	<div class="card-body"><ProjectPath {status} /></div>
</section>

<div class="grid main-cols" style="margin-top:14px">
	<!-- 案件タイムライン -->
	<section class="card">
		<div class="card-head">
			<h3>案件タイムライン</h3>
			<span class="muted" style="font-size:12px">{log.length}件のイベント</span>
		</div>
		<div class="card-body">
			<EventTimeline events={log} />
		</div>
	</section>

	<!-- サイド: 概要・資料・契約 -->
	<aside class="side">
		<section class="card">
			<div class="card-head"><h3>案件概要</h3></div>
			<div class="card-body" style="font-size:13px">
				<dl class="dl">
					<dt>顧客</dt>
					<dd>{customer?.name ?? '—'}</dd>
					<dt>想定売上</dt>
					<dd>{yen(project.expectedAmount)}</dd>
					<dt>想定粗利率</dt>
					<dd>{project.expectedMargin}%</dd>
					<dt>ステータス</dt>
					<dd><span class="badge {statusClass[status]}">{status}</span></dd>
				</dl>
			</div>
		</section>

		<section class="card">
			<div class="card-head"><h3>提案書・見積書</h3></div>
			<div class="card-body" style="display:flex;flex-direction:column;gap:8px">
				{#if byKind.提案書.length === 0 && byKind.見積書.length === 0}
					<p class="muted" style="margin:0">まだ提出済み資料はありません。</p>
				{:else}
					{#each [...byKind.提案書, ...byKind.見積書] as a (a.attachment.name)}
						<div class="att">
							<div>
								<strong style="font-size:13px">{a.attachment.name}</strong>
								<div class="muted small">{a.attachment.kind}・{a.event.date}</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>

		<section class="card">
			<div class="card-head"><h3>契約情報</h3></div>
			<div class="card-body" style="font-size:13px">
				{#if orderEvent}
					<dl class="dl">
						<dt>受注日</dt>
						<dd>{orderEvent.date}</dd>
						<dt>受注額</dt>
						<dd class="stat-amount">{yen(orderEvent.amount ?? 0)}</dd>
						<dt>粗利率</dt>
						<dd>{orderEvent.margin}%</dd>
						<dt>納期</dt>
						<dd>{project.dueDate ?? '—'}</dd>
					</dl>
					{#each byKind.契約書 as a (a.attachment.name)}
						<div class="att" style="margin-top:8px">
							<strong style="font-size:13px">{a.attachment.name}</strong>
						</div>
					{/each}
				{:else}
					<p class="muted" style="margin:0">
						未受注です。契約情報は受注イベントの記録時に確定します。
					</p>
				{/if}
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
	.dl {
		display: grid;
		grid-template-columns: 80px 1fr;
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
	.att {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 8px;
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
