# Implementation Plan: AI Sales Brain（Sales Intelligence）

## Overview

Sales Intelligence機能をSvelteKit（Svelte 5 runes）+ TypeScript + adapter-staticで実装する。localStorageベースのデータ永続化、テンプレートベースのAIシミュレーション、スレッド表示機能を含むフロントエンド静的SPAとして構築する。実装はドメインモデル・ユーティリティモジュールから開始し、ストア層、UI層の順で段階的に進める。

## Tasks

- [x] 1. プロジェクト基盤セットアップ
  - [x] 1.1 ドメイン型定義ファイルの作成
    - `src/lib/intelligence/types.ts` を作成し、EventLog・Deal・Task・ThreadGroup・MaskingRule・AppSettings・OperationLog・SearchResult・PhaseChangeProposal・DataUpdateProposal・RetrospectiveResult 等の全インターフェースと型を定義する
    - バリデーション定数（VALIDATION オブジェクト）を同ファイルまたは `constants.ts` に定義する
    - DealPhase の8段階の定義と日本語ラベルマッピングを含める
    - _Requirements: 1.2, 2.2, 3.2, 8.1, 24.1_

  - [x] 1.2 テスト基盤のセットアップ
    - `vitest` と `fast-check` をdevDependenciesに追加する
    - `vite.config.ts` にtestの設定を追加する
    - `package.json` に `test`, `test:prop`, `test:unit` スクリプトを追加する
    - テストディレクトリ `src/lib/intelligence/__tests__/` を作成する
    - _Requirements: 24.3_

  - [x] 1.3 ルーティング構造の作成
    - `src/routes/intelligence/+layout.svelte` — Intelligence機能の共通レイアウト（ナビゲーション含む）
    - `src/routes/intelligence/+page.svelte` — Dashboard
    - `src/routes/intelligence/inbox/+page.svelte` — Inbox
    - `src/routes/intelligence/tasks/+page.svelte` — Tasks
    - `src/routes/intelligence/deals/+page.svelte` — Deals
    - `src/routes/intelligence/admin/+page.svelte` — Admin Panel
    - 各ファイルは最小限のプレースホルダーで作成する
    - _Requirements: 23.1, 23.3_

- [x] 2. データ永続化・シリアライズモジュール
  - [x] 2.1 Serializerモジュールの実装
    - `src/lib/intelligence/serializer.ts` を作成する
    - EventLog・Deal・Task の配列をJSON文字列にシリアライズする関数を実装する
    - JSON文字列からデシリアライズし、ISO 8601文字列の日時フィールドをDateオブジェクトに復元する関数を実装する
    - JSONパース失敗時は空の配列を返しコンソールにエラー出力する
    - `safeSave` / `safeLoad` ヘルパー関数を実装する（QuotaExceededError対応含む）
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 24.1, 24.2, 24.4_

  - [x]* 2.2 プロパティテスト：シリアライズ・デシリアライズ ラウンドトリップ等価性
    - **Property 1: シリアライズ・デシリアライズ ラウンドトリップ等価性**
    - `src/lib/intelligence/__tests__/serializer.property.test.ts` を作成する
    - fast-checkで任意の有効なEventLogオブジェクトを生成し、シリアライズ→デシリアライズ後のオブジェクトが元と一致することを検証する
    - **Validates: Requirements 24.1, 24.2, 24.3**

- [x] 3. スレッドグルーピングモジュール
  - [x] 3.1 ThreadGrouperの実装
    - `src/lib/intelligence/thread-grouper.ts` を作成する
    - `groupByThread(eventLogs)` — Slack（thread_ts）とメール（In-Reply-To/References）でグループ化する関数
    - `getThreadMessages(threadGroup)` — スレッド内メッセージを時系列昇順で返す関数
    - 1件のみのグループは単独メッセージとして扱うロジック
    - スレッド識別子を持たないメッセージはグループ化しない
    - _Requirements: 25.1, 25.2, 25.4, 25.7_

  - [x]* 3.2 プロパティテスト：スレッドグループ化の正確性
    - **Property 2: スレッドグループ化の正確性**
    - `src/lib/intelligence/__tests__/thread-grouper.property.test.ts` を作成する
    - 同一thread_tsのSlackメッセージが同一ThreadGroupに属すること、メールのIn-Reply-To/Referencesチェーンが同一ThreadGroupに属すること、単独メッセージがいずれのグループにも属さないことを検証する
    - **Validates: Requirements 25.1, 25.2, 25.4, 25.7**

- [x] 4. マスキングエンジンモジュール
  - [x] 4.1 MaskingEngineの実装
    - `src/lib/intelligence/masking-engine.ts` を作成する
    - `autoMask(text, rules)` — 正規表現ルールに基づく自動マスキング（「●」文字で置換）
    - `manualMask(text, start, end)` — 選択範囲の手動マスキング
    - `restore(maskedText, originalText)` — マスキング復元
    - `applyMaskMethod(text, method)` — full/partial/keep_edges の3方式対応
    - 元テキストを保持するデータ構造
    - _Requirements: 5.1, 5.3, 5.6_

  - [x]* 4.2 プロパティテスト：マスキング適用の正確性
    - **Property 3: マスキング適用の正確性**
    - `src/lib/intelligence/__tests__/masking-engine.property.test.ts` を作成する
    - 任意のテキストと正規表現ルールの組み合わせでマスキングがルールに一致する全箇所を「●」で置換すること、手動マスキングが選択範囲のみを置換することを検証する
    - **Validates: Requirements 5.1, 5.3**

  - [x]* 4.3 プロパティテスト：マスキング復元ラウンドトリップ
    - **Property 4: マスキング復元ラウンドトリップ**
    - 同ファイルに追加する
    - 任意のテキストに対してマスキング→復元で元テキストが完全に復元されることを検証する
    - **Validates: Requirements 5.6**

  - [x]* 4.4 プロパティテスト：マスキング完了による自動承認
    - **Property 5: マスキング完了による自動承認**
    - 同ファイルに追加する
    - マスキング処理後にステータスが「承認済」に変更され、適切な承認種別・承認日時が記録されることを検証する
    - **Validates: Requirements 5.2, 5.4, 5.5**

- [x] 5. AI Engineモジュール
  - [x] 5.1 AI Engineの実装
    - `src/lib/intelligence/ai-engine.ts` を作成する
    - `generateTasks(eventLog, deals)` — テンプレートベースのTask模擬生成（1〜3件）
    - `generateSummary(deal, eventLogs)` — Deal サマリー模擬生成（最大500文字）
    - `search(query, eventLogs, deals, tasks)` — キーワード部分一致ベースの模擬検索（関連度スコア降順、最大20件）
    - `detectPhaseChange(deal, eventLogs)` — フェーズ変更検出・提案
    - `detectDataUpdate(eventLog, deals)` — データ自動更新提案
    - `generateRetrospective(eventLogs, tasks)` — 振り返り改善提案（1〜3件）
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 12.1, 19.2_

  - [x]* 5.2 プロパティテスト：検索結果の関連度スコア降順
    - **Property 12: 検索結果の関連度スコア降順**
    - `src/lib/intelligence/__tests__/ai-engine.property.test.ts` を作成する
    - 任意の検索クエリの結果が関連度スコア降順で並び、最大20件を超えないことを検証する
    - **Validates: Requirements 9.1, 9.2**

  - [x]* 5.3 プロパティテスト：AIタスク生成の範囲制約
    - **Property 13: AIタスク生成の範囲制約**
    - 同ファイルに追加する
    - 任意のEventLogを入力として生成件数が1〜3件であり、各Taskがタイトル・期限・優先度を持つことを検証する
    - **Validates: Requirements 10.1, 10.2**

  - [x]* 5.4 プロパティテスト：サマリー生成の制約とインジケーター
    - **Property 14: サマリー生成の制約とインジケーター**
    - 同ファイルに追加する
    - サマリーが最大500文字であること、生成日時と対象期間を保持すること、新しいEventLog追加後にhasUpdatesがtrueになることを検証する
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ] 6. チェックポイント - 基盤モジュールの確認
  - 全てのプロパティテストが通ることを確認する。問題があればユーザーに確認する。

- [x] 7. シードデータモジュール
  - [x] 7.1 シードデータの実装
    - `src/lib/intelligence/seed-data.ts` を作成する
    - Slackシードデータ：5件以上（うち2スレッド以上のスレッド構造）を生成する
    - メールシードデータ：10件以上（うち2スレッド以上、許可ドメインに一致するデータ）を生成する
    - カレンダーシードデータ：5〜10件（動的日付生成で当日〜3日以内に2件以上）を生成する
    - Dealシードデータ：4件（異なるフェーズ）を生成する
    - `si_seed_initialized` フラグによる冪等性の保証
    - 許可ドメインリスト初期値の設定
    - _Requirements: 1.1, 1.4, 2.1, 2.5, 3.1, 3.4_

  - [x]* 7.2 プロパティテスト：シードデータ投入の冪等性
    - **Property 8: シードデータ投入の冪等性**
    - `src/lib/intelligence/__tests__/store.property.test.ts` を作成する
    - シードデータ初期化を複数回実行しても既存データが変更されないことを検証する
    - **Validates: Requirements 1.4, 2.5, 3.4**

  - [x]* 7.3 プロパティテスト：メールドメインフィルタリング
    - **Property 9: メールドメインフィルタリング**
    - 同ファイルに追加する
    - 許可ドメインリストに含まれないメールが除外されることを検証する
    - **Validates: Requirements 2.3**

- [x] 8. 状態管理ストア
  - [x] 8.1 メインストアの実装
    - `src/lib/intelligence/store.svelte.ts` を作成する
    - Svelte 5 runes（`$state`, `$derived`）を使用したリアクティブ状態管理
    - `eventLogs`, `deals`, `tasks`, `settings`, `operationLogs` の状態定義
    - `unreadCount`, `pendingTaskCount`, `threadGroups` の派生状態
    - CRUD操作関数：`addEventLog`, `updateEventLog`, `deleteEventLog`, `addDeal`, `updateDeal`, `addTask`, `updateTaskStatus`
    - `initializeFromStorage()` — localStorage から復元
    - `clearAllData()` — データリセット
    - 操作ログの自動記録ロジック
    - 自動マスキング→自動承認のパイプライン統合
    - localStorage への debounce保存（3秒以内）
    - _Requirements: 5.2, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.3, 7.4, 10.3, 10.4, 15.3, 16.2, 20.3, 22.1, 22.2, 22.6_

  - [x] 8.2 バリデーション・ステータス遷移ロジックの実装
    - 空白入力の拒否ロジック（議事録・メモ・追記・コメント・検索クエリ・却下理由・マスキングパターン・ドメイン）
    - タスクステータス遷移バリデーション（未着手→進行中→完了→未着手のみ許可）
    - 却下済みEvent_Logへの重複却下防止
    - 却下理由必須バリデーション
    - _Requirements: 4.3, 6.5, 7.2, 7.3, 9.4, 16.3, 16.4, 17.5, 21.5_

  - [x]* 8.3 プロパティテスト：空白文字入力の拒否
    - **Property 6: 空白文字入力の拒否**
    - `src/lib/intelligence/__tests__/validation.property.test.ts` を作成する
    - 空文字列・空白文字のみの入力で保存が実行されずデータ状態が変更されないことを検証する
    - **Validates: Requirements 4.3, 6.5, 7.2, 9.4, 17.5, 21.5**

  - [x]* 8.4 プロパティテスト：Badge件数の正確性
    - **Property 7: Badge件数の正確性**
    - `src/lib/intelligence/__tests__/store.property.test.ts` に追加する
    - Inbox Badgeが未読EventLog件数を正確に表示し、タスクBadgeが未完了Task件数を表示することを検証する
    - **Validates: Requirements 1.3, 2.4, 3.3, 15.3, 16.2, 23.2**

  - [x]* 8.5 プロパティテスト：ステータスに基づく表示制御
    - **Property 10: ステータスに基づく表示制御**
    - 同ファイルに追加する
    - 論理削除されたEventLogが一覧に表示されないこと、却下済みEventLogが集計対象外であることを検証する
    - **Validates: Requirements 6.3, 7.4**

  - [x]* 8.6 プロパティテスト：タスクステータス遷移の妥当性
    - **Property 11: タスクステータス遷移の妥当性**
    - 同ファイルに追加する
    - 有効な3パターンの遷移のみ成功し、それ以外が拒否されることを検証する
    - **Validates: Requirements 16.3, 16.4**

  - [x]* 8.7 プロパティテスト：フェーズ遷移履歴の記録
    - **Property 15: フェーズ遷移履歴の記録**
    - 同ファイルに追加する
    - フェーズ変更時に遷移元・遷移先・日時・操作者・変更種別が記録されること、却下時にフェーズが変更されないことを検証する
    - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 9. チェックポイント - ストア層の確認
  - 全てのプロパティテストが通ることを確認する。問題があればユーザーに確認する。

- [x] 10. ナビゲーション・レイアウト
  - [x] 10.1 Intelligenceレイアウトコンポーネントの実装
    - `src/routes/intelligence/+layout.svelte` にメインナビゲーションを実装する
    - ダッシュボード・インボックス・タスク・案件の4画面をナビゲーション項目として常時表示する
    - インボックスに未読Badge、タスクに未完了Badgeを表示する（件数0の場合は非表示）
    - 現在表示中のナビゲーション項目をアクティブ状態として視覚的に区別する
    - 管理者ロール（`settings.isAdmin`）の場合のみAdmin Panelナビゲーションを追加表示する
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 11. ダッシュボード画面
  - [x] 11.1 ダッシュボードページの実装
    - `src/routes/intelligence/+page.svelte` にダッシュボードを実装する
    - ProgressSummary: 全Dealのフェーズ別件数を表示する
    - UpcomingEvents: 現在〜24時間以内のカレンダーEvent_Logを開始日時昇順で表示する
    - UrgentTasks: 未完了かつ期限72時間以内のTask上位5件を期限昇順で表示する
    - Deal総件数・Phase別件数分布・Task完了率の集計表示
    - データが0件の場合は各セクションに「表示するデータがありません」メッセージを表示する
    - DealやTaskの更新時にリアクティブに画面を更新する
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 18.1_

  - [x]* 11.2 プロパティテスト：ダッシュボード時間窓フィルタリング
    - **Property 16: ダッシュボード時間窓フィルタリング**
    - `src/lib/intelligence/__tests__/filters.property.test.ts` を作成する
    - 表示される予定が24時間以内のもののみであること、タスクが未完了かつ72時間以内の上位5件であることを検証する
    - **Validates: Requirements 14.2, 14.3**

- [x] 12. インボックス画面
  - [x] 12.1 インボックス一覧・フィルタの実装
    - `src/routes/intelligence/inbox/+page.svelte` にインボックスを実装する
    - Event_Logの時系列降順一覧表示（デフォルトでThread_Group単位にグループ化）
    - 各項目にデータソース種別アイコン・タイトル先頭50文字・日時・承認ステータスを表示する
    - Thread_Groupにはスレッド内メッセージ件数と最新メッセージ日時を表示する
    - FilterBar: データソース種別（Slack・メール・カレンダー・議事録・メモ）での複数選択フィルタリング
    - スレッド表示/フラット表示の切替ボタン
    - 最大50件ずつ表示し、追加読み込み操作で次の50件を表示する
    - 表示対象0件の場合は「表示するEvent_Logがありません」メッセージ
    - _Requirements: 15.1, 15.2, 15.7, 15.8, 15.9, 25.4, 25.5_

  - [x] 12.2 インボックス詳細パネル・スレッドビューの実装
    - EventLogDetail: Event_Logの全フィールド表示（本文・日時・関連Deal・承認ステータス・コメント・マスキング状態）
    - 操作ボタン：追記・削除・コメント・手動マスキング・却下
    - ThreadView: スレッド内全メッセージを時系列昇順で会話形式表示（区切り線で分離）
    - Thread_Group展開/折りたたみ機能
    - Event_Log詳細表示時に既読フラグを設定する
    - _Requirements: 15.3, 15.4, 15.5, 15.6, 25.3, 25.8_

  - [x]* 12.3 プロパティテスト：ページネーション上限
    - **Property 18: ページネーション上限**
    - `src/lib/intelligence/__tests__/filters.property.test.ts` に追加する
    - 1ページの表示アイテム数が最大50件を超えないことを検証する
    - **Validates: Requirements 15.9, 20.5**

- [ ] 13. チェックポイント - ダッシュボード・インボックスの確認
  - 全てのテストが通り、画面表示が正常であることを確認する。問題があればユーザーに確認する。

- [x] 14. タスク画面
  - [x] 14.1 タスク管理画面の実装
    - `src/routes/intelligence/tasks/+page.svelte` にタスク画面を実装する
    - 全Taskをステータス別（未着手・進行中・完了）にグループ化し、各グループ内を期限昇順で表示する
    - 各TaskにTask名・関連Deal名・優先度・期限日を表示する
    - ステータス変更操作（有効遷移のみ許可、無効遷移時はエラーメッセージ表示）
    - Deal別・優先度別のフィルタリング機能
    - 期限昇順・優先度降順のソート機能
    - 期限超過Taskの視覚的区別（背景色変更）
    - AI提案Taskの承認/却下UI
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 10.3, 10.4, 13.4_

  - [x] 14.2 タスクリマインダー機能の実装
    - アプリ読み込み時に期限24時間以内の未完了Taskを検出し、リマインダーを画面上部に通知表示する
    - 60秒ごとに再チェックし、新たに対象となったTaskを追加表示する
    - dismissボタンで同一セッション中は再表示しない
    - 同時表示は最大10件（期限が近い順で上位10件、残件数インジケーター表示）
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 15. 案件画面
  - [x] 15.1 案件一覧・詳細画面の実装
    - `src/routes/intelligence/deals/+page.svelte` に案件画面を実装する
    - Deal一覧をDeal_Phase別にグループ化し、更新日時降順で表示する
    - Deal詳細：フェーズ・担当者・関連Event_Log・関連Task・サマリー表示
    - フェーズ遷移履歴をタイムライン形式で遷移日時降順表示する
    - Deal詳細画面での新規Event_Log入力・保存（空テキスト保存時エラー表示）
    - Deal詳細画面でのスレッド表示/フラット表示切替
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 25.6_

  - [x] 15.2 商談フェーズ管理機能の実装
    - フェーズ変更UI（8段階から任意のフェーズへ前方・後方遷移可能）
    - AI Engine からのフェーズ遷移提案の表示（現在フェーズ・提案先フェーズ・変更根拠）
    - ユーザーによる提案承認/却下操作
    - 手動フェーズ変更時のEvent_Log記録
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 15.3 AIサマリー・自動更新提案機能の実装
    - Deal詳細画面にサマリー生成ボタンを配置する
    - サマリー生成（EventLog 0件時はメッセージ表示、エラー時は既存サマリー保持）
    - 「更新あり」インジケーター表示ロジック
    - AI自動データ更新提案（対象Deal・変更フィールド・現在値・提案値・根拠Event_Log）の表示
    - ユーザーによる自動更新提案の承認/却下操作
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4_

- [x] 16. データ編集・却下機能の統合
  - [x] 16.1 議事録・メモ入力フォームの実装
    - インボックスまたはDeal詳細から議事録（最大10,000文字）・メモ（最大5,000文字）を入力可能にする
    - 保存時にAI Engineによるタスク自動生成トリガー
    - 保存完了通知とフォームリセット
    - 空白入力時のエラーメッセージ表示
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 16.2 データ編集操作（追記・削除・コメント・却下）の実装
    - 追記機能（最大1000文字）
    - 論理削除機能（確認ダイアログ付き）
    - コメント追加機能（最大500文字）
    - 却下機能（理由必須・重複却下防止・却下済ラベル表示）
    - 各操作の空白入力バリデーション
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4_

- [x] 17. チェックポイント - 主要画面の確認
  - 全てのテストが通り、タスク・案件・データ編集機能が正常に動作することを確認する。問題があればユーザーに確認する。

- [x] 18. 検索・フィルタリング機能
  - [x] 18.1 AI検索機能の実装
    - インボックスまたはヘッダーに検索入力欄を配置する
    - AI Engineの模擬検索を呼び出し、結果（情報ソース種別・タイトル/本文抜粋・関連度スコア）を関連度スコア降順で表示する
    - 結果0件時のメッセージ表示
    - 空クエリ時の入力促進メッセージ表示
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 18.2 複合フィルタリング機能の実装
    - Event_Logを期間（開始日・終了日）・データソース種別・Deal・キーワード（本文部分一致）で複合フィルタリング可能にする
    - 複数条件はAND条件として適用する
    - ページリロードなしでリアクティブにデータを再描画する
    - フィルタ結果0件時の「該当するデータがありません」メッセージ表示
    - _Requirements: 18.2, 18.3, 18.4_

  - [x]* 18.3 プロパティテスト：複合フィルタリングのAND結合
    - **Property 17: 複合フィルタリングのAND結合**
    - `src/lib/intelligence/__tests__/filters.property.test.ts` に追加する
    - 表示される全EventLogがすべてのアクティブなフィルタ条件を同時に満たすことを検証する
    - **Validates: Requirements 18.2**

- [ ] 19. 振り返り機能
  - [ ] 19.1 振り返り画面の実装
    - Deal詳細またはダッシュボードに振り返り機能を追加する
    - 期間指定（開始日・終了日）による活動集約表示（Event_Log件数・Task完了/未完了件数・フェーズ変更履歴）
    - AI Engineによる活動パターンと改善提案（1〜3件）の表示
    - データ不在時のメッセージ表示
    - _Requirements: 19.1, 19.2, 19.3_

- [ ] 20. 管理者画面
  - [ ] 20.1 管理者ルール設定画面の実装
    - `src/routes/intelligence/admin/+page.svelte` に管理者機能を実装する
    - 自動マスキングルール設定（パターン・マスク方法・有効/無効フラグ）
    - メールドメインルール設定（許可ドメインリスト、最大50件、各最大253文字）
    - 案件担当者ルール設定（キーワード/ドメイン → 担当者割当）
    - 空パターン/空ドメイン時のバリデーションエラー表示
    - 保存完了メッセージ表示
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

  - [ ] 20.2 管理者操作ログ画面の実装
    - 操作ログ一覧（操作種別・日時・ユーザー・対象データ種別）を時系列降順で表示する
    - 初期表示最大50件、ページネーションまたは追加読み込みで50件超を表示可能にする
    - 期間・操作種別でフィルタリング可能にする
    - フィルタ結果0件時の「該当する操作ログはありません」メッセージ表示
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 21. チェックポイント - 全画面統合確認
  - 全てのテストが通ることを確認する。検索・フィルタ・振り返り・管理者画面が正常に動作することを確認する。問題があればユーザーに確認する。

- [ ] 22. 最終統合・仕上げ
  - [ ] 22.1 全体統合テスト・エッジケース対応
    - localStorage容量超過時の警告表示とデータ削除候補提示
    - localStorage利用不可時の警告メッセージとメモリのみ動作
    - データ破損時の空初期状態起動
    - localStorage全クリア操作（確認ダイアログ付き）
    - 全画面間のナビゲーション遷移確認
    - Badge件数のリアクティブ更新確認
    - _Requirements: 22.3, 22.4, 22.5, 22.6, 23.2_

  - [ ]* 22.2 ユニットテスト作成
    - `src/lib/intelligence/__tests__/` 配下にUIインタラクションのユニットテストを作成する
    - 空状態の表示メッセージ、リマインダーのdismiss動作、AI提案の承認/却下フロー等をテストする
    - _Requirements: 14.5, 15.8_

- [ ] 23. 最終チェックポイント - 全テスト通過確認
  - 全てのプロパティテスト・ユニットテストが通ることを確認する。`bun run check` が正常に完了することを確認する。問題があればユーザーに確認する。

## Notes

- タスクに `*` マークが付いたサブタスクはオプション（スキップ可能）
- 各タスクは特定のRequirementsを参照しトレーサビリティを確保
- チェックポイントタスクで段階的に品質を担保
- プロパティテストはdesignドキュメントの18のCorrectness Propertiesに基づく
- ユニットテストは具体的なUIインタラクションとエッジケースを検証する
- 全コードはTypeScript + Svelte 5 runes + SvelteKitで実装する
- データ永続化はlocalStorageのみ、外部API呼び出しは一切行わない

## Task Dependency Graph

```json
{
	"waves": [
		{ "id": 0, "tasks": ["1.1", "1.2"] },
		{ "id": 1, "tasks": ["1.3", "2.1"] },
		{ "id": 2, "tasks": ["2.2", "3.1", "4.1", "5.1"] },
		{ "id": 3, "tasks": ["3.2", "4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "7.1"] },
		{ "id": 4, "tasks": ["7.2", "7.3", "8.1"] },
		{ "id": 5, "tasks": ["8.2"] },
		{ "id": 6, "tasks": ["8.3", "8.4", "8.5", "8.6", "8.7"] },
		{ "id": 7, "tasks": ["10.1"] },
		{ "id": 8, "tasks": ["11.1", "12.1", "14.1"] },
		{ "id": 9, "tasks": ["11.2", "12.2", "12.3", "14.2", "15.1"] },
		{ "id": 10, "tasks": ["15.2", "15.3", "16.1", "16.2"] },
		{ "id": 11, "tasks": ["18.1", "18.2", "19.1", "20.1", "20.2"] },
		{ "id": 12, "tasks": ["18.3", "22.1"] },
		{ "id": 13, "tasks": ["22.2"] }
	]
}
```
