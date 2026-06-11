import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEALS } from '../data/deals';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function SettingsDeals() {
  const navigate = useNavigate();
  const [dealNames, setDealNames] = useState<string[]>(DEALS.map((d) => d.counterparty));
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function addDeal() {
    const name = newName.trim();
    if (!name || dealNames.includes(name)) return;
    setDealNames((prev) => [...prev, name]);
    setNewName('');
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setDealNames((prev) => prev.filter((n) => n !== pendingDelete));
    setPendingDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1 text-sm text-accent hover:underline"
          aria-label="設定に戻る"
        >
          ← 設定
        </button>
      </div>

      <h1 className="text-xl font-semibold text-ink">プロジェクト</h1>

      <section className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {dealNames.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-sub">プロジェクトがありません</li>
          )}
          {dealNames.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-sm text-ink">{name}</span>
              <Button
                variant="danger"
                className="py-1 text-xs"
                aria-label={`${name} を削除`}
                onClick={() => setPendingDelete(name)}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-5 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDeal()}
              placeholder="例: M製作所"
              aria-label="追加するプロジェクト"
              className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-sub focus:border-accent focus:outline-none"
            />
            <Button variant="primary" onClick={addDeal} disabled={!newName.trim()}>
              追加
            </Button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`「${pendingDelete}」を削除しますか？`}
        confirmLabel="削除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
