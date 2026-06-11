import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MaskType } from '../types';
import { DEALS } from '../data/deals';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

const MASK_TYPES: MaskType[] = ['氏名', '会社', '連絡先'];

// 伏せ字は単一の意味（機密）なので配色も統一する（種別はラベルで判別）。
const MASK_TYPE_STYLE: Record<MaskType, string> = {
  氏名: 'bg-accent-soft text-accent',
  会社: 'bg-accent-soft text-accent',
  連絡先: 'bg-accent-soft text-accent',
  契約番号: 'bg-accent-soft text-accent',
};

interface SensitiveWord {
  text: string;
  maskType: MaskType;
  dealName: string;
}

const ALL_DEALS = 'すべての案件';

const INITIAL_SENSITIVE: SensitiveWord[] = [
  { text: '三浦', maskType: '氏名', dealName: '湊精機' },
  { text: '川島', maskType: '氏名', dealName: '北斗電装' },
];

export function SettingsMasking() {
  const navigate = useNavigate();
  const dealNames = [ALL_DEALS, ...DEALS.map((d) => d.counterparty)];
  const [words, setWords] = useState<SensitiveWord[]>(INITIAL_SENSITIVE);
  const [newWord, setNewWord] = useState('');
  const [newWordType, setNewWordType] = useState<MaskType>('氏名');
  const [newDealName, setNewDealName] = useState(ALL_DEALS);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [filterDeal, setFilterDeal] = useState(ALL_DEALS);
  const [filterType, setFilterType] = useState<MaskType | 'すべて'>('すべて');
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  function addWord() {
    const text = newWord.trim();
    if (!text || words.some((w) => w.text === text && w.dealName === newDealName)) return;
    setWords((prev) => [...prev, { text, maskType: newWordType, dealName: newDealName }]);
    setNewWord('');
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    setWords((prev) => prev.filter((w) => `${w.dealName}::${w.text}` !== pendingDelete));
    setPendingDelete(null);
  }

  const filtered = words
    .filter((w) => filterDeal === ALL_DEALS || w.dealName === filterDeal)
    .filter((w) => filterType === 'すべて' || w.maskType === filterType);

  const newWordKey = `${newDealName}::${newWord.trim()}`;
  const duplicate = newWord.trim() && words.some((w) => `${w.dealName}::${w.text}` === newWordKey);

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

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-ink">マスキング語句</h1>
        <div className="relative" ref={infoRef}>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="grid size-5 place-items-center rounded-full border border-line text-xs font-medium text-ink-sub transition-colors hover:border-accent/60 hover:text-accent"
            aria-label="マスキング語句の説明を表示"
            aria-expanded={showInfo}
          >
            i
          </button>
          {showInfo && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowInfo(false)} aria-hidden />
              <div className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-line bg-white p-3 shadow-md">
                <p className="text-sm text-ink-sub">
                  ここに登録した語句は、受信箱に届いた原文を自動でマスキングします。プロジェクトごとに設定できます。
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 種別フィルタ（タブ） + 社名フィルタ（ドロップダウン） */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 overflow-x-auto text-sm">
          {(['すべて', ...MASK_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`whitespace-nowrap transition-colors ${filterType === t ? 'font-medium text-ink' : 'text-ink-sub hover:text-ink'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={filterDeal}
          onChange={(e) => setFilterDeal(e.target.value)}
          aria-label="社名でフィルタ"
          className="ml-auto rounded border border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          {[ALL_DEALS, ...DEALS.map((d) => d.counterparty)].map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      <section className="rounded-lg border border-line bg-white">
        <ul className="divide-y divide-line">
          {filtered.length === 0 && (
            <li className="px-5 py-4 text-sm text-ink-sub">登録済みの語句がありません</li>
          )}
          {filtered.map((w) => {
            const key = `${w.dealName}::${w.text}`;
            return (
              <li key={key} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="text-sm text-ink">{w.text}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${MASK_TYPE_STYLE[w.maskType]}`}>
                    {w.maskType}
                  </span>
                  {w.dealName !== ALL_DEALS && (
                    <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-ink-sub">
                      🏢 {w.dealName}
                    </span>
                  )}
                </div>
                <Button
                  variant="danger"
                  className="shrink-0 py-1 text-xs"
                  aria-label={`"${w.text}" (${w.dealName}) を削除`}
                  onClick={() => setPendingDelete(key)}
                >
                  削除
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line px-5 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWord()}
                placeholder="例: 山田 太郎"
                aria-label="語句"
                className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-sub focus:border-accent focus:outline-none"
              />
              <select
                value={newWordType}
                onChange={(e) => setNewWordType(e.target.value as MaskType)}
                aria-label="マスク種別"
                className="rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {MASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={newDealName}
                onChange={(e) => setNewDealName(e.target.value)}
                aria-label="プロジェクト"
                className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {dealNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <Button variant="primary" onClick={addWord} disabled={!newWord.trim() || !!duplicate}>
                追加
              </Button>
            </div>
          </div>
          {duplicate && (
            <p className="mt-2 text-xs text-danger">この語句はすでに同じ案件に登録されています。</p>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`「${pendingDelete?.split('::')[1]}」を削除しますか？`}
        confirmLabel="削除"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
