// 商談Wiki（頂点）。実体は Markdown ファイルで、日次スナップショットとして
// 都度残す建て付け（昨日時点・今日時点を別ファイルで保持）。
// Wiki側のUIは「Markdownをレンダリングするだけ」で、編集UIは作らない。
// 本文の各記述には [tr:xxx] 記法で痕跡（data/traces.ts）への根拠リンクを付ける。
// ③助言は直近2スナップショットの diff を入力にする。

import type { WikiUpdate } from './wiki';
import type { MaskedEntity } from '../types';

export type DealPhase = 'リード' | 'アポ' | '商談' | '提案' | '契約' | '受注' | '失注';

/** スナップショットの frontmatter（消費者起点で逆算した最小セット）。 */
export interface SnapshotMeta {
  deal_id: string;
  deal_name: string;
  phase: DealPhase;
  confidence: number; // 確度 %（ヨミ用）
  amount: string; // 金額（ヨミ用。金額は伏せ字にしない）
  expected_close: string; // クローズ予定日 "2026-06-30"
  updated_at: string; // "2026-06-10 06:00"
  evidence: string[]; // 本文の記述が参照する traces/ のidリスト
}

export interface WikiSnapshot {
  id: string; // 例 "d-bshoji/2026-06-10"
  dealId: string;
  date: string; // "2026-06-10"
  meta: SnapshotMeta;
  markdown: string; // 本文。行末の [tr:xxx] が根拠リンク
}

export interface DealEntry {
  id: string;
  counterparty: string; // 受信箱の案件名・設定の案件台帳と一致させる
  name: string;
  updates: WikiUpdate[]; // AIによるページ維持の記録（取込/定期更新/整合性チェック）
  /**
   * 表示層の復元テーブル。AI処理（スナップショット・助言）はマスク済みのまま行い、
   * レンダリング時にのみチップとして復元する（復元処理は②側の責務という建て付け）。
   */
  entities: MaskedEntity[];
}

export const DEAL_ENTRIES: DealEntry[] = [
  {
    id: 'd-bshoji',
    counterparty: 'B商事',
    name: '販売管理システム再構築 開発委託',
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: 'スナップショット生成（フェーズ: 提案 → 契約）' },
      {
        at: '6/9 18:00',
        kind: '取込',
        summary: 'メール「契約条件ご承諾のご連絡」を取込（開発委託条件の承諾・契約書ドラフトへ）',
        source: { label: 'メール 6/9「契約条件ご承諾のご連絡」', inboxItemId: 'in12' },
      },
      { at: '6/3 16:00', kind: '取込', summary: '議事録「B商事 定例」を取込（データ移行を追加・単価据え置きで最終調整）' },
    ],
    entities: [{ token: '〔氏名①〕', type: '氏名', decryptedValue: '田中 一郎', occurrences: 1 }],
  },
  {
    id: 'd-hokuto',
    counterparty: '北斗電装',
    name: '保守開発契約 解約条項交渉',
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: 'スナップショット生成（変化なし）' },
      { at: '6/5 12:00', kind: '取込', summary: 'Slack「#sales-北斗電装」を取込（調達部門の不満の兆候）' },
    ],
    entities: [
      { token: '〔契約番号①〕', type: '契約番号', decryptedValue: 'CT-2024-118', occurrences: 1 },
      { token: '〔氏名①〕', type: '氏名', decryptedValue: '川島 紗英', occurrences: 1 },
    ],
  },
  {
    id: 'd-gsangyo',
    counterparty: 'G産業',
    name: '在庫管理システム刷新 新規提案',
    updates: [
      { at: '6/10 06:00', kind: '整合性チェック', summary: 'フェーズ14日間変化なし（滞留として助言へ）' },
      { at: '6/7 15:30', kind: '取込', summary: 'Slack「#sales-g産業」を取込（資料送付の未対応）' },
    ],
    entities: [],
  },
  {
    id: 'd-minato',
    counterparty: '湊精機',
    name: 'システム保守契約 更新（HSK-2025-007）',
    updates: [
      { at: '6/10 06:00', kind: '定期更新', summary: 'スナップショット生成（確度 70 → 85）' },
      {
        at: '6/9 17:00',
        kind: '取込',
        summary: 'Slack「#sales-湊精機」を取込（現行条件での継続希望）',
        source: { label: 'Slack 6/9「#sales-湊精機」', inboxItemId: 'in01' },
      },
    ],
    entities: [{ token: '〔契約番号①〕', type: '契約番号', decryptedValue: 'HSK-2025-007', occurrences: 1 }],
  },
];

// 4案件 × 2日（昨日 2026-06-09 / 今日 2026-06-10）= 8 スナップショット。
export const SNAPSHOTS: WikiSnapshot[] = [
  // ── B商事: 提案 → 契約（今日の最重要イベント）──
  {
    id: 'd-bshoji/2026-06-09',
    dealId: 'd-bshoji',
    date: '2026-06-09',
    meta: {
      deal_id: 'd-bshoji',
      deal_name: '販売管理システム再構築 開発委託',
      phase: '提案',
      confidence: 60,
      amount: '2,400万円（初期開発）',
      expected_close: '2026-06-30',
      updated_at: '2026-06-09 06:00',
      evidence: ['tr-b1'],
    },
    markdown: `## 概要
- 販売管理システム再構築の開発委託提案。スコープ・体制・検収条件の合意形成が主論点。

## 現在の状況
- データ移行をスコープに追加・単価据え置きを軸に、6月中の契約合意を目指している。 [tr:tr-b1]
- 6/17の打ち合わせで最終合意を予定。 [tr:tr-b1]

## 経緯
- 5/28 先方よりデータ移行もスコープに含めたい意向（単価据え置きが条件）。 [tr:tr-b1]`,
  },
  {
    id: 'd-bshoji/2026-06-10',
    dealId: 'd-bshoji',
    date: '2026-06-10',
    meta: {
      deal_id: 'd-bshoji',
      deal_name: '販売管理システム再構築 開発委託',
      phase: '契約',
      confidence: 75,
      amount: '2,640万円（初期開発）',
      expected_close: '2026-06-30',
      updated_at: '2026-06-10 06:00',
      evidence: ['tr-b1', 'tr-b2'],
    },
    markdown: `## 概要
- 販売管理システム再構築の開発委託提案。先方が提案条件を承諾し、開発委託契約書ドラフトの段階に入った。

## 現在の状況
- 6/9 先方より提案条件（データ移行を追加・単価据え置き）の承諾連絡を受領。契約フェーズへ移行。 [tr:tr-b2]
- 開発委託契約書（基本契約＋個別契約）ドラフトの準備に入る。6/17の打ち合わせは条文の最終確認の場に変更。 [tr:tr-b2]

## 経緯
- 6/9 条件承諾のメールを受領（初期開発費は2,640万円規模へ）。 [tr:tr-b2]
- 5/28 先方よりデータ移行もスコープに含めたい意向（単価据え置きが条件）。 [tr:tr-b1]`,
  },

  // ── 北斗電装: 変化なし（6:00時点）。in02 のゲート通過で実行時に動く ──
  {
    id: 'd-hokuto/2026-06-09',
    dealId: 'd-hokuto',
    date: '2026-06-09',
    meta: {
      deal_id: 'd-hokuto',
      deal_name: '保守開発契約 解約条項交渉',
      phase: '契約',
      confidence: 60,
      amount: '1,440万円/年',
      expected_close: '2026-06-20',
      updated_at: '2026-06-09 06:00',
      evidence: ['tr-h1'],
    },
    markdown: `## 概要
- 保守開発契約 〔契約番号①〕（準委任・月額120万円）の解約条項（通知期間90日）について、先方調達部門で不満が強まっている。

## 現在の状況
- 調達部門で通知期間90日への不満が強まっているとの情報。正式な要望はまだ受領していない。 [tr:tr-h1]

## 経緯
- 6/5 社内Slackで先方調達部門の不満の兆候を共有。 [tr:tr-h1]`,
  },
  {
    id: 'd-hokuto/2026-06-10',
    dealId: 'd-hokuto',
    date: '2026-06-10',
    meta: {
      deal_id: 'd-hokuto',
      deal_name: '保守開発契約 解約条項交渉',
      phase: '契約',
      confidence: 60,
      amount: '1,440万円/年',
      expected_close: '2026-06-20',
      updated_at: '2026-06-10 06:00',
      evidence: ['tr-h1'],
    },
    markdown: `## 概要
- 保守開発契約 〔契約番号①〕（準委任・月額120万円）の解約条項（通知期間90日）について、先方調達部門で不満が強まっている。

## 現在の状況
- 調達部門で通知期間90日への不満が強まっているとの情報。正式な要望はまだ受領していない。 [tr:tr-h1]

## 経緯
- 6/5 社内Slackで先方調達部門の不満の兆候を共有。 [tr:tr-h1]`,
  },

  // ── G産業: 商談フェーズが14日間動いていない（滞留）──
  {
    id: 'd-gsangyo/2026-06-09',
    dealId: 'd-gsangyo',
    date: '2026-06-09',
    meta: {
      deal_id: 'd-gsangyo',
      deal_name: '在庫管理システム刷新 新規提案',
      phase: '商談',
      confidence: 30,
      amount: '未確定',
      expected_close: '2026-08-31',
      updated_at: '2026-06-09 06:00',
      evidence: ['tr-g1', 'tr-g2'],
    },
    markdown: `## 概要
- G産業への在庫管理システム刷新の新規提案。提案資料・概算見積の提供を通じて要件定義フェーズの受注を目指す。

## 現在の状況
- 約束済みの提案資料・概算見積の送付が未対応のまま。6/12の先方社内検討会が迫っている。 [tr:tr-g2]

## 経緯
- 5/27 初回商談で現行システムの課題をヒアリング。先方は社内検討会（6/12）に向けて提案資料の提供を希望。 [tr:tr-g1]`,
  },
  {
    id: 'd-gsangyo/2026-06-10',
    dealId: 'd-gsangyo',
    date: '2026-06-10',
    meta: {
      deal_id: 'd-gsangyo',
      deal_name: '在庫管理システム刷新 新規提案',
      phase: '商談',
      confidence: 30,
      amount: '未確定',
      expected_close: '2026-08-31',
      updated_at: '2026-06-10 06:00',
      evidence: ['tr-g1', 'tr-g2'],
    },
    markdown: `## 概要
- G産業への在庫管理システム刷新の新規提案。提案資料・概算見積の提供を通じて要件定義フェーズの受注を目指す。

## 現在の状況
- 約束済みの提案資料・概算見積の送付が未対応のまま。6/12の先方社内検討会が迫っている。 [tr:tr-g2]
- フェーズは5/27の初回商談から14日間「商談」のまま動いていない。 [tr:tr-g1]

## 経緯
- 5/27 初回商談で現行システムの課題をヒアリング。先方は社内検討会（6/12）に向けて提案資料の提供を希望。 [tr:tr-g1]`,
  },

  // ── 湊精機: 確度 70 → 85（好転）──
  {
    id: 'd-minato/2026-06-09',
    dealId: 'd-minato',
    date: '2026-06-09',
    meta: {
      deal_id: 'd-minato',
      deal_name: 'システム保守契約 更新（HSK-2025-007）',
      phase: '契約',
      confidence: 70,
      amount: '360万円/年',
      expected_close: '2026-06-12',
      updated_at: '2026-06-09 06:00',
      evidence: ['tr-m2'],
    },
    markdown: `## 概要
- 基幹システム保守サービス年間契約の更新。現行条件での継続更新が目標。

## 現在の状況
- 保守対応の満足度は高く、現行条件での継続意向は強い。 [tr:tr-m2]

## 経緯
- 5/20 定例で更新意向を確認。値上げ余地は小さい印象。 [tr:tr-m2]`,
  },
  {
    id: 'd-minato/2026-06-10',
    dealId: 'd-minato',
    date: '2026-06-10',
    meta: {
      deal_id: 'd-minato',
      deal_name: 'システム保守契約 更新（HSK-2025-007）',
      phase: '契約',
      confidence: 85,
      amount: '360万円/年',
      expected_close: '2026-06-12',
      updated_at: '2026-06-10 06:00',
      evidence: ['tr-m1', 'tr-m2'],
    },
    markdown: `## 概要
- 基幹システム保守サービス年間契約の更新。現行条件での継続更新が目標。

## 現在の状況
- 先方は現行条件（年額360万円）のままの更新を希望。6/12までに当社からの回答が必要。 [tr:tr-m1]
- 保守対応の満足度は高く、社内稟議を期限内に通せるかが唯一のポイント。 [tr:tr-m2]

## 経緯
- 6/9 先方窓口より、現行条件での更新希望と回答期限（6/12）の連絡。 [tr:tr-m1]
- 5/20 定例で更新意向を確認。値上げ余地は小さい印象。 [tr:tr-m2]`,
  },
];

export function findDealEntry(dealId: string): DealEntry | undefined {
  return DEAL_ENTRIES.find((d) => d.id === dealId);
}

export function findDealByCounterparty(counterparty: string): DealEntry | undefined {
  return DEAL_ENTRIES.find((d) => d.counterparty === counterparty);
}

/** 指定案件のスナップショットを日付昇順で返す。 */
export function snapshotsOf(dealId: string): WikiSnapshot[] {
  return SNAPSHOTS.filter((s) => s.dealId === dealId).sort((a, b) => a.date.localeCompare(b.date));
}
