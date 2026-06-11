import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEALS } from '../data/deals';

const SETTINGS_ITEMS = [
  {
    to: '/settings/deals',
    label: 'プロジェクト',
    description: '受信箱・タスクで使う取引先・プロジェクトの名称を管理します。',
    count: DEALS.length,
  },
  {
    to: '/settings/domains',
    label: 'メールドメインとプロジェクトの紐付け',
    description: '送信元ドメインから自動的にプロジェクトを判定します。',
    count: null,
  },
  {
    to: '/settings/masking',
    label: 'マスキング語句',
    description: '受信した原文を自動でマスキングする語句を登録します。',
    count: null,
  },
] as const;

export function Settings() {
  const [openInfo, setOpenInfo] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">設定</h1>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        {SETTINGS_ITEMS.map((item, i) => (
          <div
            key={item.to}
            className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link to={item.to} className="text-sm font-medium text-ink">
                  {item.label}
                </Link>
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => { e.preventDefault(); setOpenInfo(openInfo === i ? null : i); }}
                    className="grid size-5 place-items-center rounded-full border border-line text-xs font-medium text-ink-sub transition-colors hover:border-accent/60 hover:text-accent"
                    aria-label={`${item.label}の説明を表示`}
                    aria-expanded={openInfo === i}
                  >
                    i
                  </button>
                  {openInfo === i && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenInfo(null)}
                        aria-hidden
                      />
                      <div className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-line bg-white p-3 shadow-md">
                        <p className="text-sm text-ink-sub">{item.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {item.count !== null && (
              <Link to={item.to} className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {item.count}
              </Link>
            )}
            <Link to={item.to} className="shrink-0 text-ink-sub" aria-hidden>❯</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
