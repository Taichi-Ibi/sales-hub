// wiki 層の共通型。商談Wikiのスナップショット本体は data/snapshots.ts、
// 痕跡（根拠リンクの参照先）は data/traces.ts にある。
//
// 人間は wiki を直接編集しない。普段どおり Slack・メールを書けば raw（受信箱）
// 経由で AI がページに反映する、という建て付け。モックでは静的データ。

/** 出典。受信箱に実体が残っていれば inboxItemId で原文へ遷移できる。 */
export interface SourceRef {
  label: string; // 例 "メール 6/9「解約条項の見直しのお願い」"
  inboxItemId?: string;
}

export type WikiUpdateKind = '取込' | '定期更新' | '整合性チェック';

export interface WikiUpdate {
  at: string; // 表示用 "6/10 06:00"
  kind: WikiUpdateKind;
  summary: string;
  source?: SourceRef;
}

/** チャットでどの想定問答にも該当しないときの汎用回答（クエリのシミュレート用）。 */
export const QA_FALLBACK =
  'この質問への確かな根拠がWiki・痕跡の中に見つかりませんでした。根拠を示せない指摘は出力しない方針のため、推測ではお答えしません。関係する Slack・メール・議事録の取り込みをお待ちしています。';
