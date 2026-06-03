<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const home = resolve('/');
	const customersPath = resolve('/customers');
	const projectsPath = resolve('/projects');

	const nav = [
		{ href: home, icon: '📊', label: 'ダッシュボード', match: (p: string) => p === home },
		{
			href: customersPath,
			icon: '🏢',
			label: '顧客',
			match: (p: string) => p.startsWith(customersPath)
		},
		{
			href: projectsPath,
			icon: '📁',
			label: '案件',
			match: (p: string) => p.startsWith(projectsPath)
		}
	];
</script>

<aside class="sidebar">
	<div class="brand">
		<span class="logo">◆</span>
		<span>
			Sales Hub
			<small>CUSTOMER CRM</small>
		</span>
	</div>

	<div class="nav-label">メニュー</div>
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
			<div style="font-size:11px;color:#8089a8">営業担当 / 第一営業部</div>
		</div>
	</div>
</aside>
