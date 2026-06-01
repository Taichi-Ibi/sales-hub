<script lang="ts">
	let menuOpen = $state(false);

	const stats = [
		{ label: '今月の売上', value: '¥12,480,000', change: '+8.2%', up: true },
		{ label: '商談数', value: '48', change: '+3件', up: true },
		{ label: '成約率', value: '34%', change: '-2.1%', up: false },
		{ label: '新規リード', value: '127', change: '+21件', up: true }
	];

	const deals = [
		{ company: '株式会社サンプル', contact: '田中 一郎', amount: '¥2,400,000', stage: '提案中', days: 12 },
		{ company: 'テスト商事', contact: '鈴木 花子', amount: '¥980,000', stage: '見積送付', days: 5 },
		{ company: 'デモ工業 株式会社', contact: '佐藤 次郎', amount: '¥5,100,000', stage: '交渉中', days: 28 },
		{ company: '例示コーポレーション', contact: '山田 三郎', amount: '¥720,000', stage: 'クロージング', days: 3 },
		{ company: 'フィクション産業', contact: '伊藤 美咲', amount: '¥1,560,000', stage: '提案中', days: 9 }
	];

	const stageColor: Record<string, string> = {
		'提案中': 'stage-proposal',
		'見積送付': 'stage-quote',
		'交渉中': 'stage-negotiation',
		'クロージング': 'stage-closing'
	};

	const navItems = [
		{ icon: '👥', label: '顧客管理', href: '/customers' },
		{ icon: '💼', label: '商談管理', href: '/deals' },
		{ icon: '📊', label: 'レポート', href: '/reports' },
		{ icon: '📅', label: 'スケジュール', href: '/schedule' },
		{ icon: '📧', label: 'メール', href: '/mail' },
		{ icon: '⚙️', label: '設定', href: '/settings' }
	];
</script>

<svelte:head>
	<title>Sales Hub</title>
</svelte:head>

<!-- Mobile overlay -->
{#if menuOpen}
	<button class="overlay" onclick={() => (menuOpen = false)} aria-label="メニューを閉じる"></button>
{/if}

<div class="layout">
	<!-- Sidebar (desktop: full / tablet: icon-only / mobile: drawer) -->
	<nav class="sidebar" class:open={menuOpen}>
		<div class="logo">
			<span class="logo-icon">◈</span>
			<span class="logo-text">Sales Hub</span>
		</div>
		<ul class="nav-list">
			{#each navItems as item}
				<li>
					<a href={item.href} class="nav-item" onclick={() => (menuOpen = false)}>
						<span class="nav-icon" aria-hidden="true">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
		<div class="user-info">
			<div class="avatar">P</div>
			<div class="user-meta">
				<div class="user-name">Phil</div>
				<div class="user-role">Sales Manager</div>
			</div>
		</div>
	</nav>

	<div class="main-wrapper">
		<!-- Mobile / tablet top bar -->
		<div class="topbar">
			<button class="hamburger" onclick={() => (menuOpen = !menuOpen)} aria-label="メニュー">
				<span></span><span></span><span></span>
			</button>
			<span class="topbar-logo">◈ Sales Hub</span>
			<button class="btn-primary topbar-btn">+ 新規商談</button>
		</div>

		<main class="content">
			<header class="page-header">
				<div>
					<h1 class="page-title">ダッシュボード</h1>
					<p class="page-subtitle">2026年6月1日（月）</p>
				</div>
				<button class="btn-primary desktop-only">+ 新規商談</button>
			</header>

			<section class="stats-grid">
				{#each stats as stat}
					<div class="stat-card">
						<div class="stat-label">{stat.label}</div>
						<div class="stat-value">{stat.value}</div>
						<div class="stat-change" class:up={stat.up} class:down={!stat.up}>
							{stat.up ? '▲' : '▼'} {stat.change}
						</div>
					</div>
				{/each}
			</section>

			<section class="deals-section">
				<div class="section-header">
					<h2 class="section-title">進行中の商談</h2>
					<a href="/deals" class="link-all">すべて見る →</a>
				</div>
				<div class="table-wrapper">
					<table class="deals-table">
						<thead>
							<tr>
								<th>会社名</th>
								<th>担当者</th>
								<th>金額</th>
								<th>ステージ</th>
								<th>経過日数</th>
							</tr>
						</thead>
						<tbody>
							{#each deals as deal}
								<tr>
									<td class="company-name">{deal.company}</td>
									<td>{deal.contact}</td>
									<td class="amount">{deal.amount}</td>
									<td><span class="stage-badge {stageColor[deal.stage]}">{deal.stage}</span></td>
									<td class="days">{deal.days}日</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</main>
	</div>
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #f4f5f7;
		color: #1a1a2e;
	}

	/* ── Layout ── */
	.layout {
		display: flex;
		min-height: 100vh;
	}

	.main-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	/* ── Overlay (mobile drawer background) ── */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 40;
		border: none;
		cursor: default;
	}

	/* ── Sidebar ── */
	.sidebar {
		width: 220px;
		background: #1a1a2e;
		display: flex;
		flex-direction: column;
		padding: 24px 0;
		flex-shrink: 0;
		transition: transform 0.25s ease;
		z-index: 50;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 20px 28px;
		border-bottom: 1px solid #2d2d4e;
		overflow: hidden;
	}

	.logo-icon {
		font-size: 22px;
		color: #6c63ff;
		flex-shrink: 0;
	}

	.logo-text {
		font-size: 18px;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}

	.nav-list {
		list-style: none;
		padding: 16px 0;
		flex: 1;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 20px;
		color: #9090b0;
		text-decoration: none;
		font-size: 14px;
		transition: background 0.15s, color 0.15s;
		border-left: 3px solid transparent;
		white-space: nowrap;
		overflow: hidden;
	}

	.nav-item:hover {
		background: #2d2d4e;
		color: #fff;
		border-left-color: #6c63ff;
	}

	.nav-list li:first-child .nav-item {
		color: #fff;
		background: #2d2d4e;
		border-left-color: #6c63ff;
	}

	.nav-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 20px;
		border-top: 1px solid #2d2d4e;
		overflow: hidden;
	}

	.avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: #6c63ff;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 14px;
		flex-shrink: 0;
	}

	.user-name {
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.user-role {
		color: #9090b0;
		font-size: 11px;
		white-space: nowrap;
	}

	/* ── Top bar (hidden on desktop) ── */
	.topbar {
		display: none;
	}

	/* ── Main content ── */
	.content {
		flex: 1;
		padding: 32px 36px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28px;
	}

	.page-title {
		font-size: 24px;
		font-weight: 700;
		color: #1a1a2e;
	}

	.page-subtitle {
		font-size: 13px;
		color: #888;
		margin-top: 4px;
	}

	.btn-primary {
		background: #6c63ff;
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: #574fd6;
	}

	/* ── Stats ── */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 28px;
	}

	.stat-card {
		background: #fff;
		border-radius: 12px;
		padding: 20px 24px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
	}

	.stat-label {
		font-size: 12px;
		color: #888;
		margin-bottom: 8px;
	}

	.stat-value {
		font-size: 26px;
		font-weight: 700;
		color: #1a1a2e;
		margin-bottom: 8px;
	}

	.stat-change {
		font-size: 12px;
		font-weight: 600;
	}

	.stat-change.up { color: #22c55e; }
	.stat-change.down { color: #ef4444; }

	/* ── Deals ── */
	.deals-section {
		background: #fff;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 700;
	}

	.link-all {
		font-size: 13px;
		color: #6c63ff;
		text-decoration: none;
	}

	.link-all:hover { text-decoration: underline; }

	.table-wrapper {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.deals-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		min-width: 520px;
	}

	.deals-table th {
		text-align: left;
		padding: 10px 16px;
		color: #888;
		font-size: 12px;
		font-weight: 600;
		border-bottom: 1px solid #eee;
		white-space: nowrap;
	}

	.deals-table td {
		padding: 14px 16px;
		border-bottom: 1px solid #f0f0f0;
	}

	.deals-table tr:last-child td { border-bottom: none; }
	.deals-table tr:hover td { background: #fafafa; }

	.company-name { font-weight: 600; }
	.amount { font-weight: 600; color: #1a1a2e; }
	.days { color: #888; }

	.stage-badge {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 100px;
		font-size: 12px;
		font-weight: 600;
	}

	.stage-proposal   { background: #ede9fe; color: #6c63ff; }
	.stage-quote      { background: #dbeafe; color: #2563eb; }
	.stage-negotiation{ background: #fef3c7; color: #d97706; }
	.stage-closing    { background: #dcfce7; color: #16a34a; }

	/* ── Hamburger button ── */
	.hamburger {
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 4px;
	}

	.hamburger span {
		display: block;
		width: 22px;
		height: 2px;
		background: #fff;
		border-radius: 2px;
	}

	/* ════════════════════════════
	   Tablet  768px – 1023px
	   Sidebar: icon-only (64px)
	════════════════════════════ */
	@media (max-width: 1023px) and (min-width: 768px) {
		.sidebar {
			width: 64px;
		}

		.logo {
			justify-content: center;
			padding: 0 0 20px;
		}

		.logo-text { display: none; }

		.nav-item {
			justify-content: center;
			padding: 12px 0;
			border-left: none;
			border-right: 3px solid transparent;
		}

		.nav-item:hover { border-right-color: #6c63ff; border-left-color: transparent; }

		.nav-list li:first-child .nav-item {
			border-right-color: #6c63ff;
			border-left-color: transparent;
		}

		.nav-label { display: none; }

		.user-info { justify-content: center; padding: 16px 0; }
		.user-meta { display: none; }

		.stats-grid { grid-template-columns: repeat(2, 1fr); }

		.content { padding: 24px 20px; }
	}

	/* ════════════════════════════
	   Mobile  < 768px
	   Sidebar: off-canvas drawer
	════════════════════════════ */
	@media (max-width: 767px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100%;
			transform: translateX(-100%);
			width: 220px;
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.topbar {
			display: flex;
			align-items: center;
			gap: 12px;
			background: #1a1a2e;
			padding: 12px 16px;
			position: sticky;
			top: 0;
			z-index: 30;
		}

		.topbar-logo {
			flex: 1;
			color: #fff;
			font-weight: 700;
			font-size: 16px;
			letter-spacing: 0.5px;
		}

		.topbar-btn {
			padding: 7px 14px;
			font-size: 13px;
		}

		.desktop-only { display: none; }

		.content { padding: 20px 16px; }

		.page-header { margin-bottom: 20px; }

		.page-title { font-size: 20px; }

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 12px;
			margin-bottom: 20px;
		}

		.stat-card { padding: 16px; }

		.stat-value { font-size: 20px; }

		.deals-section { padding: 16px; }

		.deals-table td,
		.deals-table th { padding: 10px 12px; }
	}
</style>
