/**
 * 키 이름 변환. docs/api-convention.md 1장
 * 원칙상 변환은 백엔드 책임이고, 여기 함수는 레거시 API 대응이나 백엔드 공통 구현의 기준으로 쓴다.
 */

const hasLower = /[a-z]/;

/** `CODE_NM` · `code_nm` → `codeNm`. 이미 camelCase면 그대로 */
export function toCamelKey(key: string): string {
  if (!key.includes('_') && hasLower.test(key)) return key;
  return key
    .toLowerCase()
    .replace(/_+([a-z0-9])/g, (_, c: string) => c.toUpperCase())
    .replace(/_+$/, '');
}

/** `codeNm` → `CODE_NM`. 이미 UPPER_SNAKE면 그대로 */
export function toSnakeKey(key: string): string {
  if (!hasLower.test(key)) return key;
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([a-z])([0-9])/g, '$1_$2')
    .toUpperCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepConvert(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => deepConvert(v, convert));
  if (!isPlainObject(value)) return value; // Date, File, Blob, FormData 등은 건드리지 않음
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[convert(k)] = deepConvert(v, convert);
  return out;
}

/** 객체·배열의 모든 키를 camelCase로 (깊게) */
export function camelizeKeys<T = unknown>(value: unknown): T {
  return deepConvert(value, toCamelKey) as T;
}

/** 객체·배열의 모든 키를 UPPER_SNAKE로 (깊게) */
export function snakeKeys<T = unknown>(value: unknown): T {
  return deepConvert(value, toSnakeKey) as T;
}
