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
  types.ts               # ドメイン型（Action / Category / Risk / Status / MaskedEntity）
  lib/time.ts            # 経過時間の算出・色分け（NOW は固定値 2026-06-10T10:00:00）
  store/StoreContext.tsx # 全状態と状態遷移を集約した Context
  components/
    Shell.tsx            # 左ナビ＋上部バー＋トースト層（共通シェル）
    ActionCard.tsx       # S1/S4 共通のアクションカード
    Badge.tsx            # 経過/カテゴリ/高リスク/状態の各バッジ
    Button.tsx           # 主/副/危険/リンク のボタン
    DraftEditor.tsx      # 下書き（伏せ字チップ埋め込みの編集領域）
    MaskingPanel.tsx     # S3 マスキング＆ID辞書（右スライドインパネル）
    ConfirmDialog.tsx    # 棄却の確認ダイアログ
    Toaster.tsx          # トースト（右下・2.5秒）
  pages/
    Ledger.tsx           # S1 アクション台帳
    ActionDetail.tsx     # S2 詳細／実行キット
    Approvals.tsx        # S4 FS承認待ち
    Archive.tsx          # S5 完了済み
    Settings.tsx         # 設定（プレースホルダー）
```

### 状態モデルの要点

- アクションは `status` 一本でどの一覧に出るかが決まる:
  - 台帳(S1): `未確認` / `対応中`
  - FS承認待ち(S4): `FS承認待ち` / `承認済み`
  - 完了済み(S5): `送信済み` / `棄却`
- 一覧間の「移動」は status の更新で表現（複製しない）。左ナビのバッジも status から算出。
- トースト文言は3種のみ: `送信しました` / `FS承認へ回しました` / `棄却しました`。

## 実装上の約束

- **金額は伏せ字にしない**（背景・下書き内の数字はそのまま表示）。マスク対象は `人物` / `NDA` の2種のみ。
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
