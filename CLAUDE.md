# Sales Hub / Enterprise Intelligence OS（営業ナレッジベース）モックアップ — CLAUDE.md

## 概要

社内営業組織向けプロダクトの**クリッカブルUIモックアップ**。**見た目と画面遷移のみ**を
再現し、バックエンド・AI・メール連携・認証・本物の送信は一切実装しない
（すべてモックデータと擬似挙動）。

### コンセプト（raw → wiki → ビュー × OODA ループ）

Karpathy の「LLM Knowledge Base」パターンを組織向けに拡張した3層構造に、
OODA（Observe / Orient / Decide / Act）の意思決定ループを重ねた Enterprise Intelligence OS:

```
raw（受信箱）      Slack/メール/カレンダーの原文。不変。← Observe の入口
  ↓ 前処理        ローカルで分かち書き・ルール/辞書マスク・案件判定（データは外に出ない）
  ↓ 🛡️ 目視ゲート  ★ 全件、人が目視確認してからAIへ。機密がないことを保証できるのは人間のみ
  ↓ ingest        AIが解析→タスク化→wiki反映
wiki（ナレッジ）    案件・顧客・人物・会議・シグナル・意思決定をAIが維持。全記述に出典。lint つき ← Orient
  ↓ query/view
ビュー             ダイジェスト（OODA形式の朝刊）・「今日」（やる/待ち/済み）・
                  Decision Brief（Decide）・事前ブリーフ/フォローアップ（Act）
```

Act の結果（会議の議事録など）は再び raw（受信箱）に入り、ループが閉じる。

### ペルソナと3つの動線

ペルソナは**割り込み駆動のフィールドセールス担当**（メールで認識したタスクが
電話・商談の割り込みで忘却の彼方へ消える）。各画面は次の3動線のどれかに奉仕する:

1. **朝**「昨日から何が変わった？」— `/digest`（OODA形式・毎朝6:00生成・忘れかけタスクの再浮上）
2. **商談直前**「この案件、今どうなってる？」— 「今日」のまもなく開始バナー → `/meetings/:id` の事前ブリーフ
3. **会議後**「会議の後、何をすべき？」— 会議終了 → 議事録が目視確認待ちへ → タスク化 → 会議ページにフォローアップ

セキュリティ原則は **「機密情報がないことを保証できるのは人間のみ」**:
ロジック（パターン・辞書）の自動マスクと警告は目視確認を速くする補助であり、
ゲートの通過判定（確認してAIに渡す）は全件、人が行う。確認者は `verifiedBy` に監査記録される。
議事録も例外なく目視ゲートを通り、確認前の内容は会議ページにも表示しない。
**意思決定も同じ思想**: AIは Decision Brief（提案）まで。決定として記録する操作は人が行う。

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run typecheck  # 型チェックのみ
npm run preview    # ビルド結果の確認
```

> dev server はサンドボックス外で起動が必要。`npm run dev` は
> `dangerouslyDisableSandbox: true` を指定して実行すること。

パッケージマネージャーは **npm**。

## 技術スタック

- Vite + React + TypeScript + Tailwind CSS v4
- React Router の **HashRouter**（GitHub Pages のサブパス直リンク404対策）
- 状態管理は React の `useState` / Context のみ。外部状態管理ライブラリは使わない
- UIコンポーネントライブラリは不使用（`DESIGN.md` に従い自作）

## アーキテクチャ

```
src/
  data/inbox.ts          # raw層: 受信箱のサンプルデータ（原文・自動マスク・警告）＋ DEMO_MINUTES（会議終了デモの議事録）
  data/wiki.ts           # wiki層: 案件ページ（出典つき記述・更新履歴・lint・想定問答）。SourceRef 等の共通型の供給元
  data/customers.ts      # wiki層: 顧客ページ（案件横断の関係・facts は deals.ts と一致）
  data/people.ts         # wiki層: 人物ページ（交渉スタイル・関心事・最終接点。既存登場人物のみ）
  data/signals.ts        # wiki層: シグナル（兆候/繰り返しの質問/ボトルネック。横断観測＋AIの提案）
  data/decisions.ts      # 意思決定ログ（Decision Brief: 論点・選択肢A/B/C・推奨案・リスク・出典）
  data/digest.ts         # デイリーダイジェスト（OODA形式。6:00生成、それ以降の新着はライブ算出）
  data/actions.ts        # ビュー: タスクのサンプルデータ。status で表示先タブが一意に決まる
  data/deals.ts          # 登録済みプロジェクトの台帳（設定・案件ピッカーで使用）
  types.ts               # ドメイン型（Action / InboxItem / Category / Risk / Status / MaskedEntity）
  lib/time.ts            # 経過時間の算出・色分け（NOW は固定値 2026-06-10T10:00:00）
  lib/tokenize.ts        # 簡易分かち書き（文字種境界で分割。形態素解析のシミュレート）
  store/StoreContext.tsx # 全状態と状態遷移を集約した Context（タスク化→wiki追記・意思決定の記録・会議終了デモ）
  components/
    Shell.tsx            # 左ナビ＋上部バー＋トースト層（共通シェル）
    WikiParts.tsx        # wiki層共通部品（SourceChip / UpdateTimeline / Field / DecisionStatusPill）
    ActionCard.tsx       # タスクカード
    Badge.tsx            # 経過/カテゴリ/高リスク/状態の各バッジ
    Button.tsx           # 主/副/危険/リンク のボタン
    DraftEditor.tsx      # 下書き（伏せ字チップ埋め込みの編集領域）
    Drilldown.tsx        # 経緯のドリルダウン（原文＋案件ページ要約。折りたたみ）
    MaskingPanel.tsx     # 伏せ字の確認・復元パネル（右スライドイン。マスク作成は不可）
    ConfirmDialog.tsx    # 確認ダイアログ
    Toaster.tsx          # トースト（右下・2.5秒）
  pages/
    Ledger.tsx           # 今日（ホーム /）。まもなく開始バナー＋やる/待ち/済み の3タブ
    Digest.tsx           # デイリーダイジェスト（/digest）。観測/状況認識/意思決定/実行＋忘れかけタスク
    ActionDetail.tsx     # タスク詳細／実行キット
    Inbox.tsx            # 受信箱（目視確認待ち＋予定（カレンダー）＋処理ログ）
    InboxDetail.tsx      # 原文詳細（目視確認: マスク補正→案件選択→確認してAIに渡す）
    Wiki.tsx             # ナレッジハブ（/wiki）。案件/顧客/人物/会議/シグナル/意思決定 のタブ
    Projects.tsx         # 案件一覧の本体（ProjectListSection。Wiki の案件タブが使用）
    ProjectDetail.tsx    # 案件ページ（/projects/:id。出典つき記述・lint・質問・関連意思決定・更新履歴）
    CustomerDetail.tsx   # 顧客ページ（/wiki/customer/:id）
    PersonDetail.tsx     # 人物ページ（/wiki/person/:id）
    SignalDetail.tsx     # シグナルページ（/wiki/signal/:id。根拠の時系列＋AIの提案）
    MeetingDetail.tsx    # 会議ページ（/meetings/:id。開催前=事前ブリーフ／終了後=フォローアップ）
    DecisionDetail.tsx   # Decision Brief（/decisions/:id。「決定として記録する」は人の操作）
    Settings.tsx         # 設定（スキーマ層: 案件登録・ドメイン紐付け・マスキング辞書）
```

### ナビゲーション（5項目）

1. **今日** `/` — ホーム。まもなく開始バナー（2時間以内の予定→事前ブリーフ）＋タスクの日次ビュー。バッジ=やる件数
2. **ダイジェスト** `/digest` — OODA形式の朝刊。バッジ=未閲覧なら1（閲覧で消える）
3. **ナレッジ** `/wiki` — AIが維持する wiki 層のハブ。バッジ=アラート件数＋提案中の意思決定件数
4. **受信箱** `/inbox` — マスキング目視ゲート（全件人が確認）。バッジ=目視確認待ち件数
5. **設定** — 自動処理の精度を上げるスキーマ層（案件・ドメイン・マスキング辞書）

### 状態モデルの要点

- タスク（Action）は `status` 一本でタブが決まる:
  - やる: `未確認` / `対応中`　·　待ち: `FS承認待ち` / `承認済み`　·　済み: `送信済み` / `棄却`
  - タブは URL クエリ（`/?tab=waiting` / `/?tab=done`）に保持。旧 `/ledger` `/approvals` `/archive` はリダイレクト
- 受信箱（InboxItem）の status は4値:
  - `待機中`: 予定・会議。イベント終了後、議事録が目視確認待ちに入る
  - `要確認`: 目視確認待ち（**全件必須**）。ロジックの警告は `attention`。
    人がマスク補正・案件選択をして「確認してAIに渡す」
    → 解析（1.5秒シミュレート）→ `処理済み`
  - `処理済み`: 目視確認→AI解析完了。確認した人を `verifiedBy` に記録（監査ログ）。
    タスク化（`resultActionId`）または `analysisNote`
  - `アーカイブ`: AIに渡さないと人が判断したもの（戻せる）
- 目視確認を経てタスク化すると、該当案件の wiki に「取込」更新が実行時追記される
  （`StoreContext` の `wikiAppends`。`ProjectDetail` が静的 `updates` とマージ表示）
- 意思決定（Decision）の status は3値: `提案中` / `決定済み` / `撤回`。
  `recordDecision`（人の操作）で 提案中→決定済み になり、wiki に「意思決定」更新が追記される
- 会議ページ（`/meetings/:id`）は受信箱の schedule アイテムが軸。`待機中`=事前ブリーフ
  （wiki・意思決定・タスクを counterparty でライブ合成）、`要確認`=議事録の目視確認待ち
  （内容は非表示）、`処理済み`=フォローアップ（決まったこと・タスク・未回答の質問）
- 会議終了デモ（`endMeetingDemo`、in11 のみ）: 予定を `要確認` にし `DEMO_MINUTES` の議事録を
  投入する。以降は通常の目視ゲートを通る（迂回経路は作らない）

### 受信箱（マスキング目視ゲート）のパイプライン

- 建て付け: 受信 → ローカル前処理（分かち書き＝初期化時に付与・ルール/辞書による自動マスク
  〔連絡先・契約番号はパターン、氏名は `SettingsMasking` の辞書〕・案件の自動判定
  〔メール: ドメイン / 本文一致〕）→ **人の目視確認（全件必須）** → AI解析 → タスク化
- セキュリティポリシー: **機密情報がないことを保証できるのは人間のみ**。
  ロジックの自動マスク・警告は目視を速くする補助であり、ゲートを迂回する経路はない
- 要確認のシードは3種: 警告「未マスクの疑い」（in02: 氏名が辞書未登録）・
  警告「案件不明」（in10）・警告なしでも目視必須の例（in05）
- マスキング（伏せる操作）は受信箱の要確認時のみ。タスク側は復元のみ
- タスク化時、`knownSensitive` のうち未マスクの語は Action の「未マスクの疑い」に引き継ぐ
- wiki に反映してよいのは**人が目視確認してAIに渡った原文だけ**。確認前のアイテムを
  `SourceRef` で参照してはならない

### ナレッジ（wiki 層）

- ページタイプは6種: 案件（`wiki.ts`）・顧客（`customers.ts`）・人物（`people.ts`）・
  会議（受信箱の schedule アイテム）・シグナル（`signals.ts`）・意思決定（`decisions.ts`）。
  `/wiki` のタブで切り替え（`?tab=customers|people|meetings|signals|decisions`）
- `data/wiki.ts` の `WikiPage`。直近の状況（`statements`）・アラート（`alerts`）の各記述に
  `SourceRef`（出典）がつき、受信箱に実体があれば `inboxItemId` で原文へ遷移できる。
  顧客・人物・シグナルも同じ `WikiStatement` / `WikiUpdate` を共有する（`WikiParts.tsx` で表示）
- `updates` は AI によるページ維持の記録（取込 / 定期更新 / 整合性チェック / 意思決定）
- 「この案件に質問する」は `qa`（想定問答）+ `QA_FALLBACK` で query をシミュレート
  （1.2秒の思考演出。回答に出典チップ）
- 毎朝6:00の自動更新・整合性チェック（lint）という建て付け。`lastLintAt` に表示

## 実装上の約束

- **金額は伏せ字にしない**（背景・下書き内の数字はそのまま表示）。マスク種別は `氏名` / `会社` / `連絡先` / `契約番号` の4種
- 経過バッジの色: 24h未満=緑(good) / 24h以上72h未満=黄(warn) / 72h以上=赤(danger)。境界は上位区分に含める
- 高リスクのみ高リスクバッジを表示。低リスクは何も出さない
- アニメーションはトースト150ms / パネル150-200ms のみ。`prefers-reduced-motion` で無効化
- デザイントークンは `src/index.css` の `@theme` に定義
- **デザイン仕様は `DESIGN.md` を参照すること。** UIに関する判断はすべて `DESIGN.md` のトークンに従う
- 仕様にない判断が必要なら、勝手に決めず確認する

## ホスティング

- GitHub Pages。`vite.config.ts` の `base` は build 時のみ `/sales-hub/`。
- `.github/workflows/deploy.yml` が `main` への push で自動ビルド（`dist/`）・デプロイ。

## 作らないもの

実バックエンド・API・DB／本物のAI抽出・下書き生成／メール・Slack・Docs連携／
認証・権限・監査ログ／本物の送信処理／多言語。**日本語UIのみ。**

## レスポンシブ対応

- ブレークポイントは Tailwind 既定（sm=640px / md=768px）。`md` 未満をモバイル扱い。
- ナビゲーション: `md` 以上は左サイドバー（220px）、`md` 未満は画面下部の固定タブバーに切り替え。
  どちらも同じ項目・バッジ件数を共有（`Shell.tsx` の `items` 配列）。
- 下部タブ分の余白をコンテンツ下に確保（`pb-24`）。`md` で解除。セーフエリア（`env(safe-area-inset-bottom)`）も考慮。
- 上部バーの検索ボックス・ユーザー名は `sm` 未満で省略。`viewport-fit=cover` を index.html に付与。
- トーストは下部タブと重ならないよう `md` 未満で上げて表示。
- 各画面の余白・ボタン列・フォーム・テーブルは狭幅で折返し／全幅／横スクロールするよう調整。
