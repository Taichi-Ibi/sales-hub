<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const home = resolve('/');
	const dealsPath = resolve('/deals');
	const nav = [
		{ href: home, icon: '🩺', label: 'ダッシュボード', match: (p: string) => p === home },
		{
			href: dealsPath,
			icon: '📋',
			label: '商談一覧',
			match: (p: string) => p.startsWith(dealsPath)
		}
	];
</script>

<aside class="sidebar">
	<div class="brand">
		<span class="logo">🏥</span>
		<span>
			Sales Hub
			<small>CLINICAL CRM</small>
		</span>
	</div>

	<div class="nav-label">診療</div>
	{#each nav as item (item.href)}
		<a href={item.href} class="nav-item" class:active={item.match(page.url.pathname)}>
			<span class="ico">{item.icon}</span>
			{item.label}
		</a>
	{/each}

	<div class="spacer"></div>

	<div class="me">
		<span class="avatar">佐</span>
		<div>
			<div style="color:#fff;font-size:13px;font-weight:600">佐藤 健太</div>
			<div style="font-size:11px;color:#7d93a8">主治営業 / 第一営業部</div>
		</div>
	</div>
</aside>
