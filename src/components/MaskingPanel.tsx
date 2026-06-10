import { useState } from 'react';
import type { Action, MaskType } from '../types';
import { MASK_TYPES, MASK_TYPE_MAP } from '../lib/maskTypes';
import { Button } from './Button';

interface Props {
  action: Action;
  onClose: () => void;
  onMask: (text: string, type: MaskType) => void;
  onUnmask: (token: string) => void;
  onIgnore: (text: string) => void;
}

/** 種別チップ（アイコン＋トークン）。下書き内のチップと配色を揃える。 */
function TypeChip({ type, token }: { type: MaskType; token: string }) {
  const meta = MASK_TYPE_MAP[type];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
    >
      <span aria-hidden>{meta.icon}</span>
      {token}
    </span>
  );
}

/** 種別ピッカー。選択肢をカードで提示し、人が直感的に選べるようにする。 */
function TypePicker({ value, onChange }: { value: MaskType; onChange: (t: MaskType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MASK_TYPES.map((m) => {
        const active = m.type === value;
        return (
          <button
            key={m.type}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.type)}
            className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
              active ? `${m.ringClass} bg-surface ring-2` : 'border-line hover:bg-surface'
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {m.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{m.label}</span>
              <span className="block truncate text-xs text-ink-sub">例) {m.example}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 「未マスクの疑い」の1行。種別を選んでワンクリックで隠せる。 */
function SuspectRow({
  text,
  onMask,
  onIgnore,
}: {
  text: string;
  onMask: (text: string, type: MaskType) => void;
  onIgnore: (text: string) => void;
}) {
  const [type, setType] = useState<MaskType>('氏名');
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-sm">
      <span className="font-medium text-ink">「{text}」</span>
      <div className="ml-auto flex items-center gap-1.5">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MaskType)}
          aria-label="種別"
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
        >
          {MASK_TYPES.map((m) => (
            <option key={m.type} value={m.type}>
              {m.icon} {m.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => onMask(text, type)}>
          隠す
        </Button>
        <Button variant="link" onClick={() => onIgnore(text)}>
          無視
        </Button>
      </div>
    </li>
  );
}

/**
 * S3. マスキング＆復元パネル。S2 上に右からスライドインする（§7 S3 / §10）。
 * 種別は 氏名 / 会社 / 連絡先 / 契約番号 の4つ。金額は対象外。
 * トークンは種別名入り（〔氏名①〕等）で、伏せても役割が AI/人間に伝わる。
 */
export function MaskingPanel({ action, onClose, onMask, onUnmask, onIgnore }: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<MaskType>('氏名');

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ink/20"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        style={{ animation: 'panel-in 180ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">マスキング ＆ 復元</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="grid size-8 place-items-center rounded-md text-ink-sub hover:bg-surface"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-ink-sub">
            名前・会社・連絡先などをチップに置き換えて伏せます。チップは種別名入り（例
            <span className="mx-0.5 font-medium text-ink">〔氏名①〕</span>
            ）なので、伏せても役割が相手や AI に伝わります。金額は伏せません。
          </p>

          {/* 当該案件の伏せ字一覧 + 復元 */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
              この案件の伏せ字
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-sub">
                {action.maskedEntities.length}
              </span>
            </h3>
            {action.maskedEntities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-ink-sub">
                伏せ字はまだありません。下で追加できます。
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {action.maskedEntities.map((e) => (
                  <div
                    key={e.token}
                    className="flex items-center gap-3 rounded-lg border border-line p-2.5"
                  >
                    <TypeChip type={e.type} token={e.token} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{e.decryptedValue}</p>
                      <p className="text-xs text-ink-sub">
                        {MASK_TYPE_MAP[e.type].label}・出現{e.occurrences}回
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => onUnmask(e.token)}>
                      ↩ 復元
                    </Button>
                  </div>
                ))}
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
                  <SuspectRow key={s} text={s} onMask={onMask} onIgnore={onIgnore} />
                ))}
              </ul>
            </section>
          )}

          {/* 新規追加フォーム */}
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-ink">＋ 新しく隠す</h3>
            <label className="flex flex-col gap-1 text-xs text-ink-sub">
              隠す文字（下書き内の文字列）
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="例) 田中 一郎 / ○○商事 / a@example.com"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
            </label>

            <p className="mb-1.5 mt-3 text-xs text-ink-sub">種別を選ぶ</p>
            <TypePicker value={type} onChange={setType} />

            <Button
              variant="primary"
              className="mt-3 w-full"
              disabled={!text.trim()}
              onClick={() => {
                onMask(text.trim(), type);
                setText('');
              }}
            >
              この文字を{MASK_TYPE_MAP[type].label}として隠す
            </Button>
            <p className="mt-2 text-xs text-ink-sub">
              下書き内の一致する文字列がチップに置き換わります。間違えても辞書の「復元」で元に戻せます。
            </p>
          </section>
        </div>

        <style>{`@keyframes panel-in { from { transform: translateX(100%); } to { transform: none; } }`}</style>
      </aside>
    </div>
  );
}
