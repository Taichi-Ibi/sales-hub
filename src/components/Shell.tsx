import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LEDGER_STATUSES, useStore } from '../store/StoreContext';
import { PROJECTS } from '../data/projects';
import { Toaster } from './Toaster';

/** ナビ件数バッジ。未読を示す赤バッジ（Slack 風）。選択中は反転。 */
function NavBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
        active ? 'bg-white/25 text-white' : 'bg-nav-badge text-white'
      }`}
    >
      {count}
    </span>
  );
}

const navBase =
  'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors';

interface NavItem {
  to: string;
  end?: boolean;
  icon: string;
  label: string;
  /** バッジに出す件数（任意）。 */
  count?: number;
}

export function Shell() {
  const { actions, inboxItems } = useStore();
  const location = useLocation();
  const inboxCount = inboxItems.filter((i) => !i.aiReady && i.status !== 'タスクあり' && i.status !== 'キャンセル').length;
  const ledgerCount = actions.filter((a) => LEDGER_STATUSES.includes(a.status)).length;
  const projectAlertCount = PROJECTS.reduce((sum, p) => sum + p.alertCount, 0);

  // 2画面構成: Inbox（入口）と台帳（要対応・依頼中・完了をタブで持つ作業場）。
  const items: NavItem[] = [
    { to: '/', end: true, icon: '📬', label: '受信箱', count: inboxCount },
    { to: '/projects', icon: '🗂️', label: 'プロジェクト', count: projectAlertCount > 0 ? projectAlertCount : undefined },
    { to: '/ledger', icon: '📋', label: 'タスク', count: ledgerCount },
    { to: '/settings', icon: '⚙️', label: '設定' },
  ];

  // 上部バーに「今どこにいるか」を出す（詳細画面は台帳の下層として扱う）。
  const currentLabel = location.pathname.startsWith('/action')
    ? '詳細'
    : (items.find((it) => (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)))
        ?.label ?? '受信箱');

  return (
    <div className="flex h-screen flex-col">
      {/* 上部バー（高さ56px）。Brand Blue のクロム（DESIGN.md §4 Navigation）。 */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-nav-bar px-4 text-white sm:gap-4 sm:px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold hover:opacity-80">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="shrink-0">
            <rect width="28" height="28" rx="4" fill="#ffd742"/>
            <path d="M17 5 L8 17 L13 17 L10 23 L20 11 L15 11 Z" fill="#074194"/>
          </svg>
          <span className="hidden sm:inline">Action Hub</span>
        </Link>
        <span className="text-sm font-semibold text-white" aria-current="page">
          {currentLabel}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {/* 検索はスペースの限られるモバイルでは省略 */}
          <label className="hidden items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white/80 focus-within:bg-white/25 sm:flex">
            <span aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="検索"
              aria-label="検索"
              className="w-40 bg-transparent text-white outline-none placeholder:text-white/60"
            />
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span aria-hidden>👤</span>
            <span className="hidden sm:inline">山田 内勤</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左ナビ（幅220px）。モバイルでは下部タブに置き換えるため非表示。 */}
        <nav
          className="hidden shrink-0 flex-col gap-1 overflow-y-auto bg-nav p-3 md:flex"
          style={{ width: 220 }}
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-nav-text/70">
            メニュー
          </p>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `${navBase} ${
                  isActive
                    ? 'bg-nav-active font-semibold text-white shadow-sm'
                    : 'text-nav-text hover:bg-nav-hover hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* 選択中は左端にインジケータ帯で「今ここ」を示す。 */}
                  {isActive && (
                    <span aria-hidden className="absolute inset-y-1 left-0 w-1 rounded-r bg-white" />
                  )}
                  <span aria-hidden>{it.icon}</span>
                  {it.label}
                  {it.count !== undefined && <NavBadge count={it.count} active={isActive} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* コンテンツ。モバイルは下部タブ分の余白を確保。 */}
        <main className="flex-1 overflow-y-auto bg-page">
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
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-ink-sub'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* 選択中は上端にインジケータ帯で「今ここ」を示す。 */}
                {isActive && (
                  <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-accent" />
                )}
                <span className="relative text-lg leading-none" aria-hidden>
                  {it.icon}
                  {it.count !== undefined && it.count > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-nav-badge px-1 text-[10px] font-semibold leading-tight text-white">
                      {it.count}
                    </span>
                  )}
                </span>
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Toaster />
    </div>
  );
}
