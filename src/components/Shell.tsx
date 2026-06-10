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

export function Shell() {
  const { actions } = useStore();
  const ledgerCount = actions.filter((a) => LEDGER_STATUSES.includes(a.status)).length;
  const approvalCount = actions.filter((a) => APPROVAL_STATUSES.includes(a.status)).length;

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* 上部バー（高さ56px） */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-white px-5">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-white">
            蒸
          </span>
          アクション台帳
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-sub focus-within:border-accent">
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
            山田 内勤
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 左ナビ（幅220px） */}
        <nav className="flex w-55 shrink-0 flex-col gap-1 border-r border-line bg-white p-3" style={{ width: 220 }}>
          <NavLink to="/" end className={navClass}>
            <span aria-hidden>📥</span>台帳
            <NavBadge count={ledgerCount} />
          </NavLink>
          <NavLink to="/approvals" className={navClass}>
            <span aria-hidden>✋</span>FS承認
            <NavBadge count={approvalCount} />
          </NavLink>
          <NavLink to="/archive" className={navClass}>
            <span aria-hidden>✔</span>完了済み
          </NavLink>
          <div className="my-2 border-t border-line" />
          <NavLink to="/settings" className={navClass}>
            <span aria-hidden>⚙</span>設定
          </NavLink>
        </nav>

        {/* コンテンツ */}
        <main className="flex-1 bg-page">
          <div className="mx-auto max-w-4xl p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
