# アクション台帳モックアップ — CLAUDE.md

## 概要

社内営業組織向け「アクション蒸留」プロダクトの**クリッカブルUIモックアップ**。
仕様書 `mockupspec v1.1` に準拠。**見た目と画面遷移のみ**を再現し、バックエンド・AI・
メール連携・認証・本物の送信は一切実装しない（すべてモックデータと擬似挙動）。

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

## 技術スタック（仕様書 §13）

- Vite + React + TypeScript + Tailwind CSS v4
- React Router の **HashRouter**（GitHub Pages のサブパス直リンク404対策）
- 状態管理は React の `useState` / Context のみ。外部状態管理ライブラリは使わない
- UIコンポーネントライブラリは不使用（デザイン指針 §9 に従い自作）

## アーキテクチャ

```
src/
  data/actions.ts        # サンプルデータ（架空）。status で表示先一覧が一意に決まる
  data/inbox.ts          # Inbox のサンプルデータ（Slack/メール/議事録の原文）
  data/deals.ts          # 案件プロパティ（構造化情報＋非構造化メモ。定期自動更新のイメージ）
  types.ts               # ドメイン型（Action / InboxItem / Category / Risk / Status / MaskedEntity）
  lib/time.ts            # 経過時間の算出・色分け（NOW は固定値 2026-06-10T10:00:00）
  lib/tokenize.ts        # 簡易分かち書き（文字種境界で分割。形態素解析のシミュレート）
  store/StoreContext.tsx # 全状態と状態遷移を集約した Context
  components/
    Shell.tsx            # 左ナビ＋上部バー＋トースト層（共通シェル）
    ActionCard.tsx       # S1/S4 共通のアクションカード
    Badge.tsx            # 経過/カテゴリ/高リスク/状態の各バッジ
    Button.tsx           # 主/副/危険/リンク のボタン
    DraftEditor.tsx      # 下書き（伏せ字チップ埋め込みの編集領域）
    Drilldown.tsx        # S2 経緯のドリルダウン（原文＋案件プロパティ。折りたたみ）
    MaskingPanel.tsx     # S3 伏せ字の確認・復元パネル（右スライドイン。マスク作成は不可）
    ConfirmDialog.tsx    # 棄却の確認ダイアログ
    Toaster.tsx          # トースト（右下・2.5秒）
  pages/
    Inbox.tsx            # S0 Inbox（IS向け受信箱。Slack/メール/議事録）
    InboxDetail.tsx      # S0' 原文詳細（分かち書き→タップでマスキング→AIタスク化）
    Ledger.tsx           # S1 アクション台帳（要対応/依頼中/完了 の3タブ。旧S4/S5を統合）
    ActionDetail.tsx     # S2 詳細／実行キット
    Settings.tsx         # 設定（プレースホルダー）
```

### 状態モデルの要点

- 画面は **Inbox（入口）と台帳（作業場）の2画面**＋設定。台帳はタブで切り替え、
  タブは URL のクエリ（`/?tab=waiting` / `/?tab=done`）に保持する。
  旧 `/approvals` `/archive` は該当タブへリダイレクト。
- アクションは `status` 一本でどのタブに出るかが決まる:
  - 台帳「要対応」タブ: `未確認` / `対応中`
  - 台帳「依頼中」タブ: `FS承認待ち` / `承認済み`
  - 台帳「完了」タブ: `送信済み` / `棄却`
- タブ間の「移動」は status の更新で表現（複製しない）。左ナビのバッジも status から算出
  （台帳バッジは「要対応」件数）。
- トースト文言は4種のみ: `送信しました` / `FS承認へ回しました` / `棄却しました` / `タスク化しました`。

### Inbox とマスキングのパイプライン

- Inbox には Slack / メール / 議事録 の原文（架空）が入る。`InboxItem.status` は
  `未処理` → `マスキング中` → `タスク化済み` の一方向。
- 流れ: 原文を開くと**分かち書き**（CPU実行のシミュレート。`lib/tokenize.ts` の
  文字種境界分割を約1秒の擬似処理後に適用）→ トークンを**タップしてマスキング**
  （同一文字列は一括で同じ伏せ字トークンになる）→ **AIタスク化**（シミュレート。
  `distilled` シードにマスクを適用して Action を生成し台帳へ追加）。
- マスキング（伏せる操作）は Inbox でのみ行う。台帳側は復元のみ
  （`MaskingPanel` は確認・復元・「未マスクの疑い」の無視だけ）。
- タスク化時、`knownSensitive` のうち未マスクの語は Action の「未マスクの疑い」に引き継ぐ。

### 経緯のドリルダウン（S2）

- 各 Action は `origin`（元になった原文の抜粋: Slack/メール/議事録）を持ち、詳細画面の
  「経緯を深掘り」で折りたたみ表示する。原文は**伏せ字適用済み**で表示（台帳ではマスクを外さない）。
  Inbox に実体があれば `origin.inboxItemId` で遷移できる。
- 案件プロパティは `data/deals.ts`。`Action.counterparty` で紐付け、構造化フィールド＋
  「最近の動き」（日付つき非構造化メモ）＋最終更新/更新サイクル表示で定期自動更新を表現する。

## 実装上の約束

- **金額は伏せ字にしない**（背景・下書き内の数字はそのまま表示）。マスク種別は `氏名` / `会社` / `連絡先` / `契約番号` の4種。
- 経過バッジの色: 24h未満=緑(good) / 24h以上72h未満=黄(warn) / 72h以上=赤(danger)。境界は上位区分に含める。
- 高リスクのみ高リスクバッジを表示。低リスクは何も出さない。
- アニメーションは仕様書 §10 の指定のみ（トースト150ms / S3パネル150-200ms）。`prefers-reduced-motion` で無効化。
- デザイントークンは `src/index.css` の `@theme` に定義（§9.1 のカラー）。
- 仕様書に書かれていない判断が必要なら、勝手に決めず確認する。

## ホスティング

- GitHub Pages。`vite.config.ts` の `base` は build 時のみ `/sales-hub/`。
- `.github/workflows/deploy.yml` が `main` への push で自動ビルド（`dist/`）・デプロイ。

## 作らないもの（仕様書 §2.2 / §14）

実バックエンド・API・DB／本物のAI抽出・下書き生成／メール・Slack・Docs連携／
認証・権限・監査ログ／本物の送信処理／多言語。**日本語UIのみ。**

## レスポンシブ対応

仕様書 §14 ではモバイル最適化は対象外だったが、後追いでモバイル完全対応を実施済み。

- ブレークポイントは Tailwind 既定（sm=640px / md=768px）。`md` 未満をモバイル扱い。
- ナビゲーション: `md` 以上は左サイドバー（220px）、`md` 未満は画面下部の固定タブバーに切り替え。
  どちらも同じ項目・バッジ件数を共有（`Shell.tsx` の `items` 配列）。
- 下部タブ分の余白をコンテンツ下に確保（`pb-24`）。`md` で解除。セーフエリア（`env(safe-area-inset-bottom)`）も考慮。
- 上部バーの検索ボックス・ユーザー名は `sm` 未満で省略。`viewport-fit=cover` を index.html に付与。
- トーストは下部タブと重ならないよう `md` 未満で上げて表示。
- 各画面の余白・ボタン列・フォーム・テーブルは狭幅で折返し／全幅／横スクロールするよう調整。
