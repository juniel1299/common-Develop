/**
 * API 규약 테스트 (docs/api-convention.md).
 * 같은 테스트로 가짜 API 와 실제 백엔드(Spring·Django × Oracle·PostgreSQL)가 똑같이 동작하는지 확인한다.
 *
 *   npm test -w @common/pages                                  # 가짜 API
 *   API_URL=http://localhost:8080 npm test -w @common/pages    # Spring
 *   API_URL=http://localhost:8000 npm test -w @common/pages    # Django
 */
import { createHttp, isApiError, type ApiError, type PageResult } from '@common/core';
import { afterAll, describe, expect, it } from 'vitest';
import { createMockAdapter } from '../src';

type User = { userId: string; userNm: string; deptCd: string; email: string | null; joinDt: string | null; salary: number | null; useYn: string; remark: string | null; regDt: string };
type Code = { groupCd: string; code: string; codeNm: string; sortOrd: number; useYn: string };
type LayoutItem = { mapId: string; itemId: string; itemNm: string | null; itemType: string; posX: number; posY: number; width: number; height: number; rotate: number; shape: string; userId: string | null; userNm: string | null };

const target = process.env.API_URL;
const http = createHttp({ baseURL: `${target ?? ''}/api` });
if (!target) http.client.defaults.adapter = createMockAdapter({ delay: 0 });

const run = Date.now().toString(36);
const id = (n: string) => `t${run}${n}`;
const fail = (p: Promise<unknown>) => p.then(() => { throw new Error('실패해야 하는 요청이 성공했습니다.'); }, (e: unknown) => e as ApiError);

describe(`API 규약 (${target ?? '가짜 API'})`, () => {
  const created: string[] = [];
  afterAll(async () => {
    for (const u of created) await http.delete(`/users/${u}`).catch(() => {});
    await http.saveRows('/codes', [{ rowStatus: 'D', groupCd: id('G'), code: 'A' }]).catch(() => {});
    await http.saveRows('/codes/groups', [{ rowStatus: 'D', groupCd: id('G') }]).catch(() => {});
    await http.saveRows('/layouts/items', [id('L1'), id('L2')].map((itemId) => ({ rowStatus: 'D', mapId: 'F4', itemId }))).catch(() => {});
  });

  it('공통코드: 요청한 순서대로, sortOrd 순으로', async () => {
    const groups = await http.get<{ groupCd: string; codes: { code: string; codeNm: string }[] }[]>('/common/codes', { groupCd: 'USE_YN,DEPT' });
    expect(groups.map((g) => g.groupCd)).toEqual(['USE_YN', 'DEPT']);
    expect(groups[0]!.codes).toEqual([{ code: 'Y', codeNm: '사용' }, { code: 'N', codeNm: '미사용' }]);
    expect(groups[1]!.codes[0]).toEqual({ code: 'D01', codeNm: '개발팀' });
  });

  it('목록: 페이징 형식, camelCase 키, 날짜 형식, null 키 유지', async () => {
    const r = await http.getPage<User>('/users', { page: 2, size: 5 });
    expect(Object.keys(r).sort()).toEqual(['list', 'page', 'size', 'totalCount', 'totalPages']);
    expect(r).toMatchObject({ page: 2, size: 5 });
    expect(r.list).toHaveLength(5);
    expect(r.totalPages).toBe(Math.ceil(r.totalCount / 5));
    const u = r.list[0]!;
    expect(Object.keys(u).sort()).toEqual(['deptCd', 'email', 'joinDt', 'regDt', 'remark', 'salary', 'useYn', 'userId', 'userNm']);
    expect(u.remark).toBeNull();
    expect(u.joinDt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(u.regDt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(typeof u.salary).toBe('number');
  });

  it('목록: 조회 조건과 정렬', async () => {
    const r = await http.getPage<User>('/users', { deptCd: 'D02', useYn: 'Y', joinDtFrom: '2021-01-01', joinDtTo: '2023-12-31', sort: ['userNm,desc'], size: 100 });
    expect(r.list.length).toBeGreaterThan(0);
    expect(r.list.every((u) => u.deptCd === 'D02' && u.useYn === 'Y' && u.joinDt! >= '2021-01-01' && u.joinDt! <= '2023-12-31')).toBe(true);
    const names = r.list.map((u) => u.userNm);
    expect(names).toEqual([...names].sort().reverse());
    const like = await http.getPage<User>('/users', { userNm: '민수' });
    expect(like.list.every((u) => u.userNm.includes('민수'))).toBe(true);
  });

  it('허용되지 않은 정렬은 BAD_REQUEST', async () => {
    const e = await fail(http.getPage('/users', { sort: 'password,asc' }));
    expect(e).toMatchObject({ code: 'BAD_REQUEST', status: 400 });
  });

  it('없는 대상은 NOT_FOUND', async () => {
    expect(await fail(http.get('/users/nobody_xx'))).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('입력값 오류는 VALIDATION_ERROR + camelCase 필드', async () => {
    const e = await fail(http.post('/users', { userId: 'A!', userNm: '' }));
    expect(isApiError(e)).toBe(true);
    expect(e).toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(new Set(e.fieldErrors.map((f) => f.field))).toEqual(new Set(['userId', 'userNm', 'deptCd']));
    expect(e.fieldErrors.every((f) => f.message.length > 0)).toBe(true);
  });

  it('등록 → 상세 → 수정 → 중복 등록은 CONFLICT → 삭제', async () => {
    const userId = id('a');
    created.push(userId);
    const body = { userId, userNm: '계약테스트', deptCd: 'D03', email: null, joinDt: '2026-10-17', salary: 1234567, useYn: 'Y', remark: null };
    const saved = await http.post<User>('/users', body);
    expect(saved).toMatchObject({ ...body });
    expect(await http.get<User>(`/users/${userId}`)).toMatchObject({ userNm: '계약테스트', joinDt: '2026-10-17', email: null });

    const updated = await http.put<User>(`/users/${userId}`, { ...body, userNm: '수정됨', joinDt: null, salary: null });
    expect(updated).toMatchObject({ userId, userNm: '수정됨', joinDt: null, salary: null });

    expect(await fail(http.post('/users', body))).toMatchObject({ code: 'CONFLICT', status: 409 });

    await http.delete(`/users/${userId}`);
    expect(await fail(http.get(`/users/${userId}`))).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('그리드 일괄 저장: D → U → I, 결과 건수', async () => {
    const [a, b] = [id('b'), id('c')];
    created.push(a, b);
    await http.post('/users', { userId: a, userNm: '삭제대상', deptCd: 'D01' });
    await http.post('/users', { userId: b, userNm: '수정대상', deptCd: 'D01' });
    const c = id('d');
    created.push(c);
    const r = await http.saveRows<User>('/users', [
      { rowStatus: 'I', userId: c, userNm: '신규', deptCd: 'D02' },
      { rowStatus: 'U', userId: b, userNm: '수정완료', deptCd: 'D04', useYn: 'N' },
      { rowStatus: 'D', userId: a },
    ]);
    expect(r).toEqual({ inserted: 1, updated: 1, deleted: 1 });
    expect(await http.get<User>(`/users/${b}`)).toMatchObject({ userNm: '수정완료', deptCd: 'D04', useYn: 'N' });
    expect((await http.getPage<User>('/users', { userId: c })).totalCount).toBe(1);
    expect(await fail(http.get(`/users/${a}`))).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('일괄 저장은 한 건이라도 실패하면 모두 취소 (트랜잭션)', async () => {
    const x = id('e');
    created.push(x);
    const e = await fail(http.saveRows<User>('/users', [
      { rowStatus: 'I', userId: x, userNm: '들어가면 안됨', deptCd: 'D01' },
      { rowStatus: 'U', userId: 'nobody_xx', userNm: '없음', deptCd: 'D01' },
    ]));
    expect(e.code).toBe('NOT_FOUND');
    expect(await fail(http.get(`/users/${x}`))).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('공통코드 관리: 그룹·코드 저장, 하위 코드가 있으면 그룹 삭제 불가', async () => {
    const g = id('G');
    expect(await http.saveRows('/codes/groups', [{ rowStatus: 'I', groupCd: g, groupNm: '테스트그룹', useYn: 'Y' }])).toEqual({ inserted: 1, updated: 0, deleted: 0 });
    await http.saveRows('/codes', [{ rowStatus: 'I', groupCd: g, code: 'A', codeNm: '에이', sortOrd: 1, useYn: 'Y' }]);
    const codes = await http.get<Code[]>('/codes', { groupCd: g });
    expect(codes).toEqual([{ groupCd: g, code: 'A', codeNm: '에이', sortOrd: 1, useYn: 'Y' }]);

    expect(await fail(http.saveRows('/codes/groups', [{ rowStatus: 'D', groupCd: g }]))).toMatchObject({ code: 'CONFLICT', status: 409 });

    const missing = await fail(http.saveRows('/codes', [{ rowStatus: 'I', groupCd: g, code: '', codeNm: '' }]));
    expect(missing.code).toBe('VALIDATION_ERROR');
    expect(missing.fieldErrors.map((f) => f.field)).toContain('code');
  });

  it('배치도: 도면 목록, 항목 camelCase + 배정 사용자 이름', async () => {
    const maps = await http.get<{ mapId: string; mapNm: string; width: number; height: number; bgUrl: string | null }[]>('/layouts');
    expect(maps.map((m) => m.mapId)).toEqual(['F3', 'F4']);
    expect(maps[0]).toMatchObject({ mapNm: '본사 3층', width: 800, height: 500, bgUrl: null });
    const items = await http.get<LayoutItem[]>('/layouts/items', { mapId: 'F3' });
    expect(items).toHaveLength(20);
    const seat = items.find((i) => i.itemId === 'S001')!;
    expect(Object.keys(seat).sort()).toEqual(['height', 'itemId', 'itemNm', 'itemType', 'mapId', 'posX', 'posY', 'rotate', 'shape', 'userId', 'userNm', 'width']);
    expect(seat).toMatchObject({ itemType: 'SEAT', posX: 400, posY: 40, width: 60, height: 40, rotate: 0, shape: 'rect', userId: 'user001', userNm: '김민수' });
    expect(items.find((i) => i.itemId === 'S016')).toMatchObject({ userId: null, userNm: null });
  });

  it('배치도: 항목 추가·이동·삭제 일괄 저장, 크기 0 은 VALIDATION_ERROR', async () => {
    const [a, b] = [id('L1'), id('L2')];
    const base = { mapId: 'F4', itemType: 'SEAT', posX: 300, posY: 300, width: 60, height: 40, rotate: 0, shape: 'rect', userId: null };
    expect(await http.saveRows<LayoutItem>('/layouts/items', [
      { rowStatus: 'I', ...base, itemId: a, itemNm: '추가1' },
      { rowStatus: 'I', ...base, itemId: b, itemNm: '추가2', posX: 380 },
    ])).toEqual({ inserted: 2, updated: 0, deleted: 0 });

    expect(await http.saveRows<LayoutItem>('/layouts/items', [
      { rowStatus: 'U', ...base, itemId: a, itemNm: '이동', posX: 310, posY: 320, rotate: 90, userId: 'user002' },
      { rowStatus: 'D', mapId: 'F4', itemId: b },
    ])).toEqual({ inserted: 0, updated: 1, deleted: 1 });
    const items = await http.get<LayoutItem[]>('/layouts/items', { mapId: 'F4' });
    expect(items.find((i) => i.itemId === a)).toMatchObject({ itemNm: '이동', posX: 310, posY: 320, rotate: 90, userId: 'user002', userNm: '이영희' });
    expect(items.some((i) => i.itemId === b)).toBe(false);

    const bad = await fail(http.saveRows('/layouts/items', [{ rowStatus: 'I', ...base, itemId: id('L3'), width: 0 }]));
    expect(bad.code).toBe('VALIDATION_ERROR');
    expect(bad.fieldErrors.map((f) => f.field)).toContain('width');
    expect(await fail(http.saveRows('/layouts/items', [{ rowStatus: 'I', ...base, itemId: a }]))).toMatchObject({ code: 'CONFLICT', status: 409 });
  });
});
