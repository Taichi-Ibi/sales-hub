<script lang="ts" module>
	export type NavItem = {
		href: string;
		label: string;
		icon: string;
		/** Returns true when the given pathname should mark this item active. */
		match: (pathname: string) => boolean;
		/** Optional count badge (rendered only when > 0). */
		badge?: number;
	};
</script>

<script lang="ts">
	import { page } from '$app/stores';

	let {
		items,
		variant
	}: {
		items: NavItem[];
		variant: 'sidebar' | 'tabbar';
	} = $props();
</script>

<!--
	Nav renders pre-resolved hrefs supplied via the `items` prop (resolve() is
	applied once where navItems is built), so re-resolving here would be wrong.
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if variant === 'sidebar'}
	<ul class="py-sm m-0 list-none">
		{#each items as item (item.href)}
			{@const active = item.match($page.url.pathname)}
			<li>
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class="gap-sm px-md py-sm text-md flex items-center border-l-[3px] no-underline transition-colors
						{active
						? 'border-brand bg-white/10 text-white'
						: 'border-transparent text-white/80 hover:bg-white/10 hover:text-white'}"
				>
					<span class="w-5 flex-shrink-0 text-center text-base">{item.icon}</span>
					<span class="flex-1">{item.label}</span>
					{#if item.badge && item.badge > 0}
						<span
							class="bg-accent text-brand-dark flex-shrink-0 rounded-[10px] px-[6px] py-[2px] text-xs font-bold"
						>
							{item.badge}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{:else}
	{#each items as item (item.href)}
		{@const active = item.match($page.url.pathname)}
		<a
			href={item.href}
			aria-current={active ? 'page' : undefined}
			class="py-sm relative flex flex-1 flex-col items-center justify-center gap-[2px] text-xs no-underline transition-colors
				{active ? 'text-white' : 'text-white/70 hover:text-white'}"
		>
			<span class="text-lg leading-none">{item.icon}</span>
			<span class="leading-none">{item.label}</span>
			{#if item.badge && item.badge > 0}
				<span
					class="bg-accent text-brand-dark absolute top-[4px] right-[calc(50%-22px)] min-w-[16px] rounded-full px-[4px] text-center text-[10px] font-bold"
				>
					{item.badge}
				</span>
			{/if}
		</a>
	{/each}
{/if}
