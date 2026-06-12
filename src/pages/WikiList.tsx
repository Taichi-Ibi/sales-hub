import { useNavigate } from 'react-router-dom';
import { DEAL_ENTRIES } from '../data/snapshots';
import { useStore } from '../store/StoreContext';
import { dealSnapshots } from '../lib/snapshot';
import { shortDate } from '../lib/time';

/**
 * メインページ。営業Wiki（商談記事）の一覧。
 * Wikipedia のメインページの引用: 記事への入口と全体の概況だけを置く。
 */
export function WikiList() {
  const navigate = useNavigate();
  const { snapshotPatches } = useStore();

  return (
    <div>
      <h1 className="wiki-h1">メインページ</h1>

      <h2 className="wiki-h2">商談記事の一覧（{DEAL_ENTRIES.length}）</h2>
      <div className="overflow-x-auto">
      <table className="wikitable">
        <thead>
          <tr>
            <th>記事</th>
            <th>フェーズ</th>
            <th className="whitespace-nowrap">確度</th>
            <th className="whitespace-nowrap">金額</th>
            <th className="whitespace-nowrap">クローズ予定</th>
          </tr>
        </thead>
        <tbody>
          {DEAL_ENTRIES.map((entry) => {
            const { yesterday, today } = dealSnapshots(entry.id, snapshotPatches);
            if (!today) return null;
            const confDelta = yesterday ? today.meta.confidence - yesterday.meta.confidence : 0;
            const phaseChanged = yesterday && yesterday.meta.phase !== today.meta.phase;
            return (
              <tr key={entry.id}>
                <td>
                  <a onClick={() => navigate(`/wiki/${entry.id}`)}>
                    {entry.counterparty} {entry.name}
                  </a>
                </td>
                <td className="whitespace-nowrap">
                  {phaseChanged && yesterday ? `${yesterday.meta.phase} → ${today.meta.phase}` : today.meta.phase}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {today.meta.confidence}%
                  {confDelta !== 0 && <span className="text-ink-sub">（{confDelta > 0 ? '+' : ''}{confDelta}）</span>}
                </td>
                <td className="whitespace-nowrap">{today.meta.amount}</td>
                <td className="whitespace-nowrap tabular-nums">{shortDate(today.meta.expected_close)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
