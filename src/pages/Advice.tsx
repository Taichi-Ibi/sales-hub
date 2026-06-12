import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ADVICE_KIND_META,
  PRIORITY_META,
  WEEKLY_REPORT,
  type AdvicePriority,
  type DealAdvice,
} from '../data/advice';
import { findDealEntry } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { MarkdownView } from '../components/MarkdownView';

const PRIORITY_ORDER: Record<AdvicePriority, number> = { 高: 0, 中: 1, 低: 2 };

function AdviceCard({ advice, unread }: { advice: DealAdvice; unread: boolean }) {
  const navigate = useNavigate();
  const kind = ADVICE_KIND_META[advice.kind];
  const counterparty = findDealEntry(advice.dealId)?.counterparty ?? '';
  return (
    <button
      onClick={() => navigate(`/advice/${advice.id}`)}
      className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all hover:brightness-95 ${
        advice.priority === '高' ? 'border-gold/70 bg-gold/10' : 'border-line bg-white'
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-lg" aria-hidden>
        💡
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${PRIORITY_META[advice.priority].cls}`}>
            優先度 {advice.priority}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${kind.cls}`}>
            <span aria-hidden>{kind.icon}</span> {advice.kind}
          </span>
          {unread && (
            <span className="rounded-full bg-nav-badge px-1.5 py-0.5 text-[10px] font-semibold text-white">未読</span>
          )}
        </div>
        <p className="mt-1 text-[15px] font-bold text-ink">{advice.title}</p>
        <p className="mt-0.5 text-xs text-ink-sub">
          {counterparty}　·　生成 {advice.generatedAt}　·　伝達ドラフト {advice.relayDrafts.length}件
        </p>
      </div>
      <span className="shrink-0 self-center text-ink-sub" aria-hidden>❯</span>
    </button>
  );
}

/** 週次パイプライン健全性レポート。frontmatter＋Markdownのレンダリングのみ。
    構造指標のみで、個人を主語にした帰責表現は含めない。 */
function WeeklySection() {
  return (
    <div className="bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold text-ink">{WEEKLY_REPORT.weekOf}</h2>
      <p className="mb-4 mt-0.5 text-xs text-ink-sub/70">
        生成 {WEEKLY_REPORT.generatedAt}　·　reports/weekly/2026-W24.md　·　個人名ベースの帰責なし
      </p>
      <MarkdownView markdown={WEEKLY_REPORT.markdown} />
    </div>
  );
}

/**
 * ③助言（/advice）。スナップショット差分から毎朝6:00に生成される「降り」の起点。
 * daily: 当日の案件別助言（優先度順）／ weekly: パイプライン健全性レポート。
 */
export function Advice() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'weekly' ? 'weekly' : 'daily';
  const { allAdvice, adviceReadIds } = useStore();

  const sorted = [...allAdvice].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">助言</h1>
      <p className="mb-4 text-sm text-ink-sub">
        商談Wikiの直近2スナップショットの差分から生成。すべての指摘に痕跡への根拠リンクがつきます。
      </p>

      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1 text-sm">
        {([
          { key: 'daily', label: '今日の助言' },
          { key: 'weekly', label: '週次レポート' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setParams(t.key === 'daily' ? {} : { tab: t.key }, { replace: true })}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
              tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink-sub hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' ? (
        <div className="flex flex-col gap-2">
          {sorted.map((a) => (
            <AdviceCard key={a.id} advice={a} unread={!adviceReadIds.has(a.id)} />
          ))}
        </div>
      ) : (
        <WeeklySection />
      )}
    </div>
  );
}
