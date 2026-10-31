import { describe, expect, it } from 'vitest';
import { camelizeKeys, snakeKeys, toCamelKey, toSnakeKey } from '../src/case';

describe('toCamelKey', () => {
  it.each([
    ['CODE_NM', 'codeNm'], // Oracle
    ['code_nm', 'codeNm'], // PostgreSQL
    ['ID', 'id'],
    ['USER_ID_2', 'userId2'],
    ['codeNm', 'codeNm'], // 이미 camelCase
    ['code', 'code'],
    ['REG__DT', 'regDt'],
  ])('%s → %s', (input, expected) => expect(toCamelKey(input)).toBe(expected));

  it('두 번 변환해도 같다', () => {
    for (const k of ['CODE_NM', 'code_nm', 'ID', 'USER_ID_2']) expect(toCamelKey(toCamelKey(k))).toBe(toCamelKey(k));
  });
});

describe('toSnakeKey', () => {
  it.each([
    ['codeNm', 'CODE_NM'],
    ['regDtFrom', 'REG_DT_FROM'],
    ['userId2', 'USER_ID_2'],
    ['id', 'ID'],
    ['CODE_NM', 'CODE_NM'],
  ])('%s → %s', (input, expected) => expect(toSnakeKey(input)).toBe(expected));

  it('camel ↔ snake 왕복', () => {
    for (const k of ['codeNm', 'regDtFrom', 'userId2', 'useYn']) expect(toCamelKey(toSnakeKey(k))).toBe(k);
  });
});

describe('deep 변환', () => {
  it('중첩 객체와 배열의 키만 바꾸고 값은 그대로 둔다', () => {
    const date = new Date(0);
    const input = { LIST: [{ CODE_NM: 'USE_YN', REG_DT: date }], TOTAL_COUNT: 1 };
    expect(camelizeKeys(input)).toEqual({ list: [{ codeNm: 'USE_YN', regDt: date }], totalCount: 1 });
    expect(snakeKeys({ codeNm: 'a', sub: { useYn: 'Y' } })).toEqual({ CODE_NM: 'a', SUB: { USE_YN: 'Y' } });
  });

  it('원시값과 null 은 그대로', () => {
    expect(camelizeKeys(null)).toBeNull();
    expect(camelizeKeys('A_B')).toBe('A_B');
  });
});
