# Requirements Document

## Introduction

「Sales Intelligence」は、営業現場の負担ゼロで営業活動のあらゆる情報を自動集約・資産化するフロントエンド機能である。本ドキュメントはモックアップ（プロトタイプ）の要件を定義するものであり、外部連携・AI応答はすべてシミュレーションで実現する。モックアップはGitHub Pagesで動作させることを前提とし、サーバーサイド処理を持たない静的フロントエンドとして実装する。Slack・メール・カレンダーのデータはアプリ起動時にシードデータとして事前に存在する前提とし、議事録・メモの直接入力、AIによるタスク生成・サマリー・検索、および管理者向けルール設定を提供する。Slack・メールはスレッド表示に対応し、会話の流れを一覧で把握できる。データの承認フローは簡素化されており、マスキング処理の完了をもって自動的に承認済みとなる（マスキング完了＝自動承認）。不要データの却下機能は手動で利用可能。全データはlocalStorageに保存する。

## Glossary

- **System**: Sales Intelligenceアプリケーション全体
- **Inbox**: 営業活動のコンテキストを時系列で表示し、データ編集を行う画面
- **Event_Log**: Slack・メール・カレンダー・議事録・メモから取り込まれた営業活動の記録単位
- **Deal**: 案件。商談フェーズを持ち、関連するEvent_Logが紐づく
- **Deal_Phase**: 商談の進捗段階（見極め〜受注成約完了の8段階）
- **Task**: AIまたはユーザーが生成する行動項目
- **AI_Engine**: AI応答をシミュレーションするモジュール（実際のAIは使用しない）
- **Data_Source**: 外部データ（Slack、メール、カレンダー）のシードデータを提供するモジュール。アプリ起動時にサンプルデータをlocalStorageへ投入する
- **Masking_Engine**: 個人情報・機密情報を自動または手動でマスキングするモジュール
- **Admin_Panel**: 管理者向けのルール設定・ログ閲覧画面
- **Dashboard**: 進捗・予定・タスクを俯瞰するホーム画面
- **Badge**: 新着（未読）件数を視覚的に示すUI要素
- **Thread**: 同一会話に属するメッセージ群。SlackではスレッドID（thread_ts）、メールではIn-Reply-To/Referencesヘッダーにより関連付けられる
- **Thread_Group**: スレッドに属するメッセージをグループ化した表示単位。親メッセージと全リプライを含む
- **Seed_Data**: アプリ起動時にlocalStorageへ自動投入されるサンプルデータ。Slack・メール・カレンダーの模擬データを含み、スレッド構造を持つデータも含む
- **Thread_View**: スレッド内の全メッセージを会話形式で時系列順に表示するUIモード

## Requirements

### Requirement 1: イベントログ取り込み（Slack）

**User Story:** 営業担当者として、Slackの営業関連メッセージが事前にシステムに取り込まれていてほしい。手動コピーの手間を省き、起動直後から営業情報を確認するためである。

#### Acceptance Criteria

1. WHEN アプリケーションが初回起動した場合、THE Data_Source SHALL Slackシードデータ（スタンプトリガー付きメッセージ5件以上、うちスレッド構造を持つメッセージ群を2スレッド以上含む）をデータソース種別「Slack」としてlocalStorageに投入する
2. THE System SHALL 各Slack Event_Logに送信者名・チャンネル名・メッセージ本文（最大4000文字）・タイムスタンプ（ISO 8601形式）・データソース種別・スレッドID（thread_ts、スレッドに属する場合）を保持する
3. WHEN アプリケーションが起動した場合、THE Inbox SHALL Slack Event_Logの件数をBadgeに反映する
4. IF localStorageに既にSlackシードデータが存在する状態でアプリケーションが起動した場合、THEN THE Data_Source SHALL シードデータの再投入を行わず既存データを保持する

### Requirement 2: イベントログ取り込み（メール）

**User Story:** 営業担当者として、顧客ドメインのメールが事前にシステムに取り込まれていてほしい。起動直後から顧客とのやり取りを確認するためである。

#### Acceptance Criteria

1. WHEN アプリケーションが初回起動した場合、THE Data_Source SHALL メールシードデータ（許可ドメインに一致するメール10件以上、うちスレッド構造を持つメール群を2スレッド以上含む）をデータソース種別「メール」としてlocalStorageに投入する
2. THE System SHALL 各メールEvent_Logに送信者メールアドレス・受信者メールアドレス・件名（最大200文字）・本文（最大10000文字）・送受信日時・Message-ID・In-Reply-To・Referencesを保持する
3. IF メールドメインが管理者設定の許可ドメインリストに一致しない場合、THEN THE System SHALL そのメールをEvent_Logとして取り込まず、取り込み結果に除外件数を表示する
4. WHEN アプリケーションが起動した場合、THE Inbox SHALL メールEvent_Logの件数をBadgeに反映する
5. IF localStorageに既にメールシードデータが存在する状態でアプリケーションが起動した場合、THEN THE Data_Source SHALL シードデータの再投入を行わず既存データを保持する

### Requirement 3: イベントログ取り込み（カレンダー）

**User Story:** 営業担当者として、カレンダーの予定が事前にシステムに取り込まれていてほしい。起動直後から商談スケジュールを確認するためである。

#### Acceptance Criteria

1. WHEN アプリケーションが初回起動した場合、THE Data_Source SHALL カレンダーシードデータ（イベント5件以上10件以下、うち当日〜3日以内の予定を2件以上含む）をデータソース種別「カレンダー」としてlocalStorageに投入する
2. THE System SHALL 各カレンダーEvent_Logにイベント名・開始日時・終了日時・参加者（0名以上）・場所（任意）を保持する
3. WHEN アプリケーションが起動した場合、THE Inbox SHALL カレンダーEvent_Logの件数をBadgeに反映する
4. IF localStorageに既にカレンダーシードデータが存在する状態でアプリケーションが起動した場合、THEN THE Data_Source SHALL シードデータの再投入を行わず既存データを保持する

### Requirement 4: 議事録・メモの直接入力

**User Story:** 営業担当者として、口頭の会話や気付きをすぐに記録したい。情報の散逸を防ぐためである。

#### Acceptance Criteria

1. WHEN ユーザーが議事録入力フォームに内容を入力し保存した場合、THE System SHALL 入力テキスト（最大10,000文字）・入力日時・関連Deal（任意）・データソース種別「議事録」をEvent_LogとしてlocalStorageに保存する
2. WHEN ユーザーがメモ入力フォームに内容を入力し保存した場合、THE System SHALL 入力テキスト（最大5,000文字）・入力日時・関連Deal（任意）・データソース種別「メモ」をEvent_LogとしてlocalStorageに保存する
3. IF 入力テキストが空または空白文字のみの状態で保存が試行された場合、THEN THE System SHALL 入力テキストが必須であることを示すエラーメッセージをフォーム上に表示し、保存を実行しない
4. WHEN Event_Logの保存が完了した場合、THE System SHALL 保存完了を示す通知をユーザーに表示し、入力フォームを初期状態にリセットする

### Requirement 5: データ編集（マスキング）と自動承認

**User Story:** 営業担当者として、機密情報を適切にマスキングしたい。情報セキュリティを確保しつつ、マスキング完了後は自動的にデータを承認済としたい。承認の手間を省き運用を簡素化するためである。

#### Acceptance Criteria

1. WHEN Event_Logが保存された場合、THE Masking_Engine SHALL 管理者が設定したルール（正規表現パターン）に基づき該当箇所を「●」文字で自動マスキングし、元のテキストをマスキング前データとして保持する
2. WHEN 自動マスキング処理が完了した場合、THE System SHALL 当該Event_Logのステータスを自動的に「承認済」に変更し、承認種別「自動承認（マスキング完了）」・承認日時を記録する
3. WHEN ユーザーがEvent_Log内のテキストを選択し手動マスキングを指示した場合、THE Masking_Engine SHALL 選択範囲を「●」文字で置換し、元のテキストをマスキング前データとして保持する
4. WHEN 手動マスキング処理が完了した場合、THE System SHALL 当該Event_Logのステータスを自動的に「承認済」に変更し、承認種別「自動承認（手動マスキング完了）」・承認日時を記録する
5. IF マスキングルールが未設定の状態でEvent_Logが保存された場合、THEN THE System SHALL 自動マスキングを実行せず、Event_Logのステータスを即座に「承認済」に変更し、承認種別「自動承認（マスキング不要）」・承認日時を記録する
6. WHEN 管理者がマスキング復元を実行した場合、THE Masking_Engine SHALL マスキング前データから元のテキストを復元し表示する。承認ステータスは「承認済」のまま維持する

### Requirement 6: データ編集（追記・削除・コメント）

**User Story:** 営業担当者として、取り込んだデータに追記やコメントを付けたい。情報の文脈を補完するためである。

#### Acceptance Criteria

1. WHEN ユーザーがEvent_Logに追記を行った場合、THE System SHALL 追記内容（最大1000文字）・追記者・追記日時を元のEvent_Logに関連付けてlocalStorageに保存する
2. WHEN ユーザーがEvent_Logの削除を実行した場合、THE System SHALL 確認ダイアログを表示し、ユーザーが確認した後に該当Event_Logを論理削除する
3. WHEN Event_Logが論理削除された場合、THE System SHALL 該当Event_LogをInbox・検索結果・Deal詳細画面のいずれにも表示しない
4. WHEN ユーザーがEvent_Logにコメントを追加した場合、THE System SHALL コメント内容（最大500文字）・投稿者・投稿日時をEvent_Logに関連付けてlocalStorageに保存する
5. IF 追記またはコメントの入力内容が空の状態で保存が試行された場合、THEN THE System SHALL エラーメッセージを表示し保存を実行しない

### Requirement 7: データ却下

**User Story:** 営業担当者として、不要なデータを除外したい。情報の品質を担保し、関連性のないデータを営業活動の記録から排除するためである。

#### Acceptance Criteria

1. WHEN ユーザーがステータスが「承認済」のEvent_Logを却下した場合、THE System SHALL ステータスを「却下済」に変更し、却下者・却下日時・却下理由をEvent_Logに記録する
2. IF 却下理由が未入力（空文字）の状態で却下が試行された場合、THEN THE System SHALL エラーメッセージを表示し却下を実行しない
3. IF ステータスが「却下済」のEvent_Logに対して却下が試行された場合、THEN THE System SHALL 操作を受け付けず、既に却下済みである旨を表示する
4. WHEN Event_Logが却下された場合、THE System SHALL 該当Event_LogをInbox・検索結果・Deal詳細画面において「却下済」ラベルを付与して表示し、集計対象から除外する

### Requirement 8: 商談フェーズ管理

**User Story:** 営業担当者として、案件の商談フェーズを管理したい。進捗状況を正確に把握するためである。

#### Acceptance Criteria

1. THE System SHALL 商談フェーズとして「商談の見極め」「課題の特定」「メリットの訴求」「意思決定者の賛同」「リスクの排除」「契約合意」「事務処理」「受注成約完了」の8段階をこの順序で定義し、ユーザーは任意のフェーズへ前方・後方ともに遷移可能とする
2. WHEN AI_Engineがフェーズ変更を検出した場合、THE System SHALL 現在のフェーズ名・提案先フェーズ名・変更根拠テキストを含むフェーズ遷移提案を画面上に通知表示する
3. WHEN ユーザーがフェーズ遷移提案を承認した場合、THE System SHALL DealのDeal_Phaseを提案先フェーズに更新し、遷移元フェーズ・遷移先フェーズ・遷移日時・操作者・変更種別（AI提案承認）をEvent_Logとして記録する
4. WHEN ユーザーが手動でフェーズを変更した場合、THE System SHALL DealのDeal_Phaseを選択されたフェーズに更新し、遷移元フェーズ・遷移先フェーズ・遷移日時・操作者・変更種別（手動変更）をEvent_Logとして記録する
5. WHEN ユーザーがフェーズ遷移提案を却下した場合、THE System SHALL Deal_Phaseを変更せず、提案を通知一覧から除去する

### Requirement 9: AI検索・RAG

**User Story:** 営業担当者として、蓄積された営業情報を自然言語で検索したい。必要な情報に素早くアクセスするためである。

#### Acceptance Criteria

1. WHEN ユーザーが検索クエリを入力した場合、THE AI_Engine SHALL 関連するEvent_Log・Deal・Taskを模擬検索結果として関連度スコア降順で最大20件返却する
2. WHEN 検索結果が表示された場合、THE System SHALL 各結果について情報ソース種別（Event_Log・Deal・Task）、タイトルまたは本文抜粋、および0から100の整数で表現される関連度スコアを表示する
3. IF 検索クエリに一致する結果がない場合、THEN THE System SHALL 「該当する情報が見つかりません」メッセージを表示する
4. IF 検索クエリが空または空白文字のみの場合、THEN THE System SHALL 検索を実行せず、入力を促すメッセージを表示する

### Requirement 10: AIタスク生成・行動提案

**User Story:** 営業担当者として、次にやるべきことをAIに提案してほしい。行動の抜け漏れを防ぐためである。

#### Acceptance Criteria

1. WHEN 新しいEvent_Logが保存された場合、THE AI_Engine SHALL Event_Logの内容に基づきTaskを1件以上3件以下の範囲で模擬生成する
2. WHEN AI_EngineがTaskを生成した場合、THE System SHALL Task内容（テキスト）・期限（日時）・優先度（高・中・低の3段階）・関連Dealをユーザーに提示する
3. WHEN ユーザーが提案されたTaskを承認した場合、THE System SHALL Taskをステータス「未着手」でアクティブなタスクリストに追加する
4. WHEN ユーザーが提案されたTaskを却下した場合、THE System SHALL Taskを破棄し、却下日時とともに提案履歴に記録する
5. IF Event_LogにDealが紐づいていない場合、THEN THE AI_Engine SHALL 関連Dealを空としたTaskを生成する

### Requirement 11: AIサマリー生成

**User Story:** 営業担当者として、案件の要約を自動生成してほしい。情報を素早く把握するためである。

#### Acceptance Criteria

1. WHEN ユーザーがDealのサマリー生成を要求した場合、THE AI_Engine SHALL 当該Dealに紐づく全Event_Logを集約し、最大500文字の模擬サマリーテキストを生成する
2. WHEN サマリーが生成された場合、THE System SHALL サマリーテキスト・生成日時・対象Event_Logの最古日時から最新日時までの期間をDealに関連付けてlocalStorageに保存する
3. WHEN 新しいEvent_LogがDealに追加された場合、THE System SHALL 当該Dealの最新サマリーの生成日時以降にEvent_Logが追加されていれば「更新あり」のインジケーターをサマリー表示欄に表示する
4. IF サマリー生成要求時にDealに紐づくEvent_Logが0件の場合、THEN THE System SHALL サマリーを生成せず、Event_Logが存在しない旨のメッセージを表示する
5. IF サマリー生成処理中にエラーが発生した場合、THEN THE System SHALL 生成失敗を示すメッセージを表示し、既存のサマリーデータを保持する

### Requirement 12: AI自動データ更新

**User Story:** 営業担当者として、AIが自動でデータを更新・整理してほしい。手動更新の負担を減らすためである。

#### Acceptance Criteria

1. WHEN AI_EngineがEvent_Logの内容からDealデータの更新根拠（フェーズ変更・担当者変更・関連情報の追加）を検出した場合、THE System SHALL 更新提案（対象Deal・変更対象フィールド・現在値・提案値・根拠となるEvent_Logの参照）をInbox上に通知として表示する
2. WHEN ユーザーが自動更新提案を承認した場合、THE System SHALL 提案内容に基づきDealデータを更新し、更新内容・承認者・承認日時・根拠Event_Log参照を更新履歴としてEvent_Logに記録する
3. WHEN ユーザーが自動更新提案を却下した場合、THE System SHALL 提案を破棄し、却下者・却下日時・提案内容を却下履歴に記録する
4. IF 同一Dealに対して未処理の自動更新提案が既に存在する状態で新たな提案が生成された場合、THEN THE System SHALL 新たな提案を既存提案とは別に追加表示し、それぞれ個別に承認・却下可能とする

### Requirement 13: タスクリマインダー

**User Story:** 営業担当者として、期限が近いタスクのリマインダーがほしい。対応漏れを防ぐためである。

#### Acceptance Criteria

1. WHEN アプリケーションが読み込まれた場合、THE System SHALL 未完了かつ期限が現在時刻から24時間以内のTaskを検出し、該当TaskごとにTask名・期限日時・関連Deal名を含むリマインダーを画面上部に通知表示する
2. WHILE 画面が表示されている状態で、THE System SHALL 60秒ごとにTaskの期限を再チェックし、新たに24時間以内となったTaskのリマインダーを追加表示する
3. WHEN ユーザーがリマインダーのdismissボタンをクリックした場合、THE System SHALL 該当リマインダーの表示を消し、同一Taskのリマインダーを同一ブラウザセッション中は再表示しない
4. THE System SHALL 未完了かつ期限超過（現在時刻が期限日時を過ぎた状態）のTaskをタスク画面の一覧において背景色の変更により他のTaskと視覚的に区別して表示する
5. IF 同時に表示対象となるリマインダーが10件を超える場合、THEN THE System SHALL 期限が近い順に上位10件を表示し、残件数を示すインジケーターを表示する

### Requirement 14: ホーム画面（ダッシュボード）

**User Story:** 営業担当者として、一目で今日の状況を把握したい。優先行動を素早く判断するためである。

#### Acceptance Criteria

1. THE Dashboard SHALL 全Dealのフェーズ別件数を進捗サマリーとして表示する
2. THE Dashboard SHALL 現在時刻から24時間先までの予定をカレンダーEvent_Logから抽出し、開始日時の昇順でイベント名・開始日時・場所を表示する
3. THE Dashboard SHALL 未完了かつ期限が現在時刻から72時間以内のTask上位5件を期限昇順で表示し、各TaskにTask名・期限日時・優先度・関連Deal名を表示する。該当Taskが5件未満の場合は存在する件数のみ表示する
4. WHEN DealまたはTaskのデータが更新された場合、THE Dashboard SHALL 表示内容をリアクティブに更新する
5. IF 表示対象の予定・Task・Dealがいずれも0件の場合、THEN THE System SHALL 各セクションに「表示するデータがありません」のメッセージを表示する

### Requirement 15: インボックス画面

**User Story:** 営業担当者として、営業活動の全コンテキストを時系列で確認したい。情報の全体像を把握するためである。

#### Acceptance Criteria

1. THE Inbox SHALL 全Event_Logを時系列降順で一覧表示し、各項目にデータソース種別アイコン・タイトルまたは本文先頭50文字・日時・承認ステータスを表示する。Slack・メールについてはデフォルトでThread_Group単位にグループ化し、一覧にはスレッドの最新メッセージ日時・スレッド内メッセージ件数を表示する
2. THE Inbox SHALL データソース種別（Slack・メール・カレンダー・議事録・メモ）で複数選択可能なフィルタリングを提供し、選択された種別に該当するEvent_Logのみを表示する
3. THE Inbox SHALL 新着（未読）Event_Logの件数をナビゲーションのBadgeに数値で表示する。Event_Logはユーザーが詳細パネルで表示した時点で「既読」とする
4. WHEN ユーザーがEvent_Logを選択した場合、THE Inbox SHALL 詳細パネルにEvent_Logの全フィールド（データソース種別・本文・日時・関連Deal・承認ステータス・コメント一覧・マスキング状態）を表示し、追記・削除・コメント・マスキング・却下の操作ボタンを提供する
5. WHEN ユーザーがThread_Groupを選択した場合、THE Inbox SHALL 詳細パネルにThread_Viewを表示し、スレッド内の全メッセージを会話形式で時系列昇順に表示する
6. WHEN ユーザーが一覧上のThread_Groupの展開ボタンをクリックした場合、THE Inbox SHALL 当該スレッド内の全メッセージをインラインで展開表示し、再度クリックした場合は折りたたんで代表1行表示に戻す
7. THE Inbox SHALL スレッド表示（Thread_Group単位）とフラット表示（個別メッセージ単位）を切り替える表示切替ボタンを提供する
8. IF 表示対象のEvent_Logが0件の場合、THEN THE Inbox SHALL 一覧エリアに「表示するEvent_Logがありません」のメッセージを表示する
9. THE Inbox SHALL 一覧表示を最大50件ずつ表示し、50件を超える場合は追加読み込み操作により次の50件を表示する

### Requirement 16: タスク画面

**User Story:** 営業担当者として、全タスクを一覧で管理したい。抜け漏れなく業務を遂行するためである。

#### Acceptance Criteria

1. THE System SHALL 全Taskをステータス別（未着手・進行中・完了）にグループ化し、各グループ内を期限昇順（期限が早いものが上）で一覧表示する。各Taskはタスク名・関連Deal名・優先度・期限日を表示する
2. THE System SHALL 未完了Task（ステータスが「未着手」または「進行中」のTask）の合計件数をナビゲーションのBadgeに表示する
3. WHEN ユーザーがTaskのステータスを変更した場合、THE System SHALL ステータスおよび変更日時をlocalStorageに保存し、画面表示を即時更新する。有効な遷移は「未着手→進行中」「進行中→完了」「完了→未着手」とする
4. IF ユーザーが無効なステータス遷移を試行した場合、THEN THE System SHALL 変更を実行せず、無効な遷移である旨のエラーメッセージを表示する
5. THE System SHALL TaskをDeal別・優先度別でフィルタリング可能にし、期限昇順・優先度降順でソート可能にする。Dealが未設定のTaskはDeal別フィルタで「未割当」として選択可能とし、期限が未設定のTaskは期限順ソートで末尾に表示する

### Requirement 17: 案件画面

**User Story:** 営業担当者として、案件に関する全情報を集約して見たい。商談に必要な情報を一箇所で確認するためである。

#### Acceptance Criteria

1. THE System SHALL Deal一覧をDeal_Phase別にグループ化し、各グループ内のDealを更新日時の降順で表示する
2. WHEN ユーザーがDealを選択した場合、THE System SHALL Deal詳細（フェーズ・担当者・関連Event_Log・関連Task・サマリー）を表示する
3. THE System SHALL Deal詳細画面にフェーズ遷移履歴を遷移日時の降順（新しい遷移が上）でタイムライン形式で表示する
4. WHEN ユーザーがDeal詳細画面で新規Event_Log入力を行い保存した場合、THE System SHALL 入力内容・入力日時を該当Dealに紐づけてEvent_Logとして保存する
5. IF Deal詳細画面で新規Event_Log入力のテキストが空の状態で保存が試行された場合、THEN THE System SHALL エラーメッセージを表示し保存を実行しない

### Requirement 18: データ集計・フィルタリング

**User Story:** 営業担当者として、蓄積データを集計・フィルタリングしたい。傾向分析や振り返りに活用するためである。

#### Acceptance Criteria

1. THE Dashboard SHALL Deal総件数・Deal_Phase別件数分布・Task完了率（完了Task数 ÷ 全Task数 × 100、小数第1位まで）を数値で集計表示する
2. THE System SHALL Event_Logを期間（開始日・終了日）・データソース種別（Slack・メール・カレンダー・議事録・メモ）・Deal・キーワード（本文の部分一致）で複合フィルタリング可能にし、複数条件はAND条件として適用する
3. WHEN フィルタ条件が変更された場合、THE System SHALL ページリロードなしで表示データを再描画する
4. IF フィルタ条件に一致するEvent_Logが0件の場合、THEN THE System SHALL 「該当するデータがありません」旨のメッセージを表示する

### Requirement 19: 振り返り機能

**User Story:** 営業担当者として、過去の営業活動を振り返りたい。改善点を見つけ次の商談に活かすためである。

#### Acceptance Criteria

1. WHEN ユーザーが振り返り期間（開始日・終了日）を指定した場合、THE System SHALL 指定期間内のEvent_Log件数・Task完了件数と未完了件数・Deal_Phaseの変更履歴一覧を集約表示する
2. WHEN 振り返りデータが表示された場合、THE AI_Engine SHALL 活動パターン（期間内のEvent_Log種別ごとの件数分布）と改善提案を1件以上3件以内で模擬生成して表示する
3. IF 指定期間内にEvent_Log・Task・フェーズ変更履歴がいずれも存在しない場合、THEN THE System SHALL データが存在しない旨のメッセージを表示し、AI改善提案の生成を行わない

### Requirement 20: 管理者画面（アプリ利用ログ）

**User Story:** 管理者として、ユーザーのアプリ利用状況を確認したい。運用状況を把握するためである。

#### Acceptance Criteria

1. WHEN 管理者がAdmin_Panelにアクセスした場合、THE System SHALL ユーザー操作ログ（操作種別・操作日時・操作ユーザー・対象データ種別）を時系列降順で一覧表示し、初期表示件数を最大50件とする
2. THE Admin_Panel SHALL 操作ログを期間（開始日〜終了日）および操作種別（Event_Log作成・編集・削除・承認・却下、Deal更新、Task作成・完了・削除、マスキング実行・復元）でフィルタリング可能にする
3. WHEN ユーザーがEvent_Log・Deal・Taskに対して作成・更新・削除・承認・却下のいずれかの操作を行った場合、THE System SHALL 操作種別・操作日時・操作ユーザー・対象データIDを操作ログとしてlocalStorageに記録する
4. IF フィルタ条件に一致する操作ログが存在しない場合、THEN THE Admin_Panel SHALL 「該当する操作ログはありません」のメッセージを表示する
5. WHEN 操作ログが50件を超える場合、THE Admin_Panel SHALL ページネーションまたは「さらに読み込む」操作で追加のログを表示可能にする

### Requirement 21: 管理者画面（ルール設定）

**User Story:** 管理者として、自動マスキングやメールドメインのルールを設定したい。データ取り込みの精度とセキュリティを管理するためである。

#### Acceptance Criteria

1. WHEN 管理者が自動マスキングルールを設定した場合、THE Admin_Panel SHALL ルール（対象パターン（正規表現または文字列）・マスク方法（全文字置換・部分置換・先頭末尾残し）・有効/無効フラグ）をlocalStorageに保存する
2. WHEN 管理者がメールドメインルールを設定した場合、THE Admin_Panel SHALL 許可ドメインリスト（最大50件、各ドメイン最大253文字）をlocalStorageに保存する
3. WHEN 管理者が案件担当者ルールを設定した場合、THE Admin_Panel SHALL 担当者割当ルール（条件となるキーワードまたはドメイン・割当先担当者名）をlocalStorageに保存する
4. WHEN ルールが保存された場合、THE System SHALL 次回のデータ取り込み実行時から新ルールを適用する
5. IF マスキングルールの対象パターンが空、またはメールドメインが空の状態で保存が試行された場合、THEN THE Admin_Panel SHALL エラーメッセージを表示し保存を実行しない
6. WHEN ルールの保存が正常に完了した場合、THE Admin_Panel SHALL 保存完了を示すメッセージを画面に表示する

### Requirement 22: データ永続化

**User Story:** ユーザーとして、入力したデータがブラウザを閉じても保持されてほしい。作業の継続性を確保するためである。

#### Acceptance Criteria

1. WHEN Event_Log・Deal・Task・設定データに変更が発生した場合、THE System SHALL 変更後のデータを3秒以内にlocalStorageへ保存する
2. WHEN アプリケーションが読み込まれた場合、THE System SHALL localStorageから全Event_Log・Deal・Task・設定データをデシリアライズし、各画面に復元して表示する
3. IF localStorageの容量上限に達した場合、THEN THE System SHALL 保存失敗を示す警告メッセージを表示し、作成日時が最も古いEvent_Logの一覧を削除候補として提示する
4. IF localStorageのデータが破損または解析不能な場合、THEN THE System SHALL データ破損を示すエラーメッセージを表示し、該当データを空の初期状態で起動する
5. IF localStorageが利用不可能な場合、THEN THE System SHALL データ保存が無効である旨の警告メッセージを表示し、メモリ上でのみ動作を継続する
6. WHEN ユーザーがlocalStorageクリア操作を実行した場合、THE System SHALL 確認ダイアログを表示し、ユーザーが確認した後に全Event_Log・Deal・Task・設定データをlocalStorageから削除してアプリケーションを初期状態にリセットする。本操作はモックアップのデータリセット用途を主目的とする

### Requirement 23: ナビゲーション構造

**User Story:** ユーザーとして、各画面にスムーズに遷移したい。目的の情報に素早くアクセスするためである。

#### Acceptance Criteria

1. THE System SHALL ダッシュボード（ホーム）・インボックス・タスク・案件の4画面をメインナビゲーションとして常時表示する
2. THE System SHALL インボックスのナビゲーション項目に新着（未読）Event_Log件数、タスクのナビゲーション項目に未完了Task件数をBadgeとして表示し、件数が0の場合はBadgeを非表示にする
3. THE System SHALL 現在表示中の画面に対応するナビゲーション項目を視覚的にアクティブ状態として区別する
4. IF 管理者ロールのユーザーがログインしている場合、THEN THE System SHALL Admin_Panelへのナビゲーション項目をメインナビゲーションに追加表示する
5. IF 管理者ロールでないユーザーがログインしている場合、THEN THE System SHALL Admin_Panelへのナビゲーション項目を表示しない

### Requirement 24: Event_Logデータモデルのシリアライズ・デシリアライズ

**User Story:** 開発者として、Event_LogデータをlocalStorageに正確に保存・復元したい。データの整合性を保証するためである。

#### Acceptance Criteria

1. THE System SHALL Event_Logオブジェクトの全フィールド（日時フィールドはISO 8601文字列として）をJSON文字列にシリアライズしてlocalStorageに保存する
2. WHEN localStorageからデータを読み込む場合、THE System SHALL JSON文字列をEvent_Logオブジェクトにデシリアライズし、ISO 8601文字列の日時フィールドをDateオブジェクトに復元する
3. THE System SHALL シリアライズしてからデシリアライズしたEvent_Logオブジェクトが、元のオブジェクトと全フィールドの値において一致することを保証する（ラウンドトリップ等価性）
4. IF localStorageから読み込んだJSON文字列のパースに失敗した場合、THEN THE System SHALL 該当データを破棄し空の配列として初期化し、エラーメッセージをコンソールに出力する

### Requirement 25: スレッド表示

**User Story:** 営業担当者として、Slackやメールのメッセージをスレッド（会話の流れ）単位で表示したい。断片的なメッセージを個別に読む手間を省き、会話全体を素早く把握するためである。

#### Acceptance Criteria

1. WHEN 同一thread_tsを持つ複数のSlack Event_Logが存在する場合、THE System SHALL 該当メッセージをThread_Groupとしてグループ化し、親メッセージの日時をスレッドの代表日時として扱う
2. WHEN 同一のIn-Reply-ToまたはReferencesヘッダーで関連付けられた複数のメールEvent_Logが存在する場合、THE System SHALL 該当メールをThread_Groupとしてグループ化し、最初のメールの送受信日時をスレッドの代表日時として扱う
3. WHEN ユーザーがInboxまたはDeal詳細画面でThread_Groupを選択した場合、THE System SHALL Thread_View（スレッド内の全メッセージを時系列昇順に会話形式で表示するモード）を開き、各メッセージの送信者・本文・日時を表示する
4. THE Inbox SHALL Slack・メールのEvent_Logをデフォルトでスレッド単位にグループ化して一覧表示し、スレッドの最新メッセージ日時・スレッド内メッセージ件数を表示する
5. WHEN ユーザーがInboxの表示切替ボタンを操作した場合、THE Inbox SHALL スレッド表示（Thread_Groupごとにグループ化）とフラット表示（個別メッセージを時系列で一覧）を切り替えて表示する
6. WHEN ユーザーがDeal詳細画面の表示切替ボタンを操作した場合、THE System SHALL 当該Dealに紐づくSlack・メールEvent_Logについてスレッド表示とフラット表示を切り替えて表示する
7. THE System SHALL スレッドに属さない単独のSlack・メールEvent_Logはスレッドグループ化せず、個別のEvent_Logとして表示する
8. WHEN Thread_Viewが表示された場合、THE System SHALL スレッド内の全メッセージを一画面に表示し、各メッセージ間を視覚的な区切り線で分離する
