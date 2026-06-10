# Sales Hub — CLAUDE.md

## Quick Start

```bash
bun run dev          # http://localhost:5173/intelligence
bun run check        # 型チェック (0 errors が合格基準)
bun run test:prop    # プロパティテスト 73件 (fast-check)
bun run lint         # prettier + eslint (.kiro/ の警告は無視してよい)
bunx prettier --write src/  # .svelte 書き換え後に必ず実行
```

> **dev server はサンドボックス外で起動が必要。**
> `bun run dev` は `dangerouslyDisableSandbox: true` を指定して実行すること。

パッケージマネージャーは **bun** のみ。`npm` / `pnpm` は使わない。

---

## タスク管理

- タスク一覧: `.kiro/specs/ai-sales-brain/tasks.md`
- 進行中 `[-]`、完了 `[x]` でマーク
- 各チェックポイント到達時に `bun run test:prop && bun run check` で確認

---

## アーキテクチャ

### ディレクトリ構成

```
src/
  lib/intelligence/
    types.ts          # ドメイン型定義
    constants.ts      # VALIDATION, STORAGE_KEYS, PHASE_LABELS, DEAL_PHASES
    store-logic.ts    # 純粋関数リデューサー (テスト対象はここ)
    store.svelte.ts   # Svelte 5 runes ストア (薄いラッパー)
    ai-engine.ts      # AI シミュレーション (モック、外部通信なし)
    __tests__/        # fast-check プロパティテスト
  routes/intelligence/
    +layout.svelte    # Navy サイドバー + initializeFromStorage()
    +page.svelte      # ダッシュボード
    inbox/            # インボックス
    tasks/            # タスク管理
    deals/            # 案件管理
    admin/            # 管理者設定 (プレースホルダー)
```

### ストアパターン

純粋関数は `store-logic.ts`、副作用（localStorage保存・スケジュール）は `store.svelte.ts`。

```ts
// store-logic.ts: 純粋リデューサー → テスト可能
applyAddEventLog(state, log) → IntelligenceState

// store.svelte.ts: ストア関数 → リデューサーを呼んで applyState
export function addEventLog(log) { applyState(applyAddEventLog(getState(), log)); }
```

### データ永続化

- localStorage のみ。バックエンドなし。外部 API 呼び出しなし。
- シードデータは初回起動時に自動投入 (`seedIfNeeded` は冪等)。
- 保存は `VALIDATION.SAVE_DEBOUNCE_MS` (3秒) デバウンス。

---

## Svelte 5.55.2 の制約 (ハマりポイント)

### `$state` のエクスポートは再代入不可

```ts
// NG: export した $state に = で再代入
let tasks = $state<Task[]>([]);
export { tasks };
// どこかで tasks = newArray; → runtime error

// OK: in-place mutation
tasks.splice(0, Infinity, ...newArray);
```

### `$derived` はエクスポート不可

```ts
// NG: $derived をそのままエクスポート
const unreadCount = $derived(computeUnreadCount(eventLogs));
export { unreadCount }; // → runtime error

// OK: コンポーネント側でローカルに計算
// store.svelte.ts からは eventLogs ($state) だけエクスポートして…
const unreadCount = $derived(computeUnreadCount(eventLogs)); // component 内で
```

`threadGroups`, `unreadCount`, `pendingTaskCount` はストアから提供せず、
各コンポーネントが `$derived` で計算する。

### SvelteSet / SvelteMap

`new Set()` の代わりに `new SvelteSet()` を使う (`svelte/prefer-svelte-reactivity` ルール)。

---

## ESLint / Prettier のルール

| ルール | 対処 |
|---|---|
| `svelte/no-navigation-without-resolve` | `href={resolve('/path')}` を使う |
| `svelte/require-each-key` | `{#each items as item (item.id)}` |
| `svelte/prefer-svelte-reactivity` | `new SvelteSet()` / `new SvelteMap()` |
| a11y: label without control | ラジオグループの見出しは `<label>` でなく `<span>` |

`.kiro/specs/` の Markdown は prettier 警告が出るが無視してよい (コード品質に無関係)。

---

## テスト

```bash
bun run test:prop   # プロパティテスト (fast-check)
bun run test:unit   # ユニットテスト (未作成なら空振り)
bun run test        # 全テスト
```

- テスト環境は `node` (jsdom ではない)
- 共通 arbitrary は `arbitraries.ts` にまとめてある
- `store-logic.ts` の純粋関数を直接テストする設計

---

## SPA 設定

- `adapter-static` + `fallback: 'index.html'`
- `ssr = false`, `prerender = false` (`+layout.ts`)
- ビルド成果物は `build/` ディレクトリ
