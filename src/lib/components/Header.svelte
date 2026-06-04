<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { ROLES } from '$lib/types';
	import type { Role } from '$lib/types';

	let { onToggleNotifications, unread }: { onToggleNotifications: () => void; unread: number } =
		$props();

	function onRoleChange(e: Event) {
		store.setRole((e.target as HTMLSelectElement).value as Role);
	}
</script>

<header class="hdr">
	<div class="brand">
		<span class="logo">SH</span>
		<div>
			<div class="title">Sales Hub</div>
			<div class="sub faint">案件リレー型 営業支援ツール — モックアップ</div>
		</div>
	</div>

	<div class="right">
		<button class="bell subtle" onclick={onToggleNotifications} title="Slack通知（モック）">
			🔔 通知
			{#if unread > 0}
				<span class="dot">{unread}</span>
			{/if}
		</button>

		<!-- GWS SSO を模擬: ログインユーザー（ロール）を切り替えて挙動を確認できる -->
		<div class="user">
			<div class="user-meta">
				<div class="user-name">{store.user.name}</div>
				<div class="user-mail faint">{store.user.email}</div>
			</div>
			<select aria-label="ロール切替（GWS SSO模擬）" value={store.role} onchange={onRoleChange}>
				{#each ROLES as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
		</div>
	</div>
</header>

<style>
	.hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 20px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 20;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	.title {
		font-size: 16px;
		font-weight: 700;
	}
	.sub {
		font-size: 11px;
	}
	.right {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.bell {
		position: relative;
		font-size: 13px;
	}
	.dot {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--red);
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		min-width: 16px;
		height: 16px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		padding: 0 4px;
	}
	.user {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.user-meta {
		text-align: right;
		line-height: 1.3;
	}
	.user-name {
		font-size: 13px;
		font-weight: 600;
	}
	.user-mail {
		font-size: 11px;
	}
	.user select {
		width: auto;
		padding: 6px 8px;
	}
</style>
