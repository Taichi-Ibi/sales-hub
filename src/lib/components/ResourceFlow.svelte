<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { canRequestResource, canRespondResource } from '$lib/permissions';
	import { resourceColor, formatDateTime } from '$lib/ui';
	import type { Deal, ResourceRequirement } from '$lib/types';

	let { deal }: { deal: Deal } = $props();

	const mayRequest = $derived(canRequestResource(store.role));
	const mayRespond = $derived(canRespondResource(store.role));

	let editing = $state(false);
	let form = $state<ResourceRequirement>({
		skills: '',
		headcount: '',
		startTime: '',
		duration: '',
		utilization: '',
		note: ''
	});

	function startEdit() {
		form = deal.resource.requirement
			? { ...deal.resource.requirement }
			: { skills: '', headcount: '', startTime: '', duration: '', utilization: '', note: '' };
		editing = true;
	}
	function save() {
		if (!form.skills.trim() || !form.headcount.trim()) return;
		store.append(deal.id, 'resource_requested', { requirement: { ...form } });
		editing = false;
	}

	let responding = $state<null | '手配中' | '対応済'>(null);
	let comment = $state('');
	function submitResponse() {
		if (!responding) return;
		store.append(deal.id, 'resource_responded', { status: responding, comment: comment.trim() });
		responding = null;
		comment = '';
	}

	const req = $derived(deal.resource.requirement);
</script>

<section class="card pad">
	<div class="spread">
		<h4>リソース要件サブフロー</h4>
		<span class="badge {resourceColor(deal.resource.status)}">{deal.resource.status}</span>
	</div>
	<p class="faint hint">
		需要側（どんな人材が必要か）のみ。供給側は既存ファイルで管理し、突合は課長が人手で行う。
	</p>

	{#if editing}
		<div class="grid">
			<div class="field">
				<label for="rf-skills">1. 必要スキル</label>
				<input id="rf-skills" bind:value={form.skills} placeholder="言語・領域 等" />
			</div>
			<div class="field">
				<label for="rf-hc">2. 人数</label>
				<input id="rf-hc" bind:value={form.headcount} placeholder="例: 2名" />
			</div>
			<div class="field">
				<label for="rf-start">3. 開始時期</label>
				<input id="rf-start" bind:value={form.startTime} placeholder="例: 2026年7月" />
			</div>
			<div class="field">
				<label for="rf-dur">4. 想定期間</label>
				<input id="rf-dur" bind:value={form.duration} placeholder="例: 約6ヶ月" />
			</div>
			<div class="field">
				<label for="rf-util">5. 稼働率</label>
				<input id="rf-util" bind:value={form.utilization} placeholder="フル / 一部 等" />
			</div>
		</div>
		<div class="field">
			<label for="rf-note">補足（自由記述）</label>
			<textarea id="rf-note" bind:value={form.note}></textarea>
		</div>
		<div class="row" style="justify-content:flex-end">
			<button class="subtle" onclick={() => (editing = false)}>キャンセル</button>
			<button
				class="primary"
				disabled={!form.skills.trim() || !form.headcount.trim()}
				onclick={save}
			>
				登録
			</button>
		</div>
	{:else if req}
		<dl class="spec">
			<div>
				<dt>必要スキル</dt>
				<dd>{req.skills}</dd>
			</div>
			<div>
				<dt>人数</dt>
				<dd>{req.headcount}</dd>
			</div>
			<div>
				<dt>開始時期</dt>
				<dd>{req.startTime || '—'}</dd>
			</div>
			<div>
				<dt>想定期間</dt>
				<dd>{req.duration || '—'}</dd>
			</div>
			<div>
				<dt>稼働率</dt>
				<dd>{req.utilization || '—'}</dd>
			</div>
			{#if req.note}<div class="full">
					<dt>補足</dt>
					<dd>{req.note}</dd>
				</div>{/if}
		</dl>
		{#if mayRequest}
			<button class="subtle" onclick={startEdit}>要件を更新</button>
		{/if}
	{:else}
		<p class="faint">リソース要件は未登録です。</p>
		{#if mayRequest}
			<button class="primary" onclick={startEdit}>リソース要件を登録</button>
		{:else}
			<p class="faint role-note">登録は PSE（営業が起案する場合あり）が行います。</p>
		{/if}
	{/if}

	<!-- 課長の対応ステータス返信 -->
	{#if req}
		<div class="resp">
			<strong class="sub">手配対応（課長）</strong>
			{#if deal.resource.response}
				<div class="box" class:done={deal.resource.response.status === '対応済'}>
					<div class="box-label">
						{deal.resource.response.status}・{deal.resource.response.by}・{formatDateTime(
							deal.resource.response.at
						)}
					</div>
					<div class="box-text">{deal.resource.response.comment}</div>
				</div>
			{/if}

			{#if mayRespond}
				{#if responding}
					<div class="field">
						<label for="rf-comment">{responding} コメント</label>
						<textarea
							id="rf-comment"
							bind:value={comment}
							placeholder="既存リソースファイルとの突合結果など"
						></textarea>
					</div>
					<div class="row" style="justify-content:flex-end">
						<button class="subtle" onclick={() => (responding = null)}>キャンセル</button>
						<button class="primary" onclick={submitResponse}>{responding}で返信</button>
					</div>
				{:else}
					<div class="row">
						<button onclick={() => (responding = '手配中')}>手配中にする</button>
						<button class="primary" onclick={() => (responding = '対応済')}>対応済にする</button>
					</div>
				{/if}
			{:else if !deal.resource.response}
				<p class="faint role-note">課長の対応待ち（対応ステータスの返信は課長のみ）。</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.pad {
		padding: 16px;
	}
	.hint {
		font-size: 12px;
		margin: 4px 0 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 12px;
	}
	.field {
		margin: 4px 0;
	}
	.spec {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 16px;
		margin: 0 0 12px;
	}
	.spec .full {
		grid-column: 1 / -1;
	}
	.spec dt {
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 600;
	}
	.spec dd {
		margin: 2px 0 0;
		font-size: 13px;
	}
	.resp {
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px solid var(--border);
	}
	.sub {
		font-size: 13px;
		display: block;
		margin-bottom: 8px;
	}
	.box {
		background: var(--amber-weak);
		border-radius: 8px;
		padding: 10px 12px;
		margin-bottom: 10px;
	}
	.box.done {
		background: var(--green-weak);
	}
	.box-label {
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 600;
		margin-bottom: 4px;
	}
	.box-text {
		font-size: 13px;
		white-space: pre-wrap;
	}
	.role-note {
		font-size: 12px;
		margin: 4px 0 0;
	}
</style>
