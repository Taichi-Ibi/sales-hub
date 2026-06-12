import { Link, NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { Toaster } from './Toaster';

interface NavItem {
  to: string;
  label: string;
  /** 件数（素のテキスト「（3）」で出す）。 */
  count?: number;
}

/**
 * Wikipedia 風の共通シェル。白いヘッダー＋左サイドバー（テキストリンクの列）。
 * 商談Wikiが「記事」、受信箱・助言・設定は「特別ページ」。
 * 装飾（色付きナビ・バッジ・下部タブ）は使わない（DESIGN.md §4 廃止リスト）。
 */
export function Shell() {
  const { inboxItems, allAdvice, adviceReadIds } = useStore();
  const reviewCount = inboxItems.filter((i) => i.status === '要確認').length;
  const adviceCount = allAdvice.filter((a) => !adviceReadIds.has(a.id)).length;

  // 逆V字を一周する並び: メインページ（Wiki・頂点）→ 受信箱（昇り）→ 助言（降り）→ 設定。
  const items: NavItem[] = [
    { to: '/wiki', label: 'メインページ' },
    { to: '/inbox', label: '特別:受信箱', count: reviewCount },
    { to: '/advice', label: '特別:助言', count: adviceCount },
    { to: '/settings', label: '特別:設定' },
  ];

  const navLink = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'font-bold text-ink no-underline' : '';

  const renderItem = (it: NavItem) => (
    <NavLink key={it.to} to={it.to} className={navLink}>
      {it.label}
      {it.count !== undefined && it.count > 0 && <span className="text-ink"> ({it.count})</span>}
    </NavLink>
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* ヘッダー（白地・下線のみ） */}
      <header className="flex items-baseline gap-4 border-b border-line bg-page px-4 py-2 sm:px-6">
        <Link to="/wiki" className="text-ink no-underline hover:no-underline">
          <span className="font-serif text-xl">Sales Hub</span>
          <span className="ml-2 text-xs text-ink-sub">営業Wiki — 誰も入力しない百科事典</span>
        </Link>
        <div className="ml-auto flex items-baseline gap-4">
          <input
            type="search"
            placeholder="営業Wiki内を検索"
            aria-label="検索"
            className="hidden w-48 border border-line bg-page px-2 py-0.5 text-sm sm:block"
          />
          <span className="text-xs text-ink-sub">利用者:山田 内勤</span>
        </div>
      </header>

      {/* モバイル: サイドバーの代わりの横並びリンク */}
      <nav className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line-light px-4 py-1.5 text-[13px] md:hidden" aria-label="メインナビゲーション">
        {items.map(renderItem)}
      </nav>

      <div className="flex flex-1">
        {/* 左サイドバー（テキストリンクの列） */}
        <nav className="hidden w-44 shrink-0 flex-col gap-1 px-4 py-4 text-[13px] md:flex" aria-label="メインナビゲーション">
          <p className="text-xs text-ink-sub">ナビゲーション</p>
          {items.map(renderItem)}
          <p className="mt-4 text-xs text-ink-sub">ヘルプ</p>
          <span className="text-ink-sub">痕跡は昇り、助言は降りる</span>
        </nav>

        {/* コンテンツ（記事領域。左罫で区切る） */}
        <main className="min-w-0 flex-1 border-line bg-page md:border-l">
          <div className="mx-auto max-w-[960px] px-4 py-4 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
