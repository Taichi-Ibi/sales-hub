// 簡易分かち書き（モック用）。本番では MeCab / Sudachi 等の形態素解析を
// Inbox 取り込み後に CPU で実行する想定。ここでは文字種の境界で分割して
// 「タップでマスキングできる単位」をシミュレートする。
//
// 分割単位（先に書いたものが優先）:
//   漢字の連続 / ひらがなの連続 / カタカナの連続（長音含む）/
//   英数字・メール・電話・契約番号（@ . _ - を含む連続）/ 空白 / その他1文字
const TOKEN_RE =
  /([一-鿿々〆]+|[ぁ-ゖ]+|[ァ-ヺー]+|[A-Za-z0-9@._\-]+|\s+|[^\s])/g;

export function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

/** マスキング対象になり得るトークンか（空白・記号は対象外）。 */
export function isMaskable(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}
