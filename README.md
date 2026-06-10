# アクション台帳 — モックアップ

社内営業組織向け「アクション蒸留」プロダクトの**クリッカブルUIモックアップ**です。
見た目と画面遷移のみを再現します。バックエンド・AI・メール連携は実装していません
（すべてモックデータと擬似挙動）。仕様は `mockupspec v1.1` に準拠しています。

## 技術スタック

- Vite + React + TypeScript + Tailwind CSS v4
- ルーティング: React Router（`HashRouter` — GitHub Pages のサブパス直リンク対策）
- 状態管理: React の `useState` / Context のみ（外部ライブラリ不使用）
- ホスティング: GitHub Pages（`main` への push で自動ビルド・デプロイ）

## セットアップ

```bash
npm install      # 依存をインストール
npm run dev      # 開発サーバ（http://localhost:5173）
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果をローカル確認
npm run typecheck
```

## 画面構成

| ID  | 画面                       | ルート         |
| --- | -------------------------- | -------------- |
| S1  | アクション台帳（一覧）     | `/`            |
| S2  | アクション詳細／実行キット | `/action/:id`  |
| S3  | マスキング＆ID辞書         | S2上のオーバーレイ |
| S4  | FS承認待ち一覧             | `/approvals`   |
| S5  | 完了済み（アーカイブ）     | `/archive`     |

## デモ操作（モック専用）

- **台帳ヘッダー右上**: 通常／空／読込中 の表示状態を切り替え
- **低リスク詳細**: 「承認して送信」→ S5（完了済み）へ
- **高リスク詳細**: 「FS承認へ回す」→ S4 へ移動
- **S4**: 「（デモ）FSが承認する」→「送信する」→ S5 へ
- 「棄却する」→ 確認ダイアログ → S5（棄却）へ

## ディレクトリ

```
src/
  data/actions.ts        # サンプルデータ（架空。a01〜a08 / b01,b02 / c01,c02）
  types.ts               # ドメイン型
  lib/time.ts            # 経過時間の算出・色分け
  store/StoreContext.tsx # 全状態と状態遷移（Context）
  components/             # Shell / カード / バッジ / 下書きエディタ / S3パネル 等
  pages/                  # S1〜S5 の各画面
```

> 会社名・人名はすべて架空です。実在の組織・個人は使用していません。
