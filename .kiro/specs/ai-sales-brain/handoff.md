# AI Sales Brain — セッション引き継ぎ (2026-06-10)

## 現在地

**ブランチ**: `feature/new-feature`
**達成済みチェックポイント**: タスク13「ダッシュボード・インボックスの確認」完了
**次のチェックポイント**: タスク17「主要画面の確認」

### 最終検証済みコマンド結果

```
bun run test:prop  → 73テスト / 7ファイル 全pass (Property 1-16, 18)
bun run check      → 0 errors
bun run lint       → 0 errors
```

---

## 完了した作業 (Wave 0〜7)

### 削除済み

旧 Sales Hub 実装 (`src/` 全体) をコミット `a287fe7` で削除済み。

### 新規作成済みファイル

#### SvelteKit 基盤

| ファイル                    | 備考                                                 |
| --------------------------- | ---------------------------------------------------- |
| `svelte.config.js`          | adapter-static + `fallback: 'index.html'` (SPA mode) |
| `src/app.html`              | `lang="ja"`                                          |
| `src/app.css`               | design.md の全 CSS 変数 + 最小リセット               |
| `src/app.d.ts`              | App namespace 空宣言                                 |
| `src/routes/+layout.svelte` | `import '../app.css'`                                |
| `src/routes/+layout.ts`     | `ssr = false; prerender = false;`                    |
| `src/routes/+page.svelte`   | `/intelligence` への案内リンク (`resolve()` 使用)    |

#### 実装済みルート

| ファイル                                      | 状態     | 内容                                                         |
| --------------------------------------------- | -------- | ------------------------------------------------------------ |
| `src/routes/intelligence/+layout.svelte`      | **実装済** | Navy サイドバーナビ・Badge・`initializeFromStorage()`        |
| `src/routes/intelligence/+page.svelte`        | **実装済** | ダッシュボード（フェーズ別件数・直近予定・期限タスク）       |
| `src/routes/intelligence/inbox/+page.svelte`  | **実装済** | インボックス（スレッド/フラット切替・フィルター・詳細パネル）|
| `src/routes/intelligence/tasks/+page.svelte`  | プレースホルダー | `<h1>Tasks</h1>`                                    |
| `src/routes/intelligence/deals/+page.svelte`  | プレースホルダー | `<h1>Deals</h1>`                                    |
| `src/routes/intelligence/admin/+page.svelte`  | プレースホルダー | `<h1>Admin</h1>`                                    |

#### ドメインモジュール (`src/lib/intelligence/`)

| ファイル            | 主なエクスポート                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`          | EventLog, Deal, Task, ThreadGroup, MaskingRule/Result, AppSettings, OperationLog, SearchResult, PhaseChangeProposal, DataUpdateProposal, RetrospectiveResult, Reminder    |
| `constants.ts`      | VALIDATION (全制約値), STORAGE_KEYS, PHASE_LABELS, DEAL_PHASES[]                                                                                                          |
| `serializer.ts`     | serializeEventLogs/Deals/Tasks/OperationLogs, deserialize\*, safeSave, safeLoad                                                                                           |
| `thread-grouper.ts` | groupByThread, getThreadMessages                                                                                                                                          |
| `masking-engine.ts` | autoMask, manualMask, restore, applyMaskMethod, applyMaskingAndApprove                                                                                                    |
| `ai-engine.ts`      | generateTasks, generateSummary, search, detectPhaseChange, detectDataUpdate, generateRetrospective                                                                        |
| `seed-data.ts`      | getInitialSettings, generateSeedData, isSeeded, markSeeded, seedIfNeeded (SeedDeps, SeedState)                                                                            |
| `validation.ts`     | isBlank, canTransitionTaskStatus, isAllowedEmailDomain, canRejectEventLog, validateRejectionReason                                                                        |
| `store-logic.ts`    | IntelligenceState, applyAdd/Update/Delete 各種リデューサ, computeUnreadCount, selectVisibleEventLogs, selectAggregableEventLogs 等                                        |
| `store.svelte.ts`   | Svelte 5 runes ストア (eventLogs, deals, tasks, settings, operationLogs, unreadCount, pendingTaskCount, threadGroups) + 全 CRUD 関数 + initializeFromStorage/clearAllData |

#### プロパティテスト (`src/lib/intelligence/__tests__/`)

| ファイル                          | 検証 Property                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `arbitraries.ts`                  | 共通 arbitrary 定義 (EventLog/Deal/Task/MaskingRule/OperationLog/AppSettings/IntelligenceState/WhitespaceString) |
| `serializer.property.test.ts`     | Property 1: シリアライズラウンドトリップ                                                                         |
| `thread-grouper.property.test.ts` | Property 2: スレッドグループ化                                                                                   |
| `masking-engine.property.test.ts` | Property 3, 4, 5: マスキング適用・復元・自動承認                                                                 |
| `ai-engine.property.test.ts`      | Property 12, 13, 14: 検索ソート・タスク件数・サマリー制約                                                        |
| `validation.property.test.ts`     | Property 6: 空白入力拒否                                                                                         |
| `store.property.test.ts`          | Property 7,8,9,10,11,15: Badge件数・シード冪等性・ドメインフィルタ・表示制御・タスク遷移・フェーズ履歴           |
| `filters.property.test.ts`        | Property 16: 時間窓フィルタリング(ダッシュボード) / Property 18: ページネーション上限                           |

---

## 次にやること (Wave 8〜 残 UI 実装)

### tasks.md の順序どおりに進める

```
タスク14 → タスク15 → タスク16 → チェックポイント17
        → タスク18 → タスク19 → タスク20 (Admin) → チェックポイント21 (最終)
```

### タスク 14: タスク画面

**`src/routes/intelligence/tasks/+page.svelte` を実装する**

- 全 Task をステータス別（未着手・進行中・完了）にグループ化し、各グループ内を dueDate 昇順で表示
- 各 Task に Task名・関連 Deal名・優先度・期限日を表示
- ステータス変更操作（`canTransitionTaskStatus(from, to)` が false の場合はボタン無効化）
- Deal別・優先度別フィルタリング機能
- 期限超過 Task の視覚的区別（背景色 `#FFF0F0`）
- AI 提案 Task（`isProposal: true`）の承認/却下 UI
- タスク14.2: リマインダー通知バー（24h以内・最大10件・60秒ポーリング・dismiss）
  - `VALIDATION.REMINDER_THRESHOLD_HOURS = 24`
  - `VALIDATION.REMINDERS_MAX = 10`
  - `VALIDATION.REMINDER_CHECK_INTERVAL_SEC = 60`

### タスク 15: 案件画面

**`src/routes/intelligence/deals/+page.svelte` を実装する**

- Deal 一覧を `DEAL_PHASES` 順にグループ化、更新日時降順
- Deal 詳細パネル: フェーズ・担当者・関連 EventLog・関連 Task・サマリー
- フェーズ遷移履歴をタイムライン形式で表示
- Deal 詳細内でスレッド/フラット切替
- タスク15.2: フェーズ変更 UI（8段階・AI 提案承認/却下）
- タスク15.3: サマリー生成ボタン・AI 自動更新提案の承認/却下

```ts
// ai-engine.ts から
import { generateSummary, detectPhaseChange, detectDataUpdate } from '$lib/intelligence/ai-engine.js';
// updateDeal で phase 変更時は phaseHistory も自動更新される (applyUpdateDeal が担う)
updateDeal(id, { phase: newPhase }, { changeType: 'manual' });
```

### タスク 16: データ編集・却下機能の統合

- 議事録/メモ入力フォーム（最大 10000/5000 文字）＋保存後にタスク自動生成
- 追記（最大1000字）・論理削除（確認ダイアログ）・コメント（最大500字）・却下（理由必須）

### チェックポイント タスク17

```bash
bun run test:prop && bun run check && bun run lint
bun run dev  # タスク・案件・データ編集を実際に確認する
```

---

## 実装済みコンポーネントのパターン (次のコンポーネントへの参考)

### レイアウト (`+layout.svelte` 抜粋)

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';        // hrefs は必ず resolve() を使う
  import { page } from '$app/stores';          // アクティブ判定
  import { SvelteSet } from 'svelte/reactivity'; // Set はこちらを使う
</script>
<!-- aria-current={$page.url.pathname === resolve('/foo') ? 'page' : undefined} -->
```

### ESLint ルール (はまりポイント)

| ルール                                  | 対処                                            |
| --------------------------------------- | ----------------------------------------------- |
| `svelte/no-navigation-without-resolve`  | `href={resolve('/path')}` を使う                |
| `svelte/require-each-key`               | `{#each items as item (item.id)}` でキーを付ける |
| `svelte/prefer-svelte-reactivity`       | `new Set()` → `new SvelteSet()`                 |

### ストア利用パターン

```svelte
<script lang="ts">
  import {
    eventLogs, deals, tasks, settings,
    unreadCount, pendingTaskCount, threadGroups,
    addEventLog, updateEventLog, deleteEventLog,
    rejectEventLog, approveEventLog,
    addDeal, updateDeal,
    addTask, updateTaskStatus,
    saveSettings
  } from '$lib/intelligence/store.svelte.js';
  import {
    selectVisibleEventLogs, selectAggregableEventLogs
  } from '$lib/intelligence/store-logic.js';
  import {
    canTransitionTaskStatus, isBlank, validateRejectionReason
  } from '$lib/intelligence/validation.js';
  import { VALIDATION, PHASE_LABELS, DEAL_PHASES } from '$lib/intelligence/constants.js';
</script>

<!-- $state/$derived はそのまま参照するだけでリアクティブ -->
<span>{unreadCount}</span>
{#each deals as deal (deal.id)}
  <p>{deal.name}</p>
{/each}
```

---

## 重要な設計判断 (引き継ぎ事項)

### 実装済みの設計

1. **pure reducer 方式**: `store-logic.ts` に純粋関数、`store.svelte.ts` は薄いラッパー。プロパティテストは store-logic を直接テスト。
2. **Date 復元**: `serializer.ts` のフィールド名 allowlist 方式。OperationLog の `operatedAt` も含む。
3. **applyMaskingAndApprove**: EventLog 追加時に必ず通る。空の maskingRules では `auto_no_masking_needed` で自動承認。
4. **seedIfNeeded**: `isSeeded()` true または `eventLogs.length > 0` のときはスキップ (冪等)。
5. **SPA 確定**: `ssr = false`, `prerender = false`, `fallback: 'index.html'`
6. **`updateDeal` のフェーズ変更**: `applyUpdateDeal` が `phase` キーを検出すると `phaseHistory` を自動更新する。`opts.changeType` で `'manual'` / `'ai_proposal_accepted'` を渡す。

### UI 実装時の注意

- **CSS 変数**: `app.css` に `--color-brand`, `--color-surface`, `--space-*`, `--radius-*` 等が定義済み。
- **isBlank チェック**: フォーム保存前に `isBlank(value)` で検証してからストア関数を呼ぶ。
- **却下理由**: `rejectEventLog(id, reason, by)` に渡す前に `validateRejectionReason(reason)` でガード。
- **タスク遷移**: `canTransitionTaskStatus(from, to)` が false のときは UI でボタン無効化。
- **期限超過判定**: `task.dueDate < new Date()` で判定、背景色 `#FFF0F0`。

---

## 仕様ドキュメント参照先

| ドキュメント      | 参照すべき箇所                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `design.md`       | CSS 変数: L126-179, UI レイアウト設計: L1-125, データモデル: L383-613, Store 設計: L351-379 |
| `design.md`       | Correctness Properties: L629-739 (Property 17 が未実装)                                     |
| `requirements.md` | 要件1〜25 (全て)                                                                            |
| `tasks.md`        | タスク14以降の詳細 (L255-)                                                                  |

---

## クイックスタート確認コマンド

```bash
# 現在の状態確認
bun run test:prop  # 73テスト全pass を確認
bun run check      # 0 errors を確認
bun run lint       # 0 errors を確認

# 開発サーバー
bun run dev        # http://localhost:5173/intelligence
                   # レイアウト・ダッシュボード・インボックスは実装済み
                   # tasks/deals/admin はプレースホルダー
```
