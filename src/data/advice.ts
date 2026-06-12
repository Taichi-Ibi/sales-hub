// ③助言（Advice Engine）。直近2スナップショットの diff と痕跡を入力に、
// 毎朝6:00に生成される建て付け（モックでは静的データ＋取込時の実行時生成）。
//
// 設計原則:
//   - 根拠必須: 「何が変わったか（事実）」の各行には必ず痕跡への参照を添える。
//     根拠を示せない行は出力しない（validateAdvice がモジュール評価時に保証）
//   - 事実と解釈の分離: facts（事実）と recommendations（解釈）をデータ構造上も混ぜない
//   - 伝達は人を介す: relayDrafts はドラフトまで。コピーは人の明示的な操作
//   - アラートは個人ではなく構造に宛てる: 週次レポートは流入・滞留の構造指標のみ

export type AdviceKind = '契約フェーズ入り' | 'ヨミ変化' | '滞留';
export type AdvicePriority = '高' | '中' | '低';

/** 事実の1行。evidence（traces のid）が1件以上必須。 */
export interface FactLine {
  text: string;
  evidence: string[];
}

export type RelayRecipient = '法務' | '経理' | '営業チーム';

export interface RelayDraft {
  id: string;
  recipient: RelayRecipient;
  subject: string;
  body: string; // マスクトークン（〔氏名①〕等）を含み得る。表示層で復元する
  evidence: string[]; // 元になった助言の根拠（traces のid）
}

export interface AdviceQA {
  q: string;
  a: string;
  evidence: string[];
}

export interface DealAdvice {
  id: string;
  dealId: string;
  date: string; // "2026-06-10"
  kind: AdviceKind;
  priority: AdvicePriority;
  title: string;
  facts: FactLine[]; // 何が変わったか（事実）。全行に根拠必須
  recommendations: string[]; // 推奨アクション（解釈）
  confidenceNote: string; // 確信度と留保
  generatedAt: string; // 監査・透明性: いつ生成されたか "6/10 06:00"
  inputs: string[]; // 監査・透明性: どの入力から（snapshot id / trace id）
  relayDrafts: RelayDraft[];
  chatQa: AdviceQA[]; // ④対話ビューの想定問答
}

/** 週次パイプライン健全性レポート。構造指標のみで、個人名を主語にした帰責表現は含めない。 */
export interface WeeklyReport {
  weekOf: string; // "2026-W24（6/8〜6/14）"
  generatedAt: string;
  inflow: { source: string; count: number; delta: string }[]; // 痕跡の流入
  phaseDwell: { phase: string; count: number; avgDays: number; note?: string }[];
  notes: FactLine[]; // 構造への所見（根拠つき）
}

// ── 当日（6/10 06:00 生成）の助言。優先度順 ──

export const SEED_ADVICE: DealAdvice[] = [
  {
    id: 'adv-b1',
    dealId: 'd-bshoji',
    date: '2026-06-10',
    kind: '契約フェーズ入り',
    priority: '高',
    title: 'B商事が契約フェーズ入り — 法務レビュー依頼を',
    facts: [
      {
        text: 'phase: 提案 → 契約。6/9に先方より更新条件（下期1割増・価格据え置き）の承諾連絡を受領。',
        evidence: ['tr-b2'],
      },
      { text: 'confidence: 60% → 75%。amount: 2,400万円/年 → 2,640万円/年。', evidence: ['tr-b2'] },
      { text: '契約書ドラフトの準備段階に入り、6/17打ち合わせは条文の最終確認の場に変更。', evidence: ['tr-b2'] },
    ],
    recommendations: [
      '法務へ契約書レビュー依頼を出す（期日目安: 6/17の最終確認に間に合うよう 6/13 まで）。',
      '下期1割増の供給可否について、納期・在庫の裏取りを並行して進める。',
    ],
    confidenceNote:
      'この推定の確信度: 高。判断根拠: フェーズ遷移の根拠が先方からの承諾メール（一次情報）であり、解釈の余地が小さいため。',
    generatedAt: '6/10 06:00',
    inputs: ['d-bshoji/2026-06-09', 'd-bshoji/2026-06-10', 'tr-b2'],
    relayDrafts: [
      {
        id: 'rd-b1-legal',
        recipient: '法務',
        subject: '【レビュー依頼】B商事 年間売買契約 更新ドラフト（期日: 6/13）',
        body: 'お疲れさまです。B商事の年間売買契約更新について、6/9に先方〔氏名①〕様より条件承諾の連絡を受領し、契約書ドラフトの段階に入りました。\n\n・変更点: 下期発注量1割増・価格据え置き（年間取引額 2,640万円規模）\n・先方との条文最終確認: 6/17\n\nつきましては、更新ドラフトのレビューを 6/13(土) までにお願いできますでしょうか。根拠資料は本依頼に添付の痕跡リンクをご参照ください。',
        evidence: ['tr-b2'],
      },
      {
        id: 'rd-b1-sales',
        recipient: '営業チーム',
        subject: '【共有】B商事 契約フェーズ入り（条件承諾を受領）',
        body: 'B商事の年間売買契約更新、6/9に先方より条件承諾（下期1割増・価格据え置き）の連絡があり、契約フェーズに入りました。6/17に条文の最終確認を行います。供給計画に関わる方は納期・在庫の前提をご確認ください。',
        evidence: ['tr-b2'],
      },
    ],
    chatQa: [
      {
        q: 'この助言の根拠は？',
        a: '根拠は6/9受領の先方メール「契約条件ご承諾のご連絡」です。昨日（6/9）と今日（6/10）のスナップショット差分で phase が 提案→契約 に遷移しており、その変化の根拠リンクが当該メールを指しています。',
        evidence: ['tr-b2'],
      },
      {
        q: '法務に何と伝えるべき？',
        a: '伝えるべきは3点です。(1) 条件承諾を受領し契約書ドラフト段階に入ったこと、(2) 変更点は下期1割増・価格据え置きであること、(3) 6/17の条文最終確認から逆算してレビュー期日は6/13が目安であること。下の伝達ドラフト（法務宛）をそのまま使えます。',
        evidence: ['tr-b2'],
      },
      {
        q: 'リスクはある？',
        a: '契約面の大きなリスクは確認できていません。留意点は、下期1割増の供給可否（納期・在庫）の裏取りがまだ取れていないことです。条文確定前に社内で前提を固めることを推奨します。',
        evidence: ['tr-b2', 'tr-b1'],
      },
    ],
  },
  {
    id: 'adv-m1',
    dealId: 'd-minato',
    date: '2026-06-10',
    kind: 'ヨミ変化',
    priority: '中',
    title: '湊精機の確度が70%→85%に上昇 — 回答期限は6/12',
    facts: [
      {
        text: 'confidence: 70% → 85%。先方が現行条件（年額360万円）での更新希望を明示した。',
        evidence: ['tr-m1'],
      },
      { text: 'expected_close: 2026-06-12（回答期限）。期限まで残り2日。', evidence: ['tr-m1'] },
    ],
    recommendations: [
      '現行条件のままの更新で社内稟議を起票し、6/12までに正式回答する。',
      '経理へ更新後の請求条件（年額360万円・継続）を事前連携しておく。',
    ],
    confidenceNote:
      'この推定の確信度: 高。判断根拠: 先方窓口からの直接の連絡で更新希望が明示されており、過去の満足度情報とも整合するため。',
    generatedAt: '6/10 06:00',
    inputs: ['d-minato/2026-06-09', 'd-minato/2026-06-10', 'tr-m1'],
    relayDrafts: [
      {
        id: 'rd-m1-acct',
        recipient: '経理',
        subject: '【事前連携】湊精機 保守契約更新（現行条件・年額360万円）',
        body: 'お疲れさまです。湊精機の保守契約（〔契約番号①〕）について、先方より現行条件（年額360万円）での更新希望の連絡を受けています。6/12までに正式回答予定です。\n\n更新後の請求条件は現行どおり（年額360万円・継続）となる見込みのため、事前に共有します。稟議承認後、正式に確定連絡をいたします。',
        evidence: ['tr-m1'],
      },
    ],
    chatQa: [
      {
        q: 'この助言の根拠は？',
        a: '根拠は6/9のSlack連絡（#sales-湊精機）です。先方が現行条件での更新を希望し6/12までの回答を求めていることが記録されており、スナップショット差分で confidence が 70%→85% に更新されています。',
        evidence: ['tr-m1'],
      },
      {
        q: '値上げ交渉の余地は？',
        a: '余地は小さいと見ています。5/20の定例議事録で「保守対応の満足度は高いが、値上げ余地は小さい印象」と記録されています。期限（6/12）も近いため、現行条件での確実な更新を優先する推奨です。',
        evidence: ['tr-m2'],
      },
    ],
  },
  {
    id: 'adv-g1',
    dealId: 'd-gsangyo',
    date: '2026-06-10',
    kind: '滞留',
    priority: '低',
    title: 'G産業が商談フェーズで14日間滞留 — 6/12検討会が分岐点',
    facts: [
      { text: 'phase: 商談 のまま14日間変化なし（5/27の初回商談以降）。', evidence: ['tr-g1'] },
      {
        text: '約束済みの製品資料送付が未対応のまま、6/12の先方社内検討会が迫っている。',
        evidence: ['tr-g2'],
      },
    ],
    recommendations: [
      '6/12の先方社内検討会前に製品資料を送付する（本日中が目安）。',
      '送付後、検討会の結果を確認するフォローの場を設定する。',
    ],
    confidenceNote:
      'この推定の確信度: 中。判断根拠: 滞留はスナップショットの機械的な比較によるもので、先方側の検討状況など外部要因は痕跡から確認できていないため。',
    generatedAt: '6/10 06:00',
    inputs: ['d-gsangyo/2026-06-09', 'd-gsangyo/2026-06-10', 'tr-g1', 'tr-g2'],
    relayDrafts: [
      {
        id: 'rd-g1-sales',
        recipient: '営業チーム',
        subject: '【要対応】G産業 製品資料の送付（6/12検討会前）',
        body: 'G産業の新規提案について、約束済みの製品資料送付が未対応のままです。6/12に先方の社内検討会が予定されているため、本日中の送付が目安になります。送付後は検討会結果のフォロー日程の設定をお願いします。',
        evidence: ['tr-g2'],
      },
    ],
    chatQa: [
      {
        q: 'この助言の根拠は？',
        a: '根拠は2つです。(1) スナップショット比較で phase が5/27から「商談」のまま14日間動いていないこと（滞留判定）、(2) 6/7のSlackで資料送付の未対応が記録されていることです。',
        evidence: ['tr-g1', 'tr-g2'],
      },
      {
        q: '今日中に何をすべき？',
        a: '製品資料の送付です。6/12の先方社内検討会に間に合わせるには本日中の送付が目安です。下の伝達ドラフト（営業チーム宛）で担当への共有ができます。',
        evidence: ['tr-g2'],
      },
    ],
  },
];

// ── 実行時の助言シード。受信箱アイテムが目視ゲートを通過（取込）すると生成される。
//    キーは InboxItem.id。マスクトークンの適用は取込時に行う（StoreContext）。──

export const RUNTIME_ADVICE: Record<string, Omit<DealAdvice, 'generatedAt'>> = {
  in02: {
    id: 'adv-h2',
    dealId: 'd-hokuto',
    date: '2026-06-10',
    kind: 'ヨミ変化',
    priority: '高',
    title: '北斗電装の確度が60%→40%に低下 — 解約示唆への回答が6/13期限',
    facts: [
      {
        text: '6/9受領メールで解約通知期間の短縮要望（90日→45日）を正式に受領。条件次第では解約を示唆。',
        evidence: ['tr-h2'],
      },
      { text: 'confidence: 60% → 40%。回答期限は6/13（残り3日）。', evidence: ['tr-h2'] },
      { text: '調達部門の不満は6/5時点から兆候があった。', evidence: ['tr-h1'] },
    ],
    recommendations: [
      '60日前後の折衷案を軸に、6/13までの回答方針を営業チームで確定する。',
      '通知期間短縮の契約リスク（最低ライン）について法務の見解を取る。',
    ],
    confidenceNote:
      'この推定の確信度: 中。判断根拠: 解約示唆は先方メールの記述に基づくが、実際の解約意向の強さは痕跡からは確定できないため。',
    inputs: ['d-hokuto/2026-06-09', 'd-hokuto/2026-06-10', 'tr-h2', 'tr-h1'],
    relayDrafts: [
      {
        id: 'rd-h2-sales',
        recipient: '営業チーム',
        subject: '【要判断】北斗電装 解約条項の短縮要望（回答期限 6/13）',
        body: '北斗電装より解約通知期間の短縮要望（90日→45日）を正式に受領しました。条件次第では解約の示唆もあり、確度を60%→40%に見直しています。\n\n・取引規模: 月額120万円（年間1,440万円）\n・回答期限: 6/13\n\n60日前後の折衷案を軸に、回答方針の確定をお願いします。',
        evidence: ['tr-h2'],
      },
      {
        id: 'rd-h2-legal',
        recipient: '法務',
        subject: '【見解依頼】北斗電装 解約通知期間の短縮（90日→45日）の可否',
        body: 'お疲れさまです。北斗電装（契約 〔契約番号①〕）より、解約通知期間を90日から45日へ短縮する条項変更の要望を受領しました。回答期限は6/13です。\n\n当社リスク管理上の最低ライン（60日折衷案の可否を含む）について見解をいただけますでしょうか。',
        evidence: ['tr-h2'],
      },
    ],
    chatQa: [
      {
        q: 'この助言の根拠は？',
        a: '根拠は、いま目視確認を経て取り込まれた6/9受領メール「解約条項の見直しのお願い」です。解約示唆と回答期限（6/13）が記録され、スナップショットの confidence が 60%→40% に更新されました。6/5のSlackにあった兆候とも整合します。',
        evidence: ['tr-h2', 'tr-h1'],
      },
      {
        q: '解約リスクはどの程度？',
        a: '中〜高と評価します。先方は条件次第で解約を示唆しており、年間1,440万円の取引が懸かっています。一方で先方窓口は法務部門であり、折衷案（60日前後）での交渉余地は残っていると見られます。',
        evidence: ['tr-h2'],
      },
    ],
  },
  in10: {
    id: 'adv-m2',
    dealId: 'd-minato',
    date: '2026-06-10',
    kind: 'ヨミ変化',
    priority: '中',
    title: '湊精機が回答の前倒しを希望 — expected_close が実質前倒し',
    facts: [
      { text: '先方が保守契約更新の回答前倒しを希望しているとの連絡を取込。', evidence: ['tr-h3'] },
      { text: '既存の回答期限は6/12。前倒し対応には本日中の社内稟議が必要になる。', evidence: ['tr-m1'] },
    ],
    recommendations: ['稟議の起票を本日中に前倒しし、明日中の一次回答を目指す。'],
    confidenceNote:
      'この推定の確信度: 中。判断根拠: 前倒し希望は電話の又聞き（Slack経由）であり、先方の正式な依頼文書はまだないため。',
    inputs: ['d-minato/2026-06-10', 'tr-h3', 'tr-m1'],
    relayDrafts: [
      {
        id: 'rd-m2-acct',
        recipient: '経理',
        subject: '【前倒し連絡】湊精機 保守契約更新の回答前倒し',
        body: '湊精機の保守契約更新について、先方が回答の前倒しを希望しています（従来期限: 6/12）。稟議を本日中に前倒しで起票しますので、確認の優先対応をお願いできますと幸いです。',
        evidence: ['tr-h3'],
      },
    ],
    chatQa: [
      {
        q: 'この助言の根拠は？',
        a: '根拠は、いま取り込まれたSlack連絡（#sales-相談）です。先方が回答の前倒しを希望していることが記録されています。既存期限（6/12）の根拠は6/9のSlack連絡です。',
        evidence: ['tr-h3', 'tr-m1'],
      },
    ],
  },
};

// ── 週次ヘルスレポート（構造指標のみ。個人名を主語にした帰責表現は含めない）──

export const WEEKLY_REPORT: WeeklyReport = {
  weekOf: '2026-W24（6/8〜6/14・集計中）',
  generatedAt: '6/10 06:00',
  inflow: [
    { source: 'メール', count: 5, delta: '前週比 +1' },
    { source: 'Slack', count: 7, delta: '前週比 ±0' },
    { source: '議事録', count: 3, delta: '前週比 −1' },
  ],
  phaseDwell: [
    { phase: '商談', count: 1, avgDays: 14, note: '14日以上の滞留が1件（資料送付の未対応が要因）' },
    { phase: '提案', count: 0, avgDays: 0 },
    { phase: '契約', count: 3, avgDays: 6 },
  ],
  notes: [
    {
      text: '商談フェーズの滞留1件は、送付物の準備工程がボトルネック。送付物のテンプレート整備で構造的に短縮できる可能性がある。',
      evidence: ['tr-g2'],
    },
    {
      text: '契約フェーズへの流入が増加（今週+1）。法務レビューの依頼が集中する見込みのため、依頼の早出しが有効。',
      evidence: ['tr-b2'],
    },
  ],
};

/**
 * 根拠必須のバリデーション。「何が変わったか（事実）」に根拠リンクのない行が
 * あれば throw する（受け入れ基準: 推測の記述はバリデーションで弾かれる）。
 * モジュール評価時に実行され、シードデータの整合性をビルド/起動時に保証する。
 */
export function validateAdvice(list: { id: string; facts: FactLine[]; title: string }[]): void {
  for (const advice of list) {
    for (const fact of advice.facts) {
      if (fact.evidence.length === 0) {
        throw new Error(
          `[advice validation] 根拠のない事実行は出力できません: ${advice.id}「${fact.text}」`,
        );
      }
    }
  }
}

validateAdvice(SEED_ADVICE);
validateAdvice(Object.values(RUNTIME_ADVICE));
validateAdvice([{ id: 'weekly', title: '週次レポート', facts: WEEKLY_REPORT.notes }]);

/**
 * 助言を Markdown（advice/{deal_id}/{date}.md 相当）に組み立てる。
 * Wikiと同じ思想で、③の表示は「Markdownをレンダリングするだけ」。
 * 事実行の根拠は [tr:xxx] 記法で行末に付け、表示層で痕跡チップに変換される。
 */
export function adviceToMarkdown(advice: DealAdvice): string {
  const facts = advice.facts
    .map((f) => `- ${f.text}${f.evidence.map((e) => ` [tr:${e}]`).join('')}`)
    .join('\n');
  const recs = advice.recommendations.map((r) => `- ${r}`).join('\n');
  return `## 何が変わったか（事実）
${facts}

## 推奨アクション（解釈）
${recs}

## 確信度と留保
- ${advice.confidenceNote}`;
}

export const ADVICE_KIND_META: Record<AdviceKind, { icon: string; cls: string }> = {
  契約フェーズ入り: { icon: '📑', cls: 'bg-accent-soft text-accent' },
  ヨミ変化: { icon: '📈', cls: 'bg-warn/10 text-warn' },
  滞留: { icon: '⏳', cls: 'bg-surface text-ink-sub' },
};

export const PRIORITY_META: Record<AdvicePriority, { cls: string }> = {
  高: { cls: 'bg-gold text-ink' },
  中: { cls: 'bg-accent-soft text-accent' },
  低: { cls: 'bg-surface text-ink-sub' },
};
