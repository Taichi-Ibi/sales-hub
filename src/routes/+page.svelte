<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { deals, eventLogs, initializeFromStorage } from '$lib/intelligence/store.svelte.js';
	import { computeHandoffOverview } from '$lib/intelligence/handoff.js';

	onMount(() => initializeFromStorage());

	const handoff = $derived(computeHandoffOverview(deals, eventLogs));
	const ready = $derived(deals.length > 0);
</script>

<svelte:head>
	<title>Sales Hub — 申し送りを、構造的に漏らさない</title>
</svelte:head>

<div class="landing">
	<main class="hero">
		<span class="eyebrow">Sales Brain</span>
		<h1 class="headline">申し送りを、構造的に漏らさない。</h1>
		<p class="lede">
			案件が前に進むたび、情報は Slack・メール・カレンダー・議事録に散らばる。<br />
			Sales Hub は、フェーズを次へ渡す前に「漏れている申し送り」をAIが指摘し、揃うまで前進させません。
		</p>

		<!-- 最初の30秒：いきなり "いま何件漏れているか" を突きつける -->
		<section class="snapshot" aria-label="現在の申し送り状況">
			{#if !ready}
				<p class="snapshot-loading">あなたのチームの状況を読み込んでいます…</p>
			{:else if handoff.leakCount === 0}
				<div class="snapshot-grid">
					<div class="snapshot-primary clean">
						<span class="snapshot-value">0</span>
						<span class="snapshot-label">申し送り漏れ — ゼロ達成中</span>
					</div>
					<div class="snapshot-meta">
						<p>フェーズ移行の充足率 <strong>{handoff.fulfillmentRate}%</strong></p>
						<p>{handoff.totalDeals}件の案件すべてで、次へ渡す準備が整っています。</p>
					</div>
				</div>
			{:else}
				<div class="snapshot-grid">
					<div class="snapshot-primary leak">
						<span class="snapshot-value">{handoff.leakCount}</span>
						<span class="snapshot-label">いま漏れている申し送り</span>
					</div>
					<div class="snapshot-meta">
						<p>
							<strong>{handoff.atRiskDealCount}件</strong
							>の案件が、申し送りを残したまま次フェーズに進もうとしています。
						</p>
						<p>フェーズ移行の充足率は <strong>{handoff.fulfillmentRate}%</strong>。</p>
					</div>
				</div>
			{/if}
		</section>

		<a class="cta" href={resolve('/intelligence')}>
			{handoff.leakCount > 0 ? '漏れている申し送りを確認する' : 'ダッシュボードを開く'} →
		</a>

		<ul class="how">
			<li><strong>集める</strong> — やり取りを案件に紐づける。入力させない。</li>
			<li><strong>指摘する</strong> — 渡す前に、漏れている申し送りをAIが突きつける。</li>
			<li><strong>進ませない</strong> — 申し送りが揃うまでフェーズ移行をゲートで止める。</li>
		</ul>
	</main>

	<footer class="foot">
		フロントエンドのみのモックアップ（localStorage保存・外部通信なし）。AIはテンプレート駆動のシミュレーションです。
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(165deg, #021b3a 0%, #032d60 45%, #0176d3 100%);
		color: white;
	}

	.hero {
		flex: 1;
		max-width: 760px;
		width: 100%;
		margin: 0 auto;
		padding: clamp(40px, 9vh, 96px) 24px 48px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.eyebrow {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.headline {
		font-size: clamp(30px, 6vw, 48px);
		font-weight: 800;
		line-height: 1.15;
		margin: 16px 0 20px;
		color: white;
	}

	.lede {
		font-size: clamp(15px, 2.4vw, 18px);
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.88);
		margin: 0 0 32px;
	}

	.snapshot {
		width: 100%;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 28px;
	}

	.snapshot-loading {
		margin: 0;
		color: rgba(255, 255, 255, 0.75);
	}

	.snapshot-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 24px;
	}

	.snapshot-primary {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 140px;
	}

	.snapshot-value {
		font-size: 64px;
		line-height: 1;
		font-weight: 800;
	}

	.snapshot-primary.leak .snapshot-value {
		color: #ffd0d0;
	}

	.snapshot-primary.clean .snapshot-value {
		color: var(--color-accent);
	}

	.snapshot-label {
		font-size: 14px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
	}

	.snapshot-meta {
		flex: 1;
		min-width: 220px;
		font-size: 15px;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.88);
	}

	.snapshot-meta p {
		margin: 0 0 6px;
	}

	.snapshot-meta strong {
		color: var(--color-accent);
	}

	.cta {
		display: inline-block;
		background: var(--color-accent);
		color: var(--color-brand-dark);
		font-size: 16px;
		font-weight: 700;
		text-decoration: none;
		padding: 14px 28px;
		border-radius: 8px;
		transition:
			transform 0.15s ease,
			background 0.15s ease;
	}

	.cta:hover {
		background: var(--color-accent-hover);
		transform: translateY(-1px);
	}

	.how {
		list-style: none;
		margin: 36px 0 0;
		padding: 0;
		display: grid;
		gap: 12px;
		width: 100%;
	}

	.how li {
		font-size: 15px;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.85);
		padding-left: 16px;
		border-left: 3px solid var(--color-accent);
	}

	.how strong {
		color: white;
	}

	.foot {
		padding: 20px 24px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}
</style>
