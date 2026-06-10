import { NavLink, Outlet } from 'react-router-dom';
import { APPROVAL_STATUSES, LEDGER_STATUSES, useStore } from '../store/StoreContext';
import { Toaster } from './Toaster';

function NavBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-line px-1.5 text-xs font-semibold text-ink-sub">
      {count}
    </span>
  );
}

const navBase =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

function navClass({ isActive }: { isActive: boolean }) {
  return `${navBase} ${
    isActive ? 'bg-accent/10 text-accent' : 'text-ink-sub hover:bg-surface hover:text-ink'
  }`;
}

interface NavItem {
  to: string;
  end?: boolean;
  icon: string;
  label: string;
  /** バッジに出す件数（任意）。 */
  count?: number;
}

/** モバイル下部タブの各項目。アクティブ時はアクセント色。 */
function tabClass({ isActive }: { isActive: boolean }) {
  return `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-accent' : 'text-ink-sub'
  }`;
}

export function Shell() {
  const { actions } = useStore();
  const ledgerCount = actions.filter((a) => LEDGER_STATUSES.includes(a.status)).length;
  const approvalCount = actions.filter((a) => APPROVAL_STATUSES.includes(a.status)).length;

  const items: NavItem[] = [
    { to: '/', end: true, icon: '📥', label: '台帳', count: ledgerCount },
    { to: '/approvals', icon: '✋', label: 'FS承認', count: approvalCount },
    { to: '/archive', icon: '✔', label: '完了済み' },
    { to: '/settings', icon: '⚙', label: '設定' },
  ];

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* 上部バー（高さ56px） */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-white px-4 sm:px-5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-white">
            蒸
          </span>
          アクション台帳
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* 検索はスペースの限られるモバイルでは省略 */}
          <label className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-sub focus-within:border-accent sm:flex">
            <span aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="検索"
              aria-label="検索"
              className="w-40 bg-transparent outline-none placeholder:text-ink-sub"
            />
          </label>
          <div className="flex items-center gap-2 text-sm text-ink">
            <span aria-hidden>👤</span>
            <span className="hidden sm:inline">山田 内勤</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 左ナビ（幅220px）。モバイルでは下部タブに置き換えるため非表示。 */}
        <nav
          className="hidden shrink-0 flex-col gap-1 border-r border-line bg-white p-3 md:flex"
          style={{ width: 220 }}
        >
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={navClass}>
              <span aria-hidden>{it.icon}</span>
              {it.label}
              {it.count !== undefined && <NavBadge count={it.count} />}
            </NavLink>
          ))}
        </nav>

        {/* コンテンツ。モバイルは下部タブ分の余白を確保。 */}
        <main className="flex-1 bg-page">
          <div className="mx-auto max-w-4xl p-4 pb-24 sm:px-6 sm:pt-6 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 下部タブ（モバイル専用）。セーフエリアを考慮。 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="メインナビゲーション"
      >
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={tabClass}>
            <span className="relative text-lg leading-none" aria-hidden>
              {it.icon}
              {it.count !== undefined && it.count > 0 && (
                <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-tight text-white">
                  {it.count}
                </span>
              )}
            </span>
            {it.label}
          </NavLink>
        ))}
      </nav>

      <Toaster />
    </div>
  );
}
