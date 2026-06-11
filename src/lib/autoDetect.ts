import type { MaskType } from '../types';

// user@example.com 形式。tokenizer が @ . を同一トークンにまとめるので単一トークンで検出できる。
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

// 日本の電話番号（ハイフン区切り）。tokenizer が - を同一トークンにまとめる。
// 0X-XXXX-XXXX / 0XX-XXX-XXXX / 0120-XXX-XXX / 090-XXXX-XXXX など
const PHONE_RE = /^0\d{1,4}-\d{1,4}-\d{3,4}$/;

export function detectMaskType(token: string): MaskType | null {
  if (EMAIL_RE.test(token)) return '連絡先';
  if (PHONE_RE.test(token)) return '連絡先';
  return null;
}
