/**
 * 日付ユーティリティ。
 * `InlineDateField` プリミティブが `formatISODate` / `parseISODate` を参照する。
 */

/**
 * `Date | undefined` を YYYY-MM-DD 形式の文字列に変換する。
 * `undefined` の場合は空文字を返す。
 */
export function formatISODate(date: Date | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * YYYY-MM-DD 形式の文字列を `Date` オブジェクトに変換する。
 * 空文字・不正な文字列の場合は `undefined` を返す。
 */
export function parseISODate(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return undefined;
  return date;
}
