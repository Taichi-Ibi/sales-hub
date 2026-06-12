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
      <h1 className="wiki-h1">営業Wiki — メインページ</h1>
      <p className="text-[13px] text-ink-sub">
        営業Wikiは、日々の痕跡（メール・Slack・議事録）からAIが維持する商談の百科事典です。
        現在 <b>{DEAL_ENTRIES.length}</b> 本の記事があります。記事は毎朝6:00の日次スナップショットとして
        保存され、誰も直接編集しません（すべての記述に出典がつきます）。
      </p>

      <h2 className="wiki-h2">商談記事の一覧</h2>
      <table className="wikitable">
        <thead>
          <tr>
            <th>記事</th>
            <th>フェーズ</th>
            <th className="whitespace-nowrap">確度</th>
            <th className="whitespace-nowrap">金額</th>
            <th className="whitespace-nowrap">クローズ予定</th>
            <th className="whitespace-nowrap">最終更新</th>
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
                <td className="whitespace-nowrap tabular-nums">{today.meta.updated_at.slice(5).replace('-', '/')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-ink-sub">
        記事の更新は <a onClick={() => navigate('/inbox')}>特別:受信箱</a> での目視確認（巡回）を経て行われ、
        変化からの提案は <a onClick={() => navigate('/advice')}>特別:助言</a> に載ります。
      </p>
    </div>
  );
}
