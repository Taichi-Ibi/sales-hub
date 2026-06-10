import { useState } from 'react';
import type { Action, MaskType } from '../types';
import { Button } from './Button';

interface Props {
  action: Action;
  onClose: () => void;
  onMask: (text: string, type: MaskType) => void;
  onIgnore: (text: string) => void;
}

/**
 * S3. マスキング＆ID辞書。S2 上に右からスライドインするオーバーレイパネル（§7 S3 / §10）。
 * 種別は 人物 / NDA の2つのみ。金額は対象外。
 */
export function MaskingPanel({ action, onClose, onMask, onIgnore }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<MaskType>('人物');

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" role="dialog" aria-modal="true" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        style={{ animation: 'panel-in 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">マスキング＆ID辞書</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid size-8 place-items-center rounded-md text-ink-sub hover:bg-surface"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 当該案件の伏せ字一覧 */}
          <section>
            <h3 className="mb-2 text-sm font-medium text-ink">この案件の伏せ字</h3>
            {action.maskedEntities.length === 0 ? (
              <p className="text-sm text-ink-sub">伏せ字はまだありません。</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[22rem] text-sm">
                  <thead className="bg-surface text-left text-xs text-ink-sub">
                    <tr>
                      <th className="px-3 py-2 font-medium">トークン</th>
                      <th className="px-3 py-2 font-medium">種別</th>
                      <th className="px-3 py-2 font-medium">復号値</th>
                      <th className="px-3 py-2 font-medium">出現</th>
                    </tr>
                  </thead>
                  <tbody>
                    {action.maskedEntities.map((e) => (
                      <tr key={e.token} className="border-t border-line">
                        <td className="px-3 py-2 font-medium text-ink">{e.token}</td>
                        <td className="px-3 py-2 text-ink-sub">{e.type}</td>
                        <td className="px-3 py-2 text-ink">{e.decryptedValue}</td>
                        <td className="px-3 py-2 tabular-nums text-ink-sub">{e.occurrences}回</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 未マスクの疑い */}
          {action.suspectedUnmasked.length > 0 && (
            <section className="mt-6 rounded-lg border border-warn/30 bg-warn/5 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-warn">
                <span aria-hidden>⚠</span>未マスクの疑い
              </h3>
              <ul className="flex flex-col gap-2">
                {action.suspectedUnmasked.map((s) => (
                  <li key={s} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-ink">「{s}」</span>
                    <div className="ml-auto flex gap-1.5">
                      <Button variant="secondary" onClick={() => onMask(s, '人物')}>
                        人物としてマスク
                      </Button>
                      <Button variant="link" onClick={() => onIgnore(s)}>
                        無視
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 新規追加フォーム */}
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-ink">＋ 新しい伏せ字を追加</h3>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-ink-sub">
                対象テキスト
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="下書き内の文字列"
                  className="w-full min-w-40 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent sm:w-48"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-sub">
                種別
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MaskType)}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="人物">人物</option>
                  <option value="NDA">NDA</option>
                </select>
              </label>
              <Button
                variant="primary"
                disabled={!text.trim()}
                onClick={() => {
                  onMask(text.trim(), type);
                  setText('');
                }}
              >
                追加
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-sub">
              「マスクする」を押すと下書き内の該当文字列がチップに置き換わります。金額は対象外です。
            </p>
          </section>
        </div>

        <style>{`@keyframes panel-in { from { transform: translateX(100%); } to { transform: none; } }`}</style>
      </aside>
    </div>
  );
}
