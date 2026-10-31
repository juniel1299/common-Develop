import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { toExternal, toInternal } from '../src/area/convert';
import type { FieldDef } from '../src/area/types';

const fields: FieldDef[] = [
  { name: 'userNm', label: '이름' },
  { name: 'age', label: '나이', type: 'number' },
  { name: 'useYn', label: '사용', type: 'select', codeGroup: 'USE_YN', all: true },
  { name: 'roles', label: '권한', type: 'checkbox' },
  { name: 'adminYn', label: '관리자', type: 'yn' },
  { name: 'birthDt', label: '생일', type: 'date' },
  { name: 'regDt', label: '등록일', type: 'dateRange' },
];

describe('toInternal / toExternal', () => {
  it('API 값 → 화면 값 → API 값 왕복', () => {
    const api = {
      userId: 'u1', // 정의에 없는 키 (숨은 PK)
      userNm: '홍길동',
      age: 30,
      useYn: 'Y',
      roles: ['A'],
      adminYn: 'Y',
      birthDt: '1990-01-02',
      regDtFrom: '2026-10-01',
      regDtTo: '2026-10-17',
    };
    const { values, extra } = toInternal(fields, api);
    expect(extra).toEqual({ userId: 'u1' });
    expect(values.adminYn).toBe(true);
    expect(dayjs.isDayjs(values.birthDt)).toBe(true);
    expect(Array.isArray(values.regDt)).toBe(true);
    expect(toExternal(fields, values, extra)).toEqual(api);
  });

  it('빈 값은 null (배열 필드는 []), 전체("")는 null 로 나간다', () => {
    const { values } = toInternal(fields, {});
    expect(values.useYn).toBe(''); // 화면에는 '전체' 선택
    expect(toExternal(fields, values)).toEqual({
      userNm: null,
      age: null,
      useYn: null,
      roles: [],
      adminYn: 'N',
      birthDt: null,
      regDtFrom: null,
      regDtTo: null,
    });
  });

  it('문자열은 앞뒤 공백을 자른다', () => {
    expect(toExternal(fields, { userNm: '  홍 ' }).userNm).toBe('홍');
  });

  it('기간은 한쪽만 있어도 된다', () => {
    const { values } = toInternal(fields, { regDtFrom: '2026-10-01' });
    const out = toExternal(fields, values);
    expect(out.regDtFrom).toBe('2026-10-01');
    expect(out.regDtTo).toBeNull();
  });
});
