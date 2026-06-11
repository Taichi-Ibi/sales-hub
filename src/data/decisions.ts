import type { SourceRef, WikiStatement } from './wiki';

// 意思決定ログ（Decision Log）。「誰が・いつ・何を・なぜ」決めたかを
// AIが原文（受信箱）から抽出し、Decision Brief（論点・選択肢・推奨案・リスク）
// として提示する建て付け。決定として記録する操作は人が行う（AIは提案まで）。
// すべて既存ストーリー（案件 wiki・受信箱）の言い換えで、出典つき。

export type DecisionStatus = '提案中' | '決定済み' | '撤回';

export interface DecisionOption {
  key: string; // 'A' | 'B' | 'C'
  title: string;
  detail: string;
  pros?: string[];
  cons?: string[];
  recommended?: boolean;
}

export interface Decision {
  id: string;
  title: string; // 論点
  counterparty: string; // WikiPage.counterparty と一致させて紐付ける
  status: DecisionStatus;
  owner: string; // 誰が（判断の責任者）
  decidedAt?: string; // いつ（決定済み/撤回のみ）。表示用 "6/5 14:00"
  deadline?: string; // 期限 "2026-06-13"
  background: WikiStatement[]; // 背景（出典つき）
  stakeholders: string[]; // 関係者
  options: DecisionOption[]; // 選択肢 A/B/C
  recommendation?: string; // 推奨案（提案中のみ表示）
  rationale?: string; // なぜ（決定済み/撤回の理由）
  risks: WikiStatement[]; // リスク（出典つき）
  sources: SourceRef[]; // 根拠Source
  followUps: string[]; // 次に確認すべきこと
}

export const SEED_DECISIONS: Decision[] = [
  {
    id: 'd1',
    title: '解約通知期間 90日→45日要望への回答方針',
    counterparty: '北斗電装',
    status: '提案中',
    owner: '三好 玲（FS）',
    deadline: '2026-06-13',
    background: [
      {
        text: '現行契約 CT-2024-118 の解約通知期間を90日から45日へ短縮する要望を受領。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      {
        text: '先方は月間取引額120万円を維持したい意向だが、条件次第では解約を示唆している。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      { text: '先方窓口は法務部門で、交渉の余地は残っていると見られる。' },
    ],
    stakeholders: ['三好 玲（FS）', '川島 紗英（北斗電装 法務）', '当社 法務'],
    options: [
      {
        key: 'A',
        title: '45日を受諾',
        detail: '先方要望どおり通知期間を45日へ短縮する。',
        pros: ['先方の心証が良く、解約リスクを即座に下げられる'],
        cons: ['生産計画の調整余地が45日に縮まる', '他社交渉への前例化リスク'],
      },
      {
        key: 'B',
        title: '60日の折衷案を提示',
        detail: 'K商会の類似交渉で採用中の60日へ折衷する。',
        pros: ['当社リスク管理ラインと先方要望を両立できる', 'K商会で同条件の前例があり説明しやすい'],
        cons: ['先方が45日に固執した場合は再交渉になる'],
        recommended: true,
      },
      {
        key: 'C',
        title: '90日を維持し代替条件を提示',
        detail: '通知期間は現行のまま、価格・納期などの代替条件で譲歩する。',
        pros: ['生産計画への影響がない'],
        cons: ['解約示唆が現実化するおそれ（月120万円の取引喪失）'],
      },
    ],
    recommendation:
      'B案（60日折衷）。K商会の類似交渉と整合し、当社リスク管理ラインを守りつつ先方要望に歩み寄れる。回答期限6/13までにFS・法務の合意が必要。',
    risks: [
      {
        text: '条件次第では解約を示唆されており、月間取引額120万円の喪失リスクがある。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      { text: '社内対応方針が未確定のまま回答期限（6/13）が迫っている。' },
    ],
    sources: [{ label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' }],
    followUps: [
      'K商会の60日折衷案への先方反応を確認（同型交渉の参考にする）',
      '法務に通知期間の社内最低ラインを確認',
      '回答ドラフトを作成しFS承認へ回す',
    ],
  },
  {
    id: 'd2',
    title: 'NDAの秘密保持範囲に試作データを含めるか',
    counterparty: 'D工業',
    status: '提案中',
    owner: '駒田 健（FS）',
    deadline: '2026-06-16',
    background: [
      {
        text: '秘密保持対象範囲は設計仕様の一部に限定する方向でFS承認済み。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
      { text: '試作データを範囲に含めるかは法務見解待ち（確認期限 6/11）。' },
      {
        text: '6/16のWEB会議でNDA最終合意予定。7月上旬のキックオフは締結が前提条件。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
    ],
    stakeholders: ['駒田 健（FS）', 'D工業 開発企画部', '当社 法務'],
    options: [
      {
        key: 'A',
        title: '試作データを範囲に含める（限定列挙）',
        detail: '対象データを限定列挙したうえでNDA本体の秘密保持範囲に含める。',
        pros: ['先方の懸念（試作データの取り扱い）に正面から応えられる'],
        cons: ['当社の管理義務・運用コストが増える'],
      },
      {
        key: 'B',
        title: '試作データは除外し、別途覚書で扱う',
        detail: 'NDA本体は設計仕様限定のまま合意し、試作データの運用は覚書で定める。',
        pros: ['NDA本体の合意を6/16に間に合わせられる', 'データ運用の詳細を覚書で柔軟に定められる'],
        cons: ['覚書の作成・合意が追加で必要になる'],
        recommended: true,
      },
      {
        key: 'C',
        title: '判断を保留し合意を延期',
        detail: '法務見解が出るまでNDA合意自体を延期する。',
        pros: ['法務見解を待って確実に判断できる'],
        cons: ['キックオフ（7月上旬）が遅延するリスク'],
      },
    ],
    recommendation:
      'B案。NDA本体は6/16に合意し、試作データの取り扱いは別途覚書とする。法務確認（期限6/11）の結果次第でA案への切替余地を残す。',
    risks: [
      { text: 'NDA範囲の合意が未完了のままキックオフ日程が迫っている。' },
      {
        text: '機密保持範囲の法務確認タスクが期限（6/11）までに未完了。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
    ],
    sources: [{ label: '議事録 6/6 D工業 共同開発定例' }],
    followUps: [
      '法務見解（試作データの扱い）を6/11までに取得',
      '覚書ドラフトの要否を法務と確認',
      '6/16 WEB会議のアジェンダに方針を反映',
    ],
  },
  {
    id: 'd3',
    title: '解約通知期間は60日の折衷案で打診する',
    counterparty: 'K商会',
    status: '決定済み',
    owner: '三好 玲（FS）',
    decidedAt: '6/5 14:00',
    background: [
      {
        text: '先方より解約通知期間の短縮要望（90日→30日）。社内の方針変更が理由。',
        source: { label: 'メール 6/5「解約条項の見直しのご相談」' },
      },
      { text: '先方の資金繰り状況と、当社リスク管理上の最低ラインの両立が論点だった。' },
    ],
    stakeholders: ['三好 玲（FS）', '小林 大輔（K商会 管理部）', '当社 管理部門'],
    options: [
      {
        key: 'A',
        title: '30日を受諾',
        detail: '先方要望どおり通知期間を30日へ短縮する。',
        cons: ['生産計画の調整期間として短すぎ、受け入れ不可と判断'],
      },
      {
        key: 'B',
        title: '60日の折衷案で打診',
        detail: '当社最低ラインと先方事情の中間となる60日を提示する。',
        pros: ['当社リスク管理ラインと先方の資金繰り事情を両立できる'],
        recommended: true,
      },
      {
        key: 'C',
        title: '90日を維持',
        detail: '現行条項を維持し要望を断る。',
        cons: ['先方の方針変更を受け止められず、関係悪化のおそれ'],
      },
    ],
    rationale:
      '当社リスク管理ライン（生産計画の調整期間）と先方の資金繰り事情を両立できる案として60日を採用。30日は生産計画上受け入れ不可、90日維持は関係悪化リスクが高いと判断した。',
    risks: [{ text: '折衷案（60日）への先方同意が未取得で、交渉が停滞している。' }],
    sources: [{ label: 'メール 6/5「解約条項の見直しのご相談」' }],
    followUps: [
      '60日案への先方回答を確認（返信タスクはFS承認待ち）',
      'リスク管理上の最低ラインについて社内合意を文書化',
    ],
  },
  {
    id: 'd4',
    title: '下期の価格改定（値上げ）提案',
    counterparty: 'B商事',
    status: '撤回',
    owner: '駒田 健（FS）',
    decidedAt: '5/28 16:00',
    background: [
      { text: '原材料高を受け、下期からの価格改定（値上げ）提案を検討していた。' },
      {
        text: '5/28、先方より下期の発注量を1割増・価格据え置きとする条件提示があった。',
        source: { label: 'Slack 5/28 #sales-b商事' },
      },
    ],
    stakeholders: ['駒田 健（FS）', '田中 一郎（B商事 営業部）'],
    options: [
      {
        key: 'A',
        title: '下期から値上げを提案',
        detail: '原材料高を理由に単価改定を打診する。',
        cons: ['年間契約の更新交渉（6/17最終合意予定）と同時進行になり交渉が複雑化'],
      },
      {
        key: 'B',
        title: '価格据え置き・数量増で妥結',
        detail: '先方提示の発注量1割増・価格据え置き条件を受け入れる。',
        pros: ['増量による収益改善が値上げ相当と試算された'],
        recommended: true,
      },
    ],
    rationale:
      '先方から発注量1割増・価格据え置きの条件提示があり、増量による収益改善が値上げ相当と試算されたため、値上げ提案は撤回。年間契約の更新交渉（6/17最終合意予定）に集中する。',
    risks: [{ text: '原材料費がさらに上昇した場合、据え置き価格では利益率が圧迫される。' }],
    sources: [{ label: 'Slack 5/28 #sales-b商事' }],
    followUps: ['原材料費の動向を四半期ごとにレビュー', '6/17の最終合意で数量条件を明文化'],
  },
];

export function findDecision(decisions: Decision[], id: string): Decision | undefined {
  return decisions.find((d) => d.id === id);
}
