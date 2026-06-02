<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity } from '$lib/data/types';
	import { yen, relativeDays, triageLabel, daysBetween } from '$lib/data/utils';
	import { TODAY } from '$lib/data/mock';
	import VitalMonitor from '$lib/components/VitalMonitor.svelte';
	import SalesPath from '$lib/components/SalesPath.svelte';
	import FlagBanner from '$lib/components/FlagBanner.svelte';
	import Timeline from '$lib/components/Timeline.svelte';

	let { data } = $props();
	const deal = $derived(data.deal);
	const account = $derived(data.account);

	// SOAP 記録（モックなので追加分を商談IDごとにローカル state へ保持）
	let extra = $state<Record<string, Activity[]>>({});
	const log = $derived<Activity[]>([...(extra[deal.id] ?? []), ...deal.activities]);
	let draft = $state({
		title: '',
		channel: 'オンライン' as Activity['channel'],
		s: '',
		o: '',
		a: '',
		p: ''
	});
	let formOpen = $state(false);

	const channels: Activity['channel'][] = ['訪問', 'オンライン', '電話', 'メール'];

	function addRecord(e: SubmitEvent) {
		e.preventDefault();
		const record: Activity = {
			id: `new-${Date.now()}`,
			date: TODAY,
			author: deal.owner,
			channel: draft.channel,
			title: draft.title || '活動記録',
			soap: { s: draft.s, o: draft.o, a: draft.a, p: draft.p }
		};
		extra = { ...extra, [deal.id]: [record, ...(extra[deal.id] ?? [])] };
		draft = { title: '', channel: 'オンライン', s: '', o: '', a: '', p: '' };
		formOpen = false;
	}

	const overdue = $derived(deal.nextAction && daysBetween(deal.nextAction.due) > 0);
</script>

<div class="breadcrumb">
	<a href={resolve('/')}>ダッシュボード</a> / <a href={resolve('/deals')}>商談一覧</a> / カルテ
</div>

<!-- カルテヘッダー -->
<div class="card khead triage-bar {deal.triage}">
	<div class="card-body">
		<div class="row between wrap" style="align-items:flex-start">
			<div>
				<div class="row" style="gap:10px">
					<span class="badge {deal.triage}"
						><span class="dot {deal.triage}"></span>{triageLabel[deal.triage]}</span
					>
					<span class="badge primary">{deal.stage}</span>
				</div>
				<h1 style="font-size:22px;margin:8px 0 4px">{deal.title}</h1>
				<div class="muted">{account?.name}・{account?.industry}・{account?.employees}</div>
			</div>
			<div class="kpis-mini">
				<div>
					<span class="ml">金額</span><span class="stat-amount mv">{yen(deal.amount)}</span>
				</div>
				<div><span class="ml">確度</span><span class="mv">{deal.probability}%</span></div>
				<div><span class="ml">クローズ予定</span><span class="mv">{deal.closeDate}</span></div>
				<div><span class="ml">主治営業</span><span class="mv">{deal.owner}</span></div>
			</div>
		</div>
	</div>
</div>

<!-- 注意フラグ（常時表示） -->
{#if account}
	<div style="margin-top:14px">
		<FlagBanner flags={account.flags} />
	</div>
{/if}

<!-- バイタル + セールスパス -->
<div class="grid two" style="margin-top:14px">
	<section class="card">
		<div class="card-head">
			<h3>📟 商談バイタル</h3>
			<span class="muted" style="font-size:12px">最終接触 {relativeDays(deal.lastContact)}</span>
		</div>
		<div class="card-body"><VitalMonitor vitals={deal.vitals} /></div>
	</section>
	<section class="card">
		<div class="card-head"><h3>🧭 セールスパス</h3></div>
		<div class="card-body"><SalesPath stage={deal.stage} /></div>
	</section>
</div>

<div class="grid main-cols" style="margin-top:14px">
	<!-- タイムライン -->
	<section class="card">
		<div class="card-head">
			<h3>🗂️ 診療記録（SOAPタイムライン）</h3>
			<button class="btn primary sm" onclick={() => (formOpen = !formOpen)}>
				{formOpen ? '閉じる' : '＋ 記録を追加'}
			</button>
		</div>
		<div class="card-body">
			{#if formOpen}
				<form class="soapform" onsubmit={addRecord}>
					<div class="row" style="gap:10px;margin-bottom:10px">
						<input
							class="inp"
							placeholder="タイトル（例: 提案レビュー）"
							bind:value={draft.title}
						/>
						<select class="inp" bind:value={draft.channel} style="max-width:140px">
							{#each channels as c (c)}<option>{c}</option>{/each}
						</select>
					</div>
					<label class="fl"
						><span class="tag s">S</span><textarea
							bind:value={draft.s}
							placeholder="主観：顧客の発言・要望"
						></textarea></label
					>
					<label class="fl"
						><span class="tag o">O</span><textarea
							bind:value={draft.o}
							placeholder="客観：観測した事実・データ"
						></textarea></label
					>
					<label class="fl"
						><span class="tag a">A</span><textarea
							bind:value={draft.a}
							placeholder="評価：営業としての見立て"
						></textarea></label
					>
					<label class="fl"
						><span class="tag p">P</span><textarea bind:value={draft.p} placeholder="計画：次の一手"
						></textarea></label
					>
					<div class="row" style="justify-content:flex-end;margin-top:8px">
						<button type="submit" class="btn primary sm">記録する</button>
					</div>
				</form>
			{/if}
			<Timeline activities={log} />
		</div>
	</section>

	<!-- サイド：申し送り・次アクション -->
	<aside style="display:flex;flex-direction:column;gap:14px">
		<section class="card">
			<div class="card-head"><h3>📨 申し送り</h3></div>
			<div class="card-body">
				<p style="margin:0;font-size:13px;color:var(--ink-2)">{deal.handoff}</p>
			</div>
		</section>

		{#if deal.nextAction}
			<section class="card">
				<div class="card-head"><h3>⏭️ 次アクション</h3></div>
				<div class="card-body">
					<div class="next" class:overdue>
						<strong>{deal.nextAction.label}</strong>
						<div class="due">期日 {deal.nextAction.due}{overdue ? '（超過）' : ''}</div>
					</div>
				</div>
			</section>
		{/if}

		<section class="card">
			<div class="card-head"><h3>🏢 取引先情報</h3></div>
			<div class="card-body" style="font-size:13px">
				<dl class="dl">
					<dt>企業名</dt>
					<dd>{account?.name}</dd>
					<dt>業種</dt>
					<dd>{account?.industry}</dd>
					<dt>従業員</dt>
					<dd>{account?.employees}</dd>
					<dt>注意フラグ</dt>
					<dd>{account?.flags.length} 件</dd>
				</dl>
			</div>
		</section>
	</aside>
</div>

<style>
	.kpis-mini {
		display: grid;
		grid-template-columns: repeat(2, auto);
		gap: 6px 28px;
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
		font-size: 16px;
		font-weight: 700;
	}
	.two {
		grid-template-columns: 1.3fr 1fr;
		align-items: start;
	}
	.main-cols {
		grid-template-columns: 1.7fr 1fr;
		align-items: start;
	}
	.next {
		background: var(--primary-soft);
		color: var(--primary-strong);
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		font-size: 13px;
	}
	.next.overdue {
		background: var(--triage-critical-soft);
		color: var(--triage-critical);
	}
	.next .due {
		font-size: 11px;
		opacity: 0.85;
		margin-top: 2px;
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
	/* SOAP form */
	.soapform {
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
	.fl {
		display: grid;
		grid-template-columns: 24px 1fr;
		gap: 10px;
		align-items: start;
		margin-bottom: 8px;
	}
	.fl textarea {
		width: 100%;
		min-height: 42px;
		padding: 7px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-family: inherit;
		font-size: 13px;
		resize: vertical;
		background: #fff;
	}
	.tag {
		width: 24px;
		height: 24px;
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
	@media (max-width: 980px) {
		.two,
		.main-cols {
			grid-template-columns: 1fr;
		}
	}
</style>
