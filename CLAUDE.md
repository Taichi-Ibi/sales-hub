# Sales Hub / 営業情報連携（商談Wiki）モックアップ — CLAUDE.md

## 概要

社内営業組織向けプロダクトの**クリッカブルUIモックアップ**。題材は**IT受託開発のプリセールス**
（開発委託・保守開発・システム保守更新・新規提案の4案件）。**見た目と画面遷移のみ**を
再現し、バックエンド・AI・メール連携・認証・本物の送信は一切実装しない
（すべてモックデータと擬似挙動）。

### コンセプト（逆V字: 痕跡は昇り、助言は降りる）

「営業に入力させるCRM」ではなく「痕跡から商談Wikiを育てる仕組み」。
日々の痕跡（メール・Slack・議事録）をAIが読み、商談ごとの状態をWikiとして維持する。
人間の仕事は入力ではなく**確認と伝達**に限定する。

```
左脚（昇り・人間）
  ①集約        現場の痕跡（メール・Slack）が受信箱に集まる
  ②加工        ローカル前処理（分かち書き・ルール/辞書マスク・案件判定）
  🛡️ 目視ゲート  ★ 全件、人が目視確認してからAIへ。機密がないことを保証できるのは人間のみ
頂点（AI＋Wiki）
  商談Wiki      組織の唯一の事実（single source of truth）。実体は日次スナップショットの
               Markdown（昨日/今日を別ファイルで保持）。UIはレンダリングのみ・編集UIなし
右脚（降り・AI→人間）
  ③助言        直近2スナップショットの diff から生成された Markdown をレンダリングするだけ。
               事実/解釈/確信度をセクション分離し、全事実行に痕跡への根拠リンク必須
               （validateAdvice が起動時に保証）
  ④対話と伝達   代表者がWiki・助言を文脈にAIと対話し、宛先別ドラフトを「コピー」して伝達。
               自動送信はしない。コピーは relay ログ（traces 互換id）に記録され①へ還流
```

### 設計原則（実装判断に迷ったらここに戻る）

1. **ゼロ入力**: 営業メンバーに新たな入力作業を発生させない。人間の操作は「確認」と「伝達」のみ
2. **根拠必須**: AIの出力（Wiki・助言）には必ず痕跡（traces）への参照を添える。根拠を示せない指摘は出力しない
3. **事実と解釈の分離**: Wiki本文＝事実レイヤー、助言＝解釈レイヤー。データ構造上も混ぜない
4. **伝達は人を介す**: AIから関係者への自動送信はしない。必ず代表者の明示的なコピー操作を経由する
5. **アラートは個人ではなく構造に宛てる**: 週次レポートは流入・滞留の構造指標のみ（個人名ベースの帰責なし）
6. **マスキング**: AI処理はマスク済みデータのまま行い、表示層でのみ復元する。
   目視ゲート（②）の通過判定は全件、人が行う（確認者は `verifiedBy` に監査記録）

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
- UIコンポーネントライブラリは不使用。**Wikipedia / MediaWiki Vector 風**（`DESIGN.md`）。
  専用コンポーネントは作らず、リンク・wikitable・infobox・ambox・素の button で構成する

## アーキテクチャ

```
src/
  data/inbox.ts          # ①②: 受信箱のサンプルデータ（原文・自動マスク・警告・取込シード）
  data/traces.ts         # 痕跡（加工済みデータの台帳）。根拠リンクの参照先。relay も還流する
  data/snapshots.ts      # 頂点: 商談Wikiの日次スナップショット（frontmatter＋Markdown、4案件×2日）
  data/advice.ts         # ③: 助言（frontmatter＋Markdown）・週次レポート・validateAdvice（根拠必須の保証）
  data/deals.ts          # スキーマ層: 案件台帳（設定・案件ピッカーで使用）
  data/wiki.ts           # wiki層の共通型（SourceRef / WikiUpdate）＋ QA_FALLBACK
  types.ts               # ドメイン型（InboxItem / IngestSeed / MaskedEntity / RelayLogEntry）
  lib/time.ts            # 経過時間の算出・色分け（NOW は固定値 2026-06-10T10:00:00）
  lib/tokenize.ts        # 簡易分かち書き（文字種境界で分割。形態素解析のシミュレート）
  lib/snapshot.ts        # 当日スナップショットへの実行時パッチ適用（取込の追記・ヨミ変化）
  store/StoreContext.tsx # 全状態と状態遷移（取込→Wiki更新→助言生成、伝達コピー→relayログ）
  components/
    Shell.tsx            # 白ヘッダー＋左サイドバー（テキストリンク）。Wikipedia風の共通シェル
    MarkdownView.tsx     # 極小Markdownレンダラ（[tr:xxx]→脚注[1]、References=出典節、マスク復元）
    WikiParts.tsx        # 共通部品（SourceLink / TraceLink / UpdateTimeline=履歴wikitable）
    Toaster.tsx          # 操作結果の通知（装飾・アニメーションなしの素朴な枠）
  pages/
    Inbox.tsx            # 特別:受信箱（/inbox。「最近の更新＋巡回」の拡張。査読待ち＋処理記録）
    InboxDetail.tsx      # 痕跡の査読ページ（マスク補正→記事選択→確認してAIに渡す。確認は window.confirm）
    WikiList.tsx         # メインページ（/wiki。商談記事の一覧 wikitable）
    DealWiki.tsx         # 商談記事（/wiki/:dealId。タブ=本文|前日比|履歴、版切替、infobox、脚注）
    Advice.tsx           # 特別:助言（/advice。ウォッチリストの拡張。未読=太字。?tab=daily|weekly）
    AdviceDetail.tsx     # 助言記事（/advice/:id。infobox＋Markdown＋出典節＋ノート対話＋伝達）
    Settings.tsx         # 特別:設定（ブランクのプレースホルダ）
```

### ナビゲーション（4項目・Wikipedia風の命名）

1. **メインページ** `/wiki` — 商談Wiki（頂点・記事一覧）。読み取り専用レンダリング
2. **特別:受信箱** `/inbox` — 「最近の更新＋巡回」の拡張。全件人が査読（目視確認）。件数=（n）の素のテキスト
3. **特別:助言** `/advice` — ウォッチリストの拡張（差分からの変更通知と提案）。未読は太字
4. **特別:設定** — ブランクのプレースホルダ（モックでは中身なし）

旧URL（`/digest` `/projects/*` `/action/*` 等）は catch-all で `/inbox` へ。

### 状態モデルの要点

- 受信箱（InboxItem）の status は3値:
  - `要確認`: 目視確認待ち（**全件必須**）。人がマスク補正・案件選択をして「確認してAIに渡す」
    → 解析（1.5秒シミュレート）→ `処理済み`
  - `処理済み`: 目視確認→AI解析→Wiki取込が完了（= 痕跡）。確認者を `verifiedBy` に記録（監査ログ）
  - `アーカイブ`: AIに渡さないと人が判断したもの（戻せる）
- 取込（`StoreContext.ingestOne`）で起きること:
  1. `wikiAppends[dealId]` に「取込」更新を追記（`DealWiki` が静的 `updates` とマージ表示）
  2. `snapshotPatches[dealId]` で当日スナップショットに行追加・ヨミ変化（「今日の取込」ハイライト）
  3. `IngestSeed.adviceId` があれば `RUNTIME_ADVICE` から実行時助言を生成（助言バッジ+1・トースト）
- 助言（DealAdvice）: Wikiと同じく**最低限の frontmatter ＋ Markdown 本文**のみ
  （事実/解釈/確信度はセクションで分離）。週次レポートも同様に Markdown のみ。
  `generatedAt`・`inputs` で生成の透明性を示す。`validateAdvice` が事実セクションの
  全行に [tr:xxx] があることをモジュール評価時に保証
- 伝達（④）: `copyRelay` がクリップボードへ復元済み本文を書き、`relayLogs` に
  `tr-relay-N`（traces 互換id）で記録する。送信ボタンは存在しない（コピーのみ）
- デモループ: in02（北斗電装・未マスク警告）を目視確認→AIに渡す → Wiki更新（確度60→40）
  → 助言「ヨミ変化」生成 → 伝達ドラフトをコピー → relay ログ、で一周

## 実装上の約束

- **金額は伏せ字にしない**（ヨミの amount・本文内の数字はそのまま表示）。マスク種別は `氏名` / `会社` / `連絡先` / `契約番号` の4種
- 根拠は脚注 `[1]`（上付き）→ ページ末尾の「出典」節（`References`）で解決する
- 状態・件数は文字で表す（未読=太字、件数=（3））。ピル・バッジ・チップ・カード・影・トースト演出・モーダルは作らない
- 助言の優先度: 契約フェーズ入りが最優先（並びで表現。色は使わない）
- デザイントークンは `src/index.css` の `@theme` に定義（wikitable / infobox / ambox / btn もここ）
- **デザイン仕様は `DESIGN.md` を参照すること。** UIに関する判断はすべて `DESIGN.md` のトークンに従う
- 仕様にない判断が必要なら、勝手に決めず確認する

## ホスティング

- GitHub Pages。`vite.config.ts` の `base` は build 時のみ `/sales-hub/`。
- `.github/workflows/deploy.yml` が `main` への push で自動ビルド（`dist/`）・デプロイ。

## 作らないもの

実バックエンド・API・DB／本物のAI抽出・助言生成／メール・Slack・Docs連携／
認証・権限／本物の送信処理（伝達はコピーのみ）／多言語。**日本語UIのみ。**

## レスポンシブ対応

- ブレークポイントは Tailwind 既定（sm=640px / md=768px）。`md` 未満をモバイル扱い。
- ナビゲーション: `md` 以上は左サイドバー（220px）、`md` 未満は画面下部の固定タブバーに切り替え。
  どちらも同じ項目・バッジ件数を共有（`Shell.tsx` の `items` 配列）。
- 下部タブ分の余白をコンテンツ下に確保（`pb-24`）。`md` で解除。セーフエリア（`env(safe-area-inset-bottom)`）も考慮。
- 上部バーの検索ボックス・ユーザー名は `sm` 未満で省略。`viewport-fit=cover` を index.html に付与。
- トーストは下部タブと重ならないよう `md` 未満で上げて表示。
- 各画面の余白・ボタン列・フォーム・テーブルは狭幅で折返し／全幅／横スクロールするよう調整。
