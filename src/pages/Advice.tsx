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
import { TraceChip } from '../components/WikiParts';

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

/** 週次パイプライン健全性レポート。構造指標のみで、個人を主語にした帰責表現は含めない。 */
function WeeklySection() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-sub">
        <span aria-hidden>🏗️</span>
        <span className="font-medium text-ink">アラートは個人ではなく構造に宛てる</span>
        <span aria-hidden>·</span>
        <span>流入・滞留の構造指標で構成（個人名ベースの帰責なし）</span>
      </div>

      <section>
        <h2 className="mb-1 text-base font-bold text-ink">{WEEKLY_REPORT.weekOf}</h2>
        <p className="text-xs text-ink-sub">生成 {WEEKLY_REPORT.generatedAt}　·　reports/weekly/2026-W24.md</p>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">◆ 痕跡の流入</h3>
        <div className="grid grid-cols-3 gap-2">
          {WEEKLY_REPORT.inflow.map((row) => (
            <div key={row.source} className="rounded-lg border border-line bg-white px-3 py-2.5">
              <p className="text-xs text-ink-sub">{row.source}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{row.count}<span className="ml-0.5 text-xs font-normal">件</span></p>
              <p className="text-[11px] text-ink-sub">{row.delta}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">◆ フェーズ別の滞留</h3>
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs text-ink-sub">
                <th className="px-3 py-2 font-medium">フェーズ</th>
                <th className="px-3 py-2 font-medium">件数</th>
                <th className="px-3 py-2 font-medium">平均滞留</th>
                <th className="px-3 py-2 font-medium">所見</th>
              </tr>
            </thead>
            <tbody>
              {WEEKLY_REPORT.phaseDwell.map((row) => (
                <tr key={row.phase} className="border-t border-line">
                  <td className="px-3 py-2 text-ink">{row.phase}</td>
                  <td className="px-3 py-2 tabular-nums text-ink">{row.count}件</td>
                  <td className={`px-3 py-2 tabular-nums ${row.avgDays >= 14 ? 'font-semibold text-warn' : 'text-ink'}`}>
                    {row.count > 0 ? `${row.avgDays}日` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-sub">{row.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">◆ 構造への所見（根拠つき）</h3>
        <ul className="space-y-2 rounded-lg border border-line bg-surface px-4 py-3">
          {WEEKLY_REPORT.notes.map((note, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink">
              {note.text}
              <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                {note.evidence.map((id) => (
                  <TraceChip key={id} traceId={id} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
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
