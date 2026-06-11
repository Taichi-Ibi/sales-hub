export type ProjectStatus = '進行中' | '確認中' | '完了';
export type SalesPhase = 'リード' | '商談' | '提案' | '契約' | '受注';

export interface Project {
  id: string;
  name: string;
  counterparty: string;
  status: ProjectStatus;
  category: string;
  taskCount: number;
  updatedAt: string;
  // 詳細フィールド
  salesPhase: SalesPhase;
  salesRep: string;
  preSalesStartDate: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  orderAmount: string | null;
  // プロジェクト目的
  purpose: string;
  // AIサマリー（直近の状況、約200文字）
  aiSummary: string;
  // 次回打ち合わせ
  nextMeeting?: {
    date: string;
    time: string;
    purpose: string;
    location?: string;
  };
  // ヘルス
  healthScore: number; // 0-100
  alertCount: number;
  alerts?: string[];
  // 資料
  documents?: {
    proposals: { label: string; url: string }[];
    received: { label: string; url: string }[];
  };
}

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    purpose: '年間売買基本契約の更新交渉。価格・数量・支払いサイトの条件見直しが主論点。',
    aiSummary: '6/5に先方より損害賠償上限条項の追記要望あり。過去類似案件で承諾実績があるため法務確認中。下期の発注量を1割増やしたい意向があり、価格据え置きを条件とした追加交渉が本件の主論点となっている。6/17の打ち合わせで最終合意を目指す。',
    name: '年間売買契約 更新交渉',
    counterparty: 'B商事',
    status: '進行中',
    category: '契約',
    taskCount: 3,
    updatedAt: '2026-06-10',
    salesPhase: '契約',
    salesRep: '駒田 健',
    preSalesStartDate: '2026-03-01',
    projectStartDate: '2026-07-01',
    projectEndDate: '2026-12-31',
    orderAmount: '200万円/月',
    nextMeeting: { date: '2026-06-17', time: '13:00', purpose: '契約条件 最終確認', location: 'B商事 会議室A' },
    healthScore: 72,
    alertCount: 0,
    documents: {
      proposals: [
        { label: '年間契約更新提案書 v2.pdf', url: '#' },
        { label: '価格改定案 2026.xlsx', url: '#' },
      ],
      received: [
        { label: 'B商事 契約条件回答書.pdf', url: '#' },
      ],
    },
  },
  {
    id: 'p2',
    purpose: '産業向け新型部品の共同開発。秘密保持（NDA）の締結とデータ共有範囲の合意形成。',
    aiSummary: '試作データの取り扱いが論点。秘密保持対象範囲について設計仕様の一部に限定する方向でFS承認済み。6/16のWEB会議でNDA最終合意予定。共同開発キックオフは7月上旬を想定しており、NDA締結が前提条件となっている。',
    name: '共同開発NDA 締結準備',
    counterparty: 'D工業',
    status: '進行中',
    category: '法務',
    taskCount: 5,
    updatedAt: '2026-06-10',
    salesPhase: '提案',
    salesRep: '駒田 健',
    preSalesStartDate: '2026-04-15',
    projectStartDate: '2026-07-01',
    projectEndDate: '2026-09-30',
    orderAmount: null,
    nextMeeting: { date: '2026-06-16', time: '10:00', purpose: 'NDA範囲の最終合意', location: 'WEB会議' },
    healthScore: 55,
    alertCount: 2,
    alerts: ['NDA範囲の合意が未完了のままキックオフ日程が迫っている', '試作データ共有の文書連絡が期限（6/16）までに未対応'],
    documents: {
      proposals: [
        { label: '共同開発提案資料 D工業向け.pdf', url: '#' },
      ],
      received: [
        { label: 'NDA-2024-031（D工業版）.pdf', url: '#' },
        { label: '試作データ共有範囲メモ.docx', url: '#' },
      ],
    },
  },
  {
    id: 'p3',
    purpose: '継続売買契約（CT-2024-118）の解約通知期間を90日→45日に短縮する条項変更交渉。',
    aiSummary: '解約通知期間の短縮要望（90→45日）はリスク高と判断。FS・法務の判断が必要な状況。先方は月間取引額120万円を維持したい意向で、条件次第では解約を示唆している。社内での対応方針が未確定のままであり、早急な回答が求められている。',
    name: '解約通知期間 短縮交渉',
    counterparty: '北斗電装',
    status: '確認中',
    category: '法務',
    taskCount: 2,
    updatedAt: '2026-06-09',
    salesPhase: '契約',
    salesRep: '三好 玲',
    preSalesStartDate: '2026-01-10',
    projectStartDate: '2024-11-01',
    projectEndDate: null,
    orderAmount: '120万円/月',
    healthScore: 45,
    alertCount: 3,
    alerts: ['社内対応方針が未確定のまま先方からの回答期限が過ぎている', '解約示唆に対する対応策が未検討', '月間取引額120万円の喪失リスクが高まっている'],
  },
  {
    id: 'p4',
    purpose: 'G産業への新規製品提案。製品資料の送付と社内検討会への資料提供を通じて受注獲得を目指す。',
    aiSummary: '先方担当より製品資料の送付を約束済みだが未対応のまま。6/12に先方社内検討会があり、資料が間に合わない場合は次のフェーズへの進行が遅延するリスクがある。先方キーマンは山本課長（決裁者）で、直接アプローチが有効と見られる。',
    name: '新規提案 製品資料送付',
    counterparty: 'G産業',
    status: '進行中',
    category: '期限付き返信',
    taskCount: 1,
    updatedAt: '2026-06-09',
    salesPhase: '商談',
    salesRep: '駒田 健',
    preSalesStartDate: '2026-05-20',
    projectStartDate: null,
    projectEndDate: null,
    orderAmount: null,
    nextMeeting: { date: '2026-06-12', time: '14:00', purpose: '社内検討会（先方）' },
    healthScore: 68,
    alertCount: 1,
    alerts: ['6/12の社内検討会までに資料を送付できていない'],
  },
  {
    id: 'p5',
    purpose: '試作データ共有に伴うNDA（NDA-2026-009）の締結と初期費用・月額保守の見積協議。',
    aiSummary: '試作データ共有はNDA範囲内で実施する方向が固まった。6/16までに共有範囲を文書で連絡する必要がある。初期費用80万円・月額15万円の見積は口頭段階。NDA締結後に正式な見積書を提出し、契約フェーズへの移行を目指す。',
    name: 'NDA-2026-009 締結',
    counterparty: '青葉化成',
    status: '確認中',
    category: '法務',
    taskCount: 2,
    updatedAt: '2026-06-09',
    salesPhase: '提案',
    salesRep: '駒田 健',
    preSalesStartDate: '2026-05-01',
    projectStartDate: null,
    projectEndDate: null,
    orderAmount: '15万円/月',
    healthScore: 60,
    alertCount: 1,
    alerts: ['口頭段階の見積に対する正式な書面化が未対応'],
  },
  {
    id: 'p6',
    purpose: '工作機械保守サービス年間契約（HSK-2025-007）の更新。現行条件での継続更新が目標。',
    aiSummary: '先方より現行条件でのまま更新希望。6/12までに当社からの回答が必要。保守対応の満足度は高く、値上げ余地は小さい印象。年額360万円の契約更新が見込まれるため、期限内に社内稟議を通す必要がある。',
    name: '保守契約 更新（HSK-2025-007）',
    counterparty: '湊精機',
    status: '進行中',
    category: '期限付き返信',
    taskCount: 1,
    updatedAt: '2026-06-10',
    salesPhase: '契約',
    salesRep: '駒田 健',
    preSalesStartDate: null,
    projectStartDate: '2025-07-01',
    projectEndDate: '2027-06-30',
    orderAmount: '30万円/月',
    nextMeeting: { date: '2026-06-12', time: '11:00', purpose: '更新条件の回答確認', location: '湊精機 本社' },
    healthScore: 80,
    alertCount: 0,
  },
  {
    id: 'p7',
    purpose: 'ITサービス調達に向けた秘密保持契約の締結。先方ひな形を用いて法務確認後に締結予定。',
    aiSummary: '先方ひな形は標準的な内容で、法務確認のうえ締結見込み。NDA締結後は本格的な調達検討に入る予定。当社の製品・サービスへの関心は高く、NDA締結を足がかりに次フェーズへの進行を目指す。',
    name: 'NDA 標準ひな形 締結',
    counterparty: 'A社',
    status: '完了',
    category: '法務',
    taskCount: 0,
    updatedAt: '2026-06-07',
    salesPhase: '商談',
    salesRep: '三好 玲',
    preSalesStartDate: '2026-06-01',
    projectStartDate: null,
    projectEndDate: null,
    orderAmount: null,
    healthScore: 90,
    alertCount: 0,
  },
  {
    id: 'p8',
    purpose: '継続売買契約の解約通知期間短縮（90日→30日）要望に対し、60日の折衷案で妥結を目指す。',
    aiSummary: '解約通知期間の短縮要望（90→30日）に対し、60日の折衷案で調整中。先方の資金繰り状況も考慮しつつ、当社のリスク管理上の最低ラインとの兼ね合いを検討中。早期合意が双方にとって望ましい状況。',
    name: '解約通知期間 折衷案調整',
    counterparty: 'K商会',
    status: '確認中',
    category: '契約',
    taskCount: 2,
    updatedAt: '2026-06-05',
    salesPhase: '契約',
    salesRep: '三好 玲',
    preSalesStartDate: null,
    projectStartDate: '2023-04-01',
    projectEndDate: null,
    orderAmount: null,
    healthScore: 50,
    alertCount: 2,
    alerts: ['折衷案（60日）への先方同意が得られておらず交渉が停滞している', '当社リスク管理上の最低ラインについて社内合意が未取得'],
  },
];

export function findProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}
