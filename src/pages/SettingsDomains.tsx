import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEALS } from '../data/deals';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface DomainMapping {
  domain: string;
  dealName: string;
}

const INITIAL_MAPPINGS: DomainMapping[] = [
  { domain: 'b-shoji.co.jp', dealName: 'B商事' },
  { domain: 'd-kogyo.jp', dealName: 'D工業' },
];

export function SettingsDomains() {
  const navigate = useNavigate();
  const dealNames = DEALS.map((d) => d.counterparty);
  const [mappings, setMappings] = useState<DomainMapping[]>(INITIAL_MAPPINGS);
  const [newDomain, setNewDomain] = useState('');
  const [newMappingDeal, setNewMappingDeal] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function addMapping() {
    const domain = newDomain.trim().replace(/^@/, '').toLowerCase();
    if (!domain || !newMappingDeal) return;
    if (mappings.some((m) => m.domain === domain)) return;
    setMappings((prev) => [...prev, { domain, dealName: newMappingDeal }]);
    setNewDomain('');
    setNewMappingDeal('');
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setMappings((prev) => prev.filter((m) => m.domain !== pendingDelete));
    setPendingDelete(null);
  }

  const normalizedDomain = newDomain.trim().replace(/^@/, '').toLowerCase();
  const domainAlreadyExists = normalizedDomain.length > 0 && mappings.some((m) => m.domain === normalizedDomain);
  const canAdd = normalizedDomain.length > 0 && newMappingDeal.length > 0 && !domainAlreadyExists;

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

      <h1 className="text-xl font-semibold text-ink">メールドメインとプロジェクトの紐付け</h1>
      <p className="text-sm text-ink-sub">送信元ドメインから自動的にプロジェクトを判定します。</p>

      <section className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {mappings.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-sub">紐付けがありません</li>
          )}
          {mappings.map((m) => (
            <li key={m.domain} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-ink-sub">
                  @{m.domain}
                </span>
                <span aria-hidden className="text-ink-sub">→</span>
                <span className="text-sm text-ink">{m.dealName}</span>
              </div>
              <Button
                variant="danger"
                className="shrink-0 py-1 text-xs"
                aria-label={`@${m.domain} の紐付けを削除`}
                onClick={() => setPendingDelete(m.domain)}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>

        <div className="border-t border-line px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-1 rounded border border-line bg-white px-3 py-2 focus-within:border-accent">
              <span className="text-sm text-ink-sub">@</span>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMapping()}
                placeholder="example.co.jp"
                aria-label="ドメイン"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-sub"
              />
            </div>
            <select
              value={newMappingDeal}
              onChange={(e) => setNewMappingDeal(e.target.value)}
              aria-label="プロジェクト"
              className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">プロジェクトを選択</option>
              {dealNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <Button variant="primary" onClick={addMapping} disabled={!canAdd}>
              追加
            </Button>
          </div>
          {domainAlreadyExists && (
            <p className="mt-2 text-xs text-danger">このドメインはすでに登録されています。</p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`@${pendingDelete} の紐付けを削除しますか？`}
        confirmLabel="削除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
