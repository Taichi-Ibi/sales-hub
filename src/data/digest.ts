import type { InboxSource } from '../types';
import type { SourceRef } from './wiki';

// デイリーダイジェスト（OODA形式）。「昨日から何が変わった？」に毎朝6:00に答える建て付け。
// 生成対象は前日6:00〜当日6:00に目視ゲートを通過した原文と wiki（すべて出典つき）。
// 生成時刻（6:00）より後に届いたものはページ側で「生成後の新着」としてライブ算出する。

export interface DigestObserveItem {
  source: InboxSource;
  text: string;
  ref?: SourceRef;
}

export interface DigestOrientItem {
  text: string;
  gap?: boolean; // 認識ギャップ（⚠表示）
  refs: SourceRef[];
  link?: { label: string; to: string }; // 関連ページ（シグナル・案件など）
}

export interface DigestDecideItem {
  decisionId: string; // decisions.ts の id（詳細はストアから引く）
  note: string;
}

export interface DigestActItem {
  actionId?: string; // タスクへのリンク（ストアから現在状態を引く）
  meetingId?: string; // 会議ページへのリンク（受信箱の予定 id）
  suggestion: string; // actionId が無い場合の提案文（ある場合は補足）
  due?: string; // "2026-06-11"
}

export interface DailyDigest {
  date: string; // "2026-06-10"
  generatedAt: string; // "6/10 06:00"
  headline: string;
  observe: DigestObserveItem[];
  orient: DigestOrientItem[];
  decide: DigestDecideItem[];
  act: DigestActItem[];
}

export const DAILY_DIGEST: DailyDigest = {
  date: '2026-06-10',
  generatedAt: '6/10 06:00',
  headline: '昨日から5件の新しい動きがあり、判断が必要な論点が2つ、今日10:30に北斗電装との定例があります。',
  observe: [
    {
      source: 'mail',
      text: '北斗電装から解約条項（通知期間90日→45日）の見直し依頼。回答期限は6/13。',
      ref: { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
    },
    {
      source: 'schedule',
      text: '青葉化成 商談（6/9）の議事録を取込。試作データ共有はNDA範囲内で実施する方向で合意。',
      ref: { label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' },
    },
    {
      source: 'mail',
      text: 'C製作所から前回と同数量の見積依頼（5:40受信）。6/11までに概算回答が必要。',
      ref: { label: 'メール 6/10「お見積もりのご依頼」', inboxItemId: 'in04' },
    },
    {
      source: 'mail',
      text: 'H社から訪問日程の再調整依頼（6/11予定→来週前半へ）。',
      ref: { label: 'メール 6/9「ご訪問日程の再調整のお願い」' },
    },
    {
      source: 'mail',
      text: 'J社から新規導入の問い合わせ。一次返信が未送信のまま。',
      ref: { label: 'メール 6/9「貴社製品の導入について」' },
    },
  ],
  orient: [
    {
      text: '解約条項の短縮要望は北斗電装で2社目（6/5のK商会に続く）。同型の交渉が増えており、個別対応から標準方針の検討へ切り替える局面。',
      refs: [
        { label: 'メール 6/9「解約条項の見直しのお願い」', inboxItemId: 'in02' },
        { label: 'メール 6/5「解約条項の見直しのご相談」' },
      ],
      link: { label: 'シグナル: 解約条項の短縮要望', to: '/wiki/signal/sg1' },
    },
    {
      gap: true,
      text: 'D工業: 7月上旬キックオフの前提となるNDA合意が未了のまま、法務確認の期限が明日（6/11）に迫っている。先方は合意済みの認識で準備を進めている可能性。',
      refs: [{ label: '議事録 6/6 D工業 共同開発定例' }],
      link: { label: '案件: D工業', to: '/projects/p2' },
    },
    {
      text: '青葉化成: 見積（初期80万円・月額15万円）が口頭合意のまま未書面化。NDA締結（6/16期限の範囲連絡）と並行して書面化が必要。',
      refs: [{ label: '議事録 6/9 青葉化成 商談', inboxItemId: 'in03' }],
      link: { label: '案件: 青葉化成', to: '/projects/p5' },
    },
  ],
  decide: [
    { decisionId: 'd1', note: '回答期限6/13。今日10:30の定例で先方の感触を確認できる。' },
    { decisionId: 'd2', note: '法務確認（期限6/11）の結果が前提。6/16のWEB会議までに方針確定。' },
    { decisionId: 'd3', note: '60日案への先方回答待ち。返信タスクはFS承認待ち。' },
  ],
  act: [
    {
      meetingId: 'in11',
      suggestion: '10:30 北斗電装 オンライン定例 — 事前ブリーフで経緯と論点を確認',
    },
    { actionId: 'a02', suggestion: '機密保持の範囲を法務へ確認', due: '2026-06-11' },
    { actionId: 'a04', suggestion: '見積もり依頼に返信', due: '2026-06-11' },
    { actionId: 'a05', suggestion: '先週の資料送付がまだ未対応', due: '2026-06-10' },
    {
      suggestion: '明日のK電機 会食（6/11 19:00）に向けて、社内営業会議で事前準備を確認',
    },
  ],
};
