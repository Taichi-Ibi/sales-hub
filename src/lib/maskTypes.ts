import type { MaskType } from '../types';

/**
 * マスク種別のメタ情報。UI（種別ピッカー・チップ・辞書）で共有する。
 *
 * 設計方針:
 * - `type` はトークン名にそのまま入る短い語（〔氏名①〕等）。masked でも
 *   プレースホルダの役割が AI/人間に伝わるようにする。
 * - `label` は人が選びやすい少し詳しい呼称、`example` で具体像を示す。
 * - 金額は仕様どおりマスク対象外なので含めない。
 */
export interface MaskTypeMeta {
  type: MaskType;
  label: string;
  icon: string;
  example: string;
  /** チップ（下書き内・辞書）の配色。全種別で共通（トークン由来）。 */
  chipClass: string;
  /** 種別ピッカーで選択中に使う枠線色（トークン由来）。 */
  ringClass: string;
}

// 伏せ字は「機密」という単一の意味なので配色も一つに統一する（DESIGN.md トークンの accent）。
// 種別の区別はアイコンとラベル（氏名①等）で示し、色では分けない。
const CHIP_CLASS = 'bg-accent-soft text-accent';
const RING_CLASS = 'border-accent ring-accent/30';

export const MASK_TYPES: MaskTypeMeta[] = [
  { type: '氏名', label: '氏名', icon: '👤', example: '田中 一郎', chipClass: CHIP_CLASS, ringClass: RING_CLASS },
  { type: '会社', label: '会社・組織', icon: '🏢', example: '○○商事', chipClass: CHIP_CLASS, ringClass: RING_CLASS },
  { type: '連絡先', label: '連絡先', icon: '✉️', example: 'a@x.co / 03-…', chipClass: CHIP_CLASS, ringClass: RING_CLASS },
];

export const MASK_TYPE_MAP: Record<MaskType, MaskTypeMeta> = {
  ...Object.fromEntries(MASK_TYPES.map((m) => [m.type, m])),
  // 契約番号はピッカーには出さないが、既存マスク済みデータの表示に使う。
  契約番号: {
    type: '契約番号',
    label: '契約番号・NDA',
    icon: '📄',
    example: 'NDA-2024-018',
    chipClass: CHIP_CLASS,
    ringClass: RING_CLASS,
  },
} as Record<MaskType, MaskTypeMeta>;
