<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { companies, deals, people } from '$lib/data/mock';

	const home = resolve('/');
	const companiesPath = resolve('/companies');
	const peoplePath = resolve('/people');
	const dealsPath = resolve('/deals');

	const navigationItems = [
		{
			href: home,
			label: 'ホーム',
			icon: 'home',
			match: (p: string) => p === home
		}
	];

	const recordItems = [
		{
			href: companiesPath,
			label: '企業',
			icon: 'building',
			count: companies.length,
			match: (p: string) => p.startsWith(companiesPath)
		},
		{
			href: peoplePath,
			label: '担当者',
			icon: 'users',
			count: people.length,
			match: (p: string) => p.startsWith(peoplePath)
		},
		{
			href: dealsPath,
			label: '案件',
			icon: 'zap',
			count: deals.length,
			match: (p: string) => p.startsWith(dealsPath)
		}
	];
</script>

<aside class="sidebar">
	<div class="sidebar-workspace">
		<div class="sidebar-workspace-icon">S</div>
		<div class="sidebar-workspace-info">
			<span class="sidebar-workspace-name">Sales Hub</span>
			<span class="sidebar-workspace-plan">ワークスペース</span>
		</div>
		<svg class="sidebar-workspace-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
	</div>

	<div class="sidebar-search">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
		<span>検索...</span>
		<kbd>⌘K</kbd>
	</div>

	<nav class="sidebar-section">
		{#each navigationItems as item (item.href)}
			<a
				href={item.href}
				class="sidebar-item"
				class:active={item.match(page.url.pathname)}
			>
				{#if item.icon === 'home'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				{/if}
				{item.label}
			</a>
		{/each}
	</nav>

	<nav class="sidebar-section">
		<div class="sidebar-section-label">レコード</div>
		{#each recordItems as item (item.href)}
			<a
				href={item.href}
				class="sidebar-item"
				class:active={item.match(page.url.pathname)}
			>
				{#if item.icon === 'building'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
				{:else if item.icon === 'users'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
				{:else if item.icon === 'zap'}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
				{/if}
				{item.label}
				{#if item.count}
					<span class="count">{item.count}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="sidebar-spacer"></div>

	<div class="sidebar-user">
		<div class="avatar" style="background:#4f46e5">佐</div>
		<div class="sidebar-user-info">
			<div class="sidebar-user-name">佐藤 健太</div>
			<div class="sidebar-user-role">営業マネージャー</div>
		</div>
	</div>
</aside>
