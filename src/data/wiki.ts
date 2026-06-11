// 案件 wiki（架空）。LLM Knowledge Base パターンの「wiki/」層にあたる。
//
// 1案件=1ページを AI（司書）が維持する:
//   - statements: 「直近の状況」。全記述に出典（source）を付ける
//   - facts:      構造化情報（CRM・メール・議事録から定期バッチで更新されるイメージ）
//   - alerts:     整合性チェック（lint）が立てたアラート
//   - updates:    更新履歴のタイムライン（取込 / 定期更新 / 整合性チェック）
//   - qa:         「この案件に質問する」のシミュレート用想定問答
//
// 人間は wiki を直接編集しない。普段どおり Slack・メールを書けば raw（受信箱）
// 経由で AI がページに反映する、という建て付け。モックでは静的データ。

export type SalesPhase = 'リード' | '商談' | '提案' | '契約' | '受注';
export type ProjectStatus = '進行中' | '確認中' | '完了';

/** 出典。受信箱に実体が残っていれば inboxItemId で原文へ遷移できる。 */
export interface SourceRef {
  label: string; // 例 "メール 6/9「解約条項の見直しのお願い」"
  inboxItemId?: string;
}

export interface WikiStatement {
  text: string;
  source?: SourceRef;
}

export type WikiUpdateKind = '取込' | '定期更新' | '整合性チェック';

export interface WikiUpdate {
  at: string; // 表示用 "6/10 06:00"
  kind: WikiUpdateKind;
  summary: string;
  source?: SourceRef;
}

export interface WikiFact {
  label: string;
  value: string;
}

export interface WikiQA {
  q: string;
  a: string;
  sources?: SourceRef[];
}

export interface WikiPage {
  id: string;
  counterparty: string;
  name: string;
  purpose: string;
  category: string;
  status: ProjectStatus;
  salesPhase: SalesPhase;
  salesRep: string;
  orderAmount: string | null;
  preSalesStartDate: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  updatedAt: string; // "2026-06-10"
  lastLintAt: string; // "6/10 06:05"
  statements: WikiStatement[];
  alerts: WikiStatement[];
  facts: WikiFact[];
  updates: WikiUpdate[];
  nextMeeting?: { date: string; time: string; purpose: string; location?: string };
  documents?: {
    proposals: { label: string; url: string }[];
    received: { label: string; url: string }[];
  };
  qa: WikiQA[];
}

export const WIKI_PAGES: WikiPage[] = [
  {
    id: 'p1',
    counterparty: 'B商事',
    name: '年間売買契約 更新交渉',
    purpose: '年間売買基本契約の更新交渉。価格・数量・支払いサイトの条件見直しが主論点。',
    category: '契約',
    status: '進行中',
    salesPhase: '契約',
    salesRep: '駒田 健',
    orderAmount: '200万円/月',
    preSalesStartDate: '2026-03-01',
    projectStartDate: '2026-07-01',
    projectEndDate: '2026-12-31',
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '6/5に先方より損害賠償上限条項の追記要望。過去の類似案件で承諾実績があるため法務確認中。',
        source: { label: 'メール 6/5「契約書第3条の修正のお願い」' },
      },
      {
        text: '下期の発注量を1割増やしたい意向。価格据え置きが条件で、追加交渉の主論点となっている。',
        source: { label: 'Slack 5/28 #sales-b商事' },
      },
      {
        text: '6/17の打ち合わせで最終合意を目指す。',
        source: { label: '議事録 6/3 B商事定例' },
      },
    ],
    alerts: [],
    facts: [
      { label: '業種', value: '専門商社（機械部品）' },
      { label: '先方窓口', value: '田中 一郎（営業部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '年間売買基本契約＋個別注文' },
      { label: '年間取引額', value: '約2,400万円' },
      { label: '支払サイト', value: '30日' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: '矛盾・出典切れなし' },
      { at: '6/10 06:00', kind: '定期更新', summary: '「直近の状況」を再生成（損害賠償上限の追記要望を反映）' },
      {
        at: '6/5 09:05',
        kind: '取込',
        summary: 'メール「契約書第3条の修正のお願い」からタスク「契約書3条の修正依頼に返信」を生成',
        source: { label: 'メール 6/5「契約書第3条の修正のお願い」' },
      },
    ],
    nextMeeting: { date: '2026-06-17', time: '13:00', purpose: '契約条件 最終確認', location: 'B商事 会議室A' },
    documents: {
      proposals: [
        { label: '年間契約更新提案書 v2.pdf', url: '#' },
        { label: '価格改定案 2026.xlsx', url: '#' },
      ],
      received: [{ label: 'B商事 契約条件回答書.pdf', url: '#' }],
    },
    qa: [
      {
        q: '今いちばんのリスクは？',
        a: '損害賠償上限条項の追記要望（6/5受領）への回答期限が6/12に迫っていることです。過去の類似案件では承諾実績があるため、法務確認が完了すれば対応可能と見られます。',
        sources: [{ label: 'メール 6/5「契約書第3条の修正のお願い」' }],
      },
      {
        q: '6/17までに何を準備すべき？',
        a: '最終合意に向けて2点です。(1) 契約書3条の修正版ドラフトについて法務確認を完了させる、(2) 下期発注量1割増・価格据え置きの条件で収支試算を用意する。',
        sources: [{ label: 'Slack 5/28 #sales-b商事' }, { label: '議事録 6/3 B商事定例' }],
      },
    ],
  },
  {
    id: 'p2',
    counterparty: 'D工業',
    name: '共同開発NDA 締結準備',
    purpose: '産業向け新型部品の共同開発。秘密保持（NDA）の締結とデータ共有範囲の合意形成。',
    category: '法務',
    status: '進行中',
    salesPhase: '提案',
    salesRep: '駒田 健',
    orderAmount: null,
    preSalesStartDate: '2026-04-15',
    projectStartDate: '2026-07-01',
    projectEndDate: '2026-09-30',
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '試作データの取り扱いが論点。秘密保持対象範囲は設計仕様の一部に限定する方向でFS承認済み。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
      {
        text: '6/16のWEB会議でNDA最終合意予定。共同開発キックオフは7月上旬を想定しており、NDA締結が前提条件。',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
    ],
    alerts: [
      { text: 'NDA範囲の合意が未完了のままキックオフ日程が迫っている' },
      {
        text: '機密保持範囲の法務確認タスクが期限（6/11）までに未完了',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
    ],
    facts: [
      { label: '業種', value: '輸送機器メーカー' },
      { label: '先方窓口', value: '開発企画部（複数名）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '共同開発契約（締結準備中）＋NDA' },
      { label: '関連契約', value: 'NDA-2024-031（更新時期近い）' },
      { label: '与信', value: '良好' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート2件（NDA範囲未合意 / 法務確認の期限超過リスク）' },
      { at: '6/10 06:00', kind: '定期更新', summary: 'キックオフ前提条件（NDA締結）を「直近の状況」に反映' },
      {
        at: '6/6 15:00',
        kind: '取込',
        summary: '議事録「共同開発定例」からタスク「機密保持の範囲を法務へ確認」を生成',
        source: { label: '議事録 6/6 D工業 共同開発定例' },
      },
    ],
    nextMeeting: { date: '2026-06-16', time: '10:00', purpose: 'NDA範囲の最終合意', location: 'WEB会議' },
    documents: {
      proposals: [{ label: '共同開発提案資料 D工業向け.pdf', url: '#' }],
      received: [
        { label: 'NDA-2024-031（D工業版）.pdf', url: '#' },
        { label: '試作データ共有範囲メモ.docx', url: '#' },
      ],
    },
    qa: [
      {
        q: '何が決まっていて、何が未決？',
        a: '決定済み: 秘密保持対象を設計仕様の一部に限定する方針（FS承認済み）。未決: 試作データを対象範囲に含めるかの法務見解と、NDA最終合意（6/16 WEB会議で予定）です。',
        sources: [{ label: '議事録 6/6 D工業 共同開発定例' }],
      },
      {
        q: 'キックオフは予定通り進められる？',
        a: '条件付きです。7月上旬のキックオフはNDA締結が前提のため、6/16のWEB会議で最終合意できるかに懸かっています。法務確認タスク（期限6/11）の完了が直近のボトルネックです。',
      },
    ],
  },
  {
    id: 'p3',
    counterparty: '北斗電装',
    name: '解約通知期間 短縮交渉',
    purpose: '継続売買契約（CT-2024-118）の解約通知期間を90日→45日に短縮する条項変更交渉。',
    category: '法務',
    status: '確認中',
    salesPhase: '契約',
    salesRep: '三好 玲',
    orderAmount: '120万円/月',
    preSalesStartDate: '2026-01-10',
    projectStartDate: '2024-11-01',
    projectEndDate: null,
    updatedAt: '2026-06-09',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '解約通知期間の短縮要望（90→45日）を受領。リスク高と判断し、FS・法務の判断待ち。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      {
        text: '先方は月間取引額120万円を維持したい意向だが、条件次第では解約を示唆している。',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
      { text: '回答期限は6/13。社内の対応方針は未確定。' },
    ],
    alerts: [
      { text: '社内対応方針が未確定のまま回答期限（6/13）が迫っている' },
      { text: '解約示唆に対する対応策が未検討' },
      { text: '月間取引額120万円の喪失リスクが高まっている' },
    ],
    facts: [
      { label: '業種', value: '電装部品メーカー' },
      { label: '先方窓口', value: '川島 紗英（法務）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買（CT-2024-118）' },
      { label: '月間取引額', value: '約120万円' },
      { label: '解約条項', value: '通知期間90日（45日へ短縮要望あり）' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート3件（方針未確定 / 解約示唆 / 取引喪失リスク）' },
      {
        at: '6/10 06:00',
        kind: '定期更新',
        summary: '解約示唆と回答期限（6/13）を「直近の状況」に反映',
        source: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
      },
    ],
    qa: [
      {
        q: '解約リスクはどの程度？',
        a: '中〜高と評価します。先方は条件次第で解約を示唆しており（6/9メール）、月間120万円の取引が懸かっています。一方で先方窓口は法務部門であり、交渉の余地は残っていると見られます。',
        sources: [{ label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' }],
      },
      {
        q: '当社の選択肢は？',
        a: '(1) 45日を受諾、(2) 60日前後の折衷案を提示（K商会の類似交渉で採用中）、(3) 現行90日を維持し代替条件を提示、の3案です。いずれも6/13の回答期限までにFS・法務の判断が必要です。',
      },
    ],
  },
  {
    id: 'p4',
    counterparty: 'G産業',
    name: '新規提案 製品資料送付',
    purpose: 'G産業への新規製品提案。製品資料の送付と社内検討会への資料提供を通じて受注獲得を目指す。',
    category: '期限付き返信',
    status: '進行中',
    salesPhase: '商談',
    salesRep: '駒田 健',
    orderAmount: null,
    preSalesStartDate: '2026-05-20',
    projectStartDate: null,
    projectEndDate: null,
    updatedAt: '2026-06-09',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '先方担当へ製品資料の送付を約束済みだが未対応のまま。',
        source: { label: 'Slack 6/7 #sales-g産業' },
      },
      {
        text: '6/12に先方社内検討会。資料が間に合わない場合は次フェーズへの進行が遅延するリスク。',
        source: { label: 'Slack 6/7 #sales-g産業' },
      },
      { text: '先方キーマンは山本課長（決裁者）。直接アプローチが有効と見られる。' },
    ],
    alerts: [{ text: '6/12の社内検討会までに資料を送付できていない', source: { label: 'Slack 6/7 #sales-g産業' } }],
    facts: [
      { label: '業種', value: '建材卸' },
      { label: '先方窓口', value: '高橋 誠（資材部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '新規（提案中）' },
      { label: '先方キーマン', value: '山本課長（決裁者）' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート1件（資料送付の対応漏れ）' },
      {
        at: '6/10 08:00',
        kind: '定期更新',
        summary: 'Slack共有（商談リスト）を確認。状況に変更なし',
        source: { label: 'Slack 6/10 #sales-general 進捗共有', inboxItemId: 'in05' },
      },
      {
        at: '6/7 15:05',
        kind: '取込',
        summary: 'Slack「#sales-g産業」からタスク「先週の資料送付がまだ未対応」を生成',
        source: { label: 'Slack 6/7 #sales-g産業' },
      },
    ],
    nextMeeting: { date: '2026-06-12', time: '14:00', purpose: '社内検討会（先方）' },
    qa: [
      {
        q: '今日中に何をすべき？',
        a: '製品資料の送付です。6/12の先方社内検討会に間に合わせるには本日中の送付が必要で、対応漏れタスクが「今日」ビューに上がっています。送付後、決裁者の山本課長宛にも一報を入れると効果的です。',
        sources: [{ label: 'Slack 6/7 #sales-g産業' }],
      },
    ],
  },
  {
    id: 'p5',
    counterparty: '青葉化成',
    name: 'NDA-2026-009 締結',
    purpose: '試作データ共有に伴うNDA（NDA-2026-009）の締結と初期費用・月額保守の見積協議。',
    category: '法務',
    status: '確認中',
    salesPhase: '提案',
    salesRep: '駒田 健',
    orderAmount: '15万円/月',
    preSalesStartDate: '2026-05-01',
    projectStartDate: null,
    projectEndDate: null,
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '試作データ共有はNDA範囲内で実施する方向が固まった。共有範囲を6/16までに文書で連絡する必要がある。',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
      {
        text: '見積は初期費用80万円・月額15万円で口頭合意。NDA締結後に正式な見積書を提出予定。',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    alerts: [{ text: '口頭段階の見積に対する正式な書面化が未対応', source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' } }],
    facts: [
      { label: '業種', value: '化学メーカー' },
      { label: '先方窓口', value: '大西部長（生産技術）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: 'NDA（NDA-2026-009）＋見積協議中' },
      { label: '見積（口頭）', value: '初期80万円・月額15万円' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート1件（見積の書面化未対応）' },
      {
        at: '6/10 06:00',
        kind: '取込',
        summary: '議事録「青葉化成 商談」からタスク「試作データ共有範囲の確定を連絡」を生成',
        source: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
      },
    ],
    qa: [
      {
        q: '6/16までに必要な対応は？',
        a: '試作データの共有範囲を確定し、文書で先方へ連絡することです（6/9商談で大西部長と合意）。NDA-2026-009の範囲確認が前提のため、法務確認を含む高リスクタスクとして「今日」ビューに登録済みです。',
        sources: [{ label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' }],
      },
    ],
  },
  {
    id: 'p6',
    counterparty: '湊精機',
    name: '保守契約 更新（HSK-2025-007）',
    purpose: '工作機械保守サービス年間契約（HSK-2025-007）の更新。現行条件での継続更新が目標。',
    category: '期限付き返信',
    status: '進行中',
    salesPhase: '契約',
    salesRep: '駒田 健',
    orderAmount: '30万円/月',
    preSalesStartDate: null,
    projectStartDate: '2025-07-01',
    projectEndDate: '2027-06-30',
    updatedAt: '2026-06-10',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '先方は現行条件（年額360万円）のままの更新を希望。6/12までに当社からの回答が必要。',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
      { text: '保守対応の満足度は高く、値上げ余地は小さい印象。期限内に社内稟議を通す必要がある。' },
    ],
    alerts: [],
    facts: [
      { label: '業種', value: '工作機械メーカー' },
      { label: '先方窓口', value: '三浦（調達部）' },
      { label: '当社担当FS', value: '駒田 健' },
      { label: '契約形態', value: '保守契約（HSK-2025-007）' },
      { label: '年額', value: '360万円' },
      { label: '更新期日', value: '2026-07-01' },
    ],
    updates: [
      {
        at: '6/10 09:00',
        kind: '取込',
        summary: 'Slack「#sales-湊精機」からタスク「保守契約更新の条件に返信」を生成',
        source: { label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' },
      },
      { at: '6/10 06:05', kind: '整合性チェック', summary: '矛盾・出典切れなし' },
    ],
    nextMeeting: { date: '2026-06-12', time: '11:00', purpose: '更新条件の回答確認', location: '湊精機 本社' },
    qa: [
      {
        q: '更新交渉の論点は？',
        a: '論点はほぼありません。先方は現行条件（年額360万円）での継続を希望しており、保守満足度も高いため、6/12の回答期限までに社内稟議を通せるかが唯一のポイントです。',
        sources: [{ label: 'Slack 6/10 #sales-湊精機', inboxItemId: 'in01' }],
      },
    ],
  },
  {
    id: 'p7',
    counterparty: 'A社',
    name: 'NDA 標準ひな形 締結',
    purpose: 'ITサービス調達に向けた秘密保持契約の締結。先方ひな形を用いて法務確認後に締結予定。',
    category: '法務',
    status: '完了',
    salesPhase: '商談',
    salesRep: '三好 玲',
    orderAmount: null,
    preSalesStartDate: '2026-06-01',
    projectStartDate: null,
    projectEndDate: null,
    updatedAt: '2026-06-07',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '先方ひな形は標準的な内容で、法務確認のうえ締結見込み。NDA締結を足がかりに次フェーズへ。',
        source: { label: 'Slack 6/7 #sales-a社' },
      },
    ],
    alerts: [],
    facts: [
      { label: '業種', value: 'ITサービス' },
      { label: '先方窓口', value: '佐藤 花子（購買）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: 'NDA締結前（先方ひな形を受領）' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: '矛盾・出典切れなし' },
      {
        at: '6/7 11:05',
        kind: '取込',
        summary: 'Slack「#sales-a社」からタスク「NDAの先方ひな形を法務へ連絡」を生成',
        source: { label: 'Slack 6/7 #sales-a社' },
      },
    ],
    qa: [
      {
        q: 'この案件の現状は？',
        a: 'NDAひな形の法務確認待ちです。内容は標準的で、確認が済み次第締結見込み。締結後に本格的な調達検討フェーズへ進む予定です。',
        sources: [{ label: 'Slack 6/7 #sales-a社' }],
      },
    ],
  },
  {
    id: 'p8',
    counterparty: 'K商会',
    name: '解約通知期間 折衷案調整',
    purpose: '継続売買契約の解約通知期間短縮（90日→30日）要望に対し、60日の折衷案で妥結を目指す。',
    category: '契約',
    status: '確認中',
    salesPhase: '契約',
    salesRep: '三好 玲',
    orderAmount: null,
    preSalesStartDate: null,
    projectStartDate: '2023-04-01',
    projectEndDate: null,
    updatedAt: '2026-06-05',
    lastLintAt: '6/10 06:05',
    statements: [
      {
        text: '解約通知期間の短縮要望（90→30日）に対し、60日の折衷案で調整中。',
        source: { label: 'メール 6/5「解約条項の見直しのご相談」' },
      },
      { text: '先方の資金繰り状況も考慮しつつ、当社リスク管理上の最低ラインとの兼ね合いを検討中。' },
    ],
    alerts: [
      { text: '折衷案（60日）への先方同意が得られておらず交渉が停滞している' },
      { text: '当社リスク管理上の最低ラインについて社内合意が未取得' },
    ],
    facts: [
      { label: '業種', value: '化学品卸' },
      { label: '先方窓口', value: '小林 大輔（管理部）' },
      { label: '当社担当FS', value: '三好 玲' },
      { label: '契約形態', value: '継続売買（年間）' },
      { label: '解約条項', value: '通知期間90日（当社標準）' },
    ],
    updates: [
      { at: '6/10 06:05', kind: '整合性チェック', summary: 'アラート2件（交渉停滞 / 社内合意未取得）' },
      {
        at: '6/5 08:05',
        kind: '取込',
        summary: 'メール「解約条項の見直しのご相談」からタスク「解約条項の修正可否を回答」を生成',
        source: { label: 'メール 6/5「解約条項の見直しのご相談」' },
      },
    ],
    qa: [
      {
        q: '交渉を前に進めるには？',
        a: 'ボトルネックは社内側です。リスク管理上の最低ライン（通知期間）について社内合意が未取得のため、まずFS・管理部門で60日案の承認を取り付け、その上で先方の資金繰り事情に言及した提案文で再打診するのが近道です。',
        sources: [{ label: 'メール 6/5「解約条項の見直しのご相談」' }],
      },
    ],
  },
];

export function findWikiPage(id: string): WikiPage | undefined {
  return WIKI_PAGES.find((p) => p.id === id);
}

export function findWikiByCounterparty(counterparty: string): WikiPage | undefined {
  return WIKI_PAGES.find((p) => p.counterparty === counterparty);
}

/** どのページにも該当質問がないときの汎用回答（クエリのシミュレート用）。 */
export const QA_FALLBACK =
  'この質問への確かな出典がページ内に見つかりませんでした。関連しそうな原文は「最近の活動」から確認できます。回答の根拠が増えるよう、関係する Slack・メール・議事録の取り込みをお待ちしています。';
