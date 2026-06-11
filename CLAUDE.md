# Sales Hub（営業ナレッジベース）モックアップ — CLAUDE.md

## 概要

社内営業組織向けプロダクトの**クリッカブルUIモックアップ**。**見た目と画面遷移のみ**を
再現し、バックエンド・AI・メール連携・認証・本物の送信は一切実装しない
（すべてモックデータと擬似挙動）。

### New Version のコンセプト（raw → wiki → ビュー）

Karpathy の「LLM Knowledge Base」パターンを組織向けに拡張した3層構造:

```
raw（受信箱）      Slack/メール/議事録の原文。不変。
  ↓ ingest        AIが自動マスク→自動解析→タスク化（人は例外だけレビュー）
wiki（案件ページ）  1案件=1ページをAIが維持。全記述に出典。lint（整合性チェック）つき
  ↓ query/view
ビュー             「今日」（やる/待ち/済み）・商談前の質問応答・更新履歴
```

設計原則は **「AIが主語」**: 人間がAIのためにデータを準備するのではなく、
AIが処理した結果だけが人間に届く。人の仕事は
1) 「今日」のタスクをこなす、2) 例外（要レビュー）を解決する、の2つ。

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
  data/inbox.ts          # raw層: 受信箱のサンプルデータ（原文・自動マスク・例外理由）
  data/wiki.ts           # wiki層: 案件ページ（出典つき記述・更新履歴・lint・想定問答）
  data/actions.ts        # ビュー: タスクのサンプルデータ。status で表示先タブが一意に決まる
  data/deals.ts          # 登録済みプロジェクトの台帳（設定・案件ピッカーで使用）
  types.ts               # ドメイン型（Action / InboxItem / Category / Risk / Status / MaskedEntity）
  lib/time.ts            # 経過時間の算出・色分け（NOW は固定値 2026-06-10T10:00:00）
  lib/tokenize.ts        # 簡易分かち書き（文字種境界で分割。形態素解析のシミュレート）
  store/StoreContext.tsx # 全状態と状態遷移を集約した Context（例外解決→タスク化→wiki追記）
  components/
    Shell.tsx            # 左ナビ＋上部バー＋トースト層（共通シェル）
    ActionCard.tsx       # タスクカード
    Badge.tsx            # 経過/カテゴリ/高リスク/状態の各バッジ
    Button.tsx           # 主/副/危険/リンク のボタン
    DraftEditor.tsx      # 下書き（伏せ字チップ埋め込みの編集領域）
    Drilldown.tsx        # 経緯のドリルダウン（原文＋案件ページ要約。折りたたみ）
    MaskingPanel.tsx     # 伏せ字の確認・復元パネル（右スライドイン。マスク作成は不可）
    ConfirmDialog.tsx    # 確認ダイアログ
    Toaster.tsx          # トースト（右下・2.5秒）
  pages/
    Ledger.tsx           # 今日（ホーム /）。やる/待ち/済み の3タブ
    ActionDetail.tsx     # タスク詳細／実行キット
    Inbox.tsx            # 受信箱（例外レビューキュー＋予定＋自動処理ログ）
    InboxDetail.tsx      # 原文詳細（要レビュー: マスク補正→案件選択→AIに渡す）
    Projects.tsx         # 案件一覧（AIが維持する wiki ページの一覧）
    ProjectDetail.tsx    # 案件ページ（出典つき記述・lint・質問・更新履歴・原文ソース）
    Settings.tsx         # 設定（スキーマ層: 案件登録・ドメイン紐付け・マスキング辞書）
```

### ナビゲーション（4項目）

1. **今日** `/` — ホーム。AIが抽出したタスクの日次ビュー（やる/待ち/済み）。バッジ=やる件数
2. **案件** `/projects` — AIが維持する案件 wiki。バッジ=アラート（lint）件数
3. **受信箱** `/inbox` — 例外レビューキュー。バッジ=要レビュー件数
4. **設定** — 自動処理の精度を上げるスキーマ層（案件・ドメイン・マスキング辞書）

### 状態モデルの要点

- タスク（Action）は `status` 一本でタブが決まる:
  - やる: `未確認` / `対応中`　·　待ち: `FS承認待ち` / `承認済み`　·　済み: `送信済み` / `棄却`
  - タブは URL クエリ（`/?tab=waiting` / `/?tab=done`）に保持。旧 `/ledger` `/approvals` `/archive` はリダイレクト
- 受信箱（InboxItem）の status は4値:
  - `待機中`: 予定・会議。イベント終了後にAIが議事録を解析する
  - `要レビュー`: AIが確信を持てなかったもの（`exceptionReasons` に理由）。
    人がマスク補正・案件選択をして「AIに渡す」→ 解析（1.5秒シミュレート）→ `処理済み`
  - `処理済み`: 自動処理完了（`processedAt`）。タスク化（`resultActionId`）または `analysisNote`
  - `アーカイブ`: AIに渡さないと人が判断したもの（戻せる）
- 例外解決でタスク化すると、該当案件の wiki に「取込」更新が実行時追記される
  （`StoreContext` の `wikiAppends`。`ProjectDetail` が静的 `updates` とマージ表示）

### 受信箱（例外レビュー）のパイプライン

- 自動処理の建て付け: 受信 → 分かち書き（初期化時に付与）→ ルール・辞書による自動マスク
  （連絡先・契約番号はパターン、氏名は `SettingsMasking` の辞書）→ 案件の自動判定
  （メール: ドメイン / 本文一致）→ 毎時バッチで解析 → タスク化
- 人に届く例外は2種をシードで用意: 「未マスクの疑い」（in02）と「案件不明」（in10）
- マスキング（伏せる操作）は受信箱の要レビュー時のみ。タスク側は復元のみ
- タスク化時、`knownSensitive` のうち未マスクの語は Action の「未マスクの疑い」に引き継ぐ

### 案件ページ（wiki）

- `data/wiki.ts` の `WikiPage`。直近の状況（`statements`）・アラート（`alerts`）の各記述に
  `SourceRef`（出典）がつき、受信箱に実体があれば `inboxItemId` で原文へ遷移できる
- `updates` は AI によるページ維持の記録（取込 / 定期更新 / 整合性チェック）
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
