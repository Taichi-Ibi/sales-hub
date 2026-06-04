<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { canRequestResource, canRespondResource } from '$lib/permissions';
	import { resourceColor, formatDateTime } from '$lib/ui';
	import { ROTATION_PREFERENCES } from '$lib/types';
	import type { Deal, ResourceRequirement, ResourceMember } from '$lib/types';

	let { deal }: { deal: Deal } = $props();

	const mayRequest = $derived(canRequestResource(store.role));
	const mayRespond = $derived(canRespondResource(store.role));

	function emptyForm(): ResourceRequirement {
		return { members: [], startTime: '', duration: '', note: '' };
	}
	function emptyMember(): ResourceMember {
		return { skill: '', rotation: 'フル稼働', note: '' };
	}

	let editing = $state(false);
	let form = $state<ResourceRequirement>(emptyForm());
	// 体制は1人ずつ登録する。ローテ希望を聞きながら入力するための下書き欄。
	let draft = $state<ResourceMember>(emptyMember());

	function startEdit() {
		form = deal.resource.requirement
			? {
					...deal.resource.requirement,
					members: deal.resource.requirement.members.map((m) => ({ ...m }))
				}
			: emptyForm();
		draft = emptyMember();
		editing = true;
	}
	function addMember() {
		if (!draft.skill.trim()) return;
		// 新しく登録したメンバーが上に来るように先頭へ追加する
		form.members = [
			{ skill: draft.skill.trim(), rotation: draft.rotation, note: draft.note.trim() },
			...form.members
		];
		draft = emptyMember();
	}
	function removeMember(i: number) {
		form.members = form.members.filter((_, idx) => idx !== i);
	}
	function save() {
		if (form.members.length === 0) return;
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
		<!-- 体制は1人ずつ登録する（ローテ希望を聞きながら追加） -->
		<strong class="sub">体制（1人ずつ登録）</strong>
		<div class="add-member">
			<div class="field">
				<label for="rf-skill">役割・必要スキル</label>
				<input id="rf-skill" bind:value={draft.skill} placeholder="例: Java / Spring（リード）" />
			</div>
			<div class="field">
				<label for="rf-rot">ローテ希望</label>
				<select id="rf-rot" bind:value={draft.rotation}>
					{#each ROTATION_PREFERENCES as r (r)}
						<option value={r}>{r}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label for="rf-mnote">補足（任意）</label>
				<input
					id="rf-mnote"
					bind:value={draft.note}
					placeholder="例: 金融ドメイン経験者が望ましい"
				/>
			</div>
			<button class="primary add-btn" disabled={!draft.skill.trim()} onclick={addMember}>
				＋ メンバーを追加
			</button>
		</div>

		{#if form.members.length > 0}
			<ul class="member-list">
				{#each form.members as m, i (i)}
					<li>
						<div class="m-main">
							<span class="m-skill">{m.skill}</span>
							<span class="badge blue">{m.rotation}</span>
						</div>
						{#if m.note}<div class="m-note faint">{m.note}</div>{/if}
						<button class="subtle m-del" onclick={() => removeMember(i)} aria-label="削除">✕</button
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="faint hint">まだメンバーが登録されていません。1人ずつ追加してください。</p>
		{/if}

		<div class="grid">
			<div class="field">
				<label for="rf-start">開始時期</label>
				<input id="rf-start" bind:value={form.startTime} placeholder="例: 2026年7月" />
			</div>
			<div class="field">
				<label for="rf-dur">想定期間</label>
				<input id="rf-dur" bind:value={form.duration} placeholder="例: 約6ヶ月" />
			</div>
		</div>
		<div class="field">
			<label for="rf-note">補足（自由記述）</label>
			<textarea id="rf-note" bind:value={form.note}></textarea>
		</div>
		<div class="row" style="justify-content:flex-end">
			<button class="subtle" onclick={() => (editing = false)}>キャンセル</button>
			<button class="primary" disabled={form.members.length === 0} onclick={save}>登録</button>
		</div>
	{:else if req}
		<div class="spread member-head">
			<strong class="sub">体制</strong>
			<span class="badge gray">{req.members.length}名</span>
		</div>
		<ul class="member-list view">
			{#each req.members as m, i (i)}
				<li>
					<div class="m-main">
						<span class="m-skill">{m.skill}</span>
						<span class="badge blue">{m.rotation}</span>
					</div>
					{#if m.note}<div class="m-note faint">{m.note}</div>{/if}
				</li>
			{/each}
		</ul>
		<dl class="spec">
			<div>
				<dt>開始時期</dt>
				<dd>{req.startTime || '—'}</dd>
			</div>
			<div>
				<dt>想定期間</dt>
				<dd>{req.duration || '—'}</dd>
			</div>
			{#if req.note}<div class="full">
					<dt>補足</dt>
					<dd>{req.note}</dd>
				</div>{/if}
		</dl>
		{#if mayRequest}
			<button class="subtle" onclick={startEdit}>体制を更新</button>
		{/if}
	{:else}
		<p class="faint">体制は未登録です。</p>
		{#if mayRequest}
			<button class="primary" onclick={startEdit}>体制を登録</button>
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
	.add-member {
		display: grid;
		grid-template-columns: 1fr 160px 1fr auto;
		gap: 8px;
		align-items: end;
		background: var(--gray-weak);
		border-radius: 8px;
		padding: 10px 12px;
		margin: 4px 0 12px;
	}
	.add-btn {
		white-space: nowrap;
	}
	.member-list {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.member-list li {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 32px 8px 10px;
	}
	.member-list.view li {
		background: var(--gray-weak);
	}
	.m-main {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.m-skill {
		font-size: 13px;
		font-weight: 600;
	}
	.m-note {
		font-size: 12px;
		margin-top: 3px;
	}
	.m-del {
		position: absolute;
		top: 6px;
		right: 6px;
		padding: 2px 6px;
		font-size: 12px;
		line-height: 1;
	}
	.member-head {
		margin-bottom: 8px;
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
	@media (max-width: 480px) {
		.grid,
		.spec,
		.add-member {
			grid-template-columns: 1fr;
		}
	}
</style>
