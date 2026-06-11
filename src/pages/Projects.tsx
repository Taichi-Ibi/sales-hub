import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WIKI_PAGES } from '../data/wiki';
import type { SalesPhase, WikiPage } from '../data/wiki';
import { elapsedSince } from '../lib/time';

type ProjectFilter = 'すべて' | SalesPhase;

// フェーズはラベル文字で判別する。色は受注（成功=good）だけ意味を持たせ、
// 他はニュートラルに統一（パイプライン色の虹色化を避ける）。
const PHASE_STYLE: Record<SalesPhase, string> = {
  リード: 'bg-surface text-ink-sub',
  商談: 'bg-surface text-ink-sub',
  提案: 'bg-surface text-ink-sub',
  契約: 'bg-surface text-ink-sub',
  受注: 'bg-good/10 text-good',
};

const FILTERS: { value: ProjectFilter; label: string }[] = [
  { value: 'すべて', label: 'すべて' },
  { value: 'リード', label: 'リード' },
  { value: '商談', label: '商談' },
  { value: '提案', label: '提案' },
  { value: '契約', label: '契約' },
  { value: '受注', label: '受注' },
];

function ProjectRow({ page }: { page: WikiPage }) {
  const navigate = useNavigate();
  const done = page.status === '完了';
  const alertCount = page.alerts.length;

  return (
    <button
      onClick={() => navigate(`/projects/${page.id}`)}
      className={`flex w-full items-center gap-3 rounded-lg border border-line px-4 py-3 text-left transition-all hover:bg-surface ${done ? 'bg-white opacity-60' : alertCount > 0 ? 'bg-warn/10' : 'bg-white'}`}
      aria-label={`${page.counterparty} のページを開く`}
    >
      {/* 左: 社名 */}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] text-ink ${done ? 'font-medium' : 'font-semibold'}`}>
          {page.counterparty}
        </p>
        <p className="mt-0.5 text-xs text-ink-sub">{page.salesRep}　·　{page.category}</p>
      </div>
      {/* 中央: アラート + 更新日 */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {alertCount > 0 && (
          <span className="inline-flex items-center rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
            アラート
          </span>
        )}
        <span className="tabular-nums text-[10px] text-ink-sub">
          最終更新日 {elapsedSince(page.updatedAt).label}前
        </span>
      </div>
      {/* 右端: 商談フェーズ */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${PHASE_STYLE[page.salesPhase]}`}>
        {page.salesPhase}
      </span>
    </button>
  );
}

/** 案件一覧（ナレッジハブの「案件」タブ本体）。1案件=1ページの wiki を AI が維持する。 */
export function ProjectListSection() {
  const [filter, setFilter] = useState<ProjectFilter>('すべて');

  const filtered = (filter === 'すべて' ? WIKI_PAGES : WIKI_PAGES.filter((p) => p.salesPhase === filter))
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 overflow-x-auto text-sm">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap transition-colors ${filter === f.value ? 'font-medium text-ink' : 'text-ink-sub hover:text-ink'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-line bg-surface py-20 text-center">
          <p className="text-lg font-semibold text-ink">該当する案件はありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <ProjectRow key={p.id} page={p} />
          ))}
        </div>
      )}
    </div>
  );
}
