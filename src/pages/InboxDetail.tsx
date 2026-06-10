import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InboxItem, MaskType } from '../types';
import { useStore } from '../store/StoreContext';
import { SOURCE_META } from '../data/inbox';
import { elapsedSince } from '../lib/time';
import { isMaskable } from '../lib/tokenize';
import { MASK_TYPES, MASK_TYPE_MAP } from '../lib/maskTypes';
import { Button } from '../components/Button';

/** 処理の現在地（分かち書き → マスキング → AIタスク化）。 */
function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['分かち書き', 'マスキング', 'AIタスク化'];
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const state = n < current ? 'done' : n === current ? 'now' : 'todo';
        return (
          <li key={s} className="flex items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="text-ink-sub/60">
                →
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                state === 'now'
                  ? 'bg-accent/10 text-accent'
                  : state === 'done'
                    ? 'bg-good/10 text-good'
                    : 'bg-surface text-ink-sub'
              }`}
            >
              {state === 'done' ? '✔' : `${n}.`} {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * 分かち書き済みの原文。トークンをタップして伏せる／チップを再タップして復元する。
 * 同一文字列の出現はすべて同じトークンに置き換わる。
 */
function TokenizedBody({
  item,
  interactive,
  selected,
  onSelect,
  onUnmask,
}: {
  item: InboxItem;
  interactive: boolean;
  selected: string | null;
  onSelect: (text: string | null) => void;
  onUnmask: (token: string) => void;
}) {
  const maskByText = new Map(item.masks.map((m) => [m.text, m] as const));
  return (
    <div className="whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-sm leading-loose text-ink">
      {item.tokens!.map((t, i) => {
        const mask = maskByText.get(t);
        if (mask) {
          const meta = MASK_TYPE_MAP[mask.type];
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onUnmask(mask.token)}
              title={interactive ? 'タップで復元' : undefined}
              className={`mx-0.5 rounded px-1 py-0.5 text-xs font-medium ${meta.chipClass} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span aria-hidden>{meta.icon}</span> {mask.token}
            </button>
          );
        }
        if (!interactive || !isMaskable(t)) return <span key={i}>{t}</span>;
        const isSelected = selected === t;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(isSelected ? null : t)}
            className={`rounded px-0.5 transition-colors ${
              isSelected ? 'bg-accent text-white' : 'hover:bg-accent/10'
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/** タップした語の種別を選ぶバー。選択中だけ出る。 */
function MaskTypeBar({
  text,
  onPick,
  onCancel,
}: {
  text: string;
  onPick: (type: MaskType) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
      <span className="text-sm text-ink">
        「<span className="font-bold">{text}</span>」を伏せる:
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {MASK_TYPES.map((m) => (
          <button
            key={m.type}
            onClick={() => onPick(m.type)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${m.chipClass} hover:opacity-80`}
          >
            <span aria-hidden>{m.icon}</span>
            {m.label}
          </button>
        ))}
        <button onClick={onCancel} className="px-1.5 text-xs text-ink-sub hover:text-ink">
          キャンセル
        </button>
      </div>
    </div>
  );
}

export function InboxDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const item = store.getInboxItem(id);

  const [selected, setSelected] = useState<string | null>(null);
  // AIタスク化の進行表示（シミュレート）。0=待機 1=経緯読み取り 2=抽出
  const [aiStep, setAiStep] = useState<0 | 1 | 2>(0);

  // 未処理の原文を開いたら分かち書きを実行（CPU実行のシミュレート。約1秒）。
  const needsTokenize = !!item && !item.tokens;
  useEffect(() => {
    if (!needsTokenize) return;
    const t = window.setTimeout(() => store.finishTokenize(id), 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, needsTokenize]);

  // AIタスク化（シミュレート）。2段階の進行表示のあと台帳へ追加する。
  useEffect(() => {
    if (aiStep === 0) return;
    const t = window.setTimeout(() => {
      if (aiStep === 1) setAiStep(2);
      else {
        store.distillInboxItem(id);
        setAiStep(0);
      }
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiStep, id]);

  if (!item) {
    return (
      <div className="py-20 text-center text-ink-sub">
        アイテムが見つかりません。
        <div className="mt-2">
          <Button variant="link" onClick={() => navigate('/inbox')}>
            Inboxへ戻る
          </Button>
        </div>
      </div>
    );
  }

  const meta = SOURCE_META[item.source];
  const { label: elapsed } = elapsedSince(item.receivedAt);
  const done = item.status === 'タスク化済み';
  const masking = item.status === 'マスキング中' && aiStep === 0;
  const step: 1 | 2 | 3 = !item.tokens ? 1 : done || aiStep > 0 ? 3 : 2;

  return (
    <div>
      <button
        onClick={() => navigate('/inbox')}
        className="mb-4 inline-flex items-center text-sm font-medium text-accent hover:underline"
      >
        ❮ Inboxへ戻る
      </button>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {/* ヘッダー */}
        <div className="border-b border-line p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-sub">
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 font-medium text-ink">
              <span aria-hidden>{meta.icon}</span>
              {meta.label}
            </span>
            <span>{item.sender}</span>
            <span aria-hidden>・</span>
            <span className="tabular-nums">{elapsed}前</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">{item.title}</h1>
          <div className="mt-3">
            <Steps current={step} />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          {/* 原文 */}
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">◆ 原文</h2>
              {masking && (
                <p className="text-xs text-ink-sub">
                  語をタップして伏せる／チップを再タップで復元
                </p>
              )}
            </div>

            {!item.tokens ? (
              // 分かち書き中（CPU実行のシミュレート）
              <div className="relative">
                <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-sm leading-loose text-ink-sub/60">
                  {item.body}
                </div>
                <div className="absolute inset-0 grid place-items-center rounded-lg bg-white/70">
                  <div className="rounded-lg border border-line bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-sm font-medium text-ink">分かち書きを実行中…</p>
                    <p className="mt-0.5 text-xs text-ink-sub">形態素解析（CPUのみ・GPU不要）</p>
                    <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-line">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <TokenizedBody
                  item={item}
                  interactive={masking}
                  selected={selected}
                  onSelect={setSelected}
                  onUnmask={(token) => store.unmaskInboxToken(item.id, token)}
                />
                {masking && selected && (
                  <MaskTypeBar
                    text={selected}
                    onPick={(type) => {
                      store.maskInboxToken(item.id, selected, type);
                      setSelected(null);
                    }}
                    onCancel={() => setSelected(null)}
                  />
                )}
              </>
            )}
          </section>

          {/* マスキング状況 */}
          {item.tokens && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">◆ マスキング状況</h2>
              {item.masks.length === 0 ? (
                <p className="text-sm text-ink-sub">
                  伏せ字はまだありません。原文の人名・連絡先・契約番号などをタップしてください（金額は伏せません）。
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 text-sm">
                  {item.masks.map((m) => (
                    <span
                      key={m.token}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${MASK_TYPE_MAP[m.type].chipClass}`}
                    >
                      <span aria-hidden>{MASK_TYPE_MAP[m.type].icon}</span>
                      {m.token}
                      <span className="opacity-70">＝ {m.text}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* フッター: 工程に応じた操作 */}
        <div className="border-t border-line bg-surface p-4 sm:p-5">
          {done ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-good">
                ✔ タスク化済み — 台帳に追加されています
              </span>
              {item.resultActionId && (
                <Button
                  variant="primary"
                  className="ml-auto"
                  onClick={() =>
                    navigate(`/action/${item.resultActionId}`, { state: { from: '/inbox' } })
                  }
                >
                  台帳で開く ▶
                </Button>
              )}
            </div>
          ) : aiStep > 0 ? (
            <div className="flex items-center gap-3 text-sm text-ink">
              <span aria-hidden className="animate-pulse">
                🤖
              </span>
              <span className="font-medium">
                {aiStep === 1 ? '経緯を読み取っています…' : 'アクションを抽出しています…'}
              </span>
            </div>
          ) : item.tokens ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-sub">
                マスキングが済んだら、AIが経緯を読み取ってタスク化します。
              </p>
              <Button variant="primary" onClick={() => setAiStep(1)}>
                マスキング完了 — AIにタスク化させる ▶
              </Button>
            </div>
          ) : (
            <p className="text-xs text-ink-sub">分かち書きの完了をお待ちください…</p>
          )}
        </div>
      </div>
    </div>
  );
}
