import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createCodeStore, createHttp, type HttpOptions } from '../src';

type Reply = { status: number; data: unknown } | 'network';

/** axios 어댑터를 바꿔서 서버 없이 테스트 */
function setup(reply: (config: InternalAxiosRequestConfig) => Reply, options: HttpOptions = {}) {
  const http = createHttp({ baseURL: '/api', ...options });
  const calls: InternalAxiosRequestConfig[] = [];
  http.client.defaults.adapter = async (config) => {
    calls.push(config);
    const r = reply(config);
    if (r === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: r.data, status: r.status, statusText: '', headers: {}, config };
    if (r.status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  return { http, calls };
}

const ok = (data: unknown) => ({ status: 200, data: { success: true, code: 'OK', message: '', data } });

describe('createHttp', () => {
  it('성공 응답은 data 만 꺼내준다', async () => {
    const { http } = setup(() => ok({ codeNm: '사용' }));
    await expect(http.get('/x')).resolves.toEqual({ codeNm: '사용' });
  });

  it('success=false 는 ApiError 로 던지고 fieldErrors 를 준다', async () => {
    const body = { success: false, code: 'VALIDATION_ERROR', message: '입력값을 확인해주세요.', data: { errors: [{ field: 'codeNm', message: '필수' }] } };
    const onError = vi.fn();
    const { http } = setup(() => ({ status: 400, data: body }), { onError });
    const err = await http.post('/x', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('VALIDATION_ERROR');
    expect((err as ApiError).fieldErrors).toEqual([{ field: 'codeNm', message: '필수' }]);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('401 이면 onUnauthorized 호출, silent 면 onError 생략', async () => {
    const onUnauthorized = vi.fn();
    const onError = vi.fn();
    const { http } = setup(() => ({ status: 401, data: '' }), { onUnauthorized, onError });
    await expect(http.get('/x', undefined, { silent: true })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('네트워크 오류는 NETWORK_ERROR', async () => {
    const { http } = setup(() => 'network');
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('토큰 헤더를 붙이고 빈 조회조건은 뺀다', async () => {
    const { http, calls } = setup(() => ok([]), { getToken: () => 'abc' });
    await http.get('/x', { codeNm: '', useYn: 'Y', regDt: null, sort: ['a,asc', 'b,desc'] });
    const c = calls[0]!;
    expect(AxiosHeaders.from(c.headers).get('Authorization')).toBe('Bearer abc');
    expect(c.params).toEqual({ useYn: 'Y', sort: ['a,asc', 'b,desc'] });
    expect(http.client.getUri(c)).toBe('/api/x?useYn=Y&sort=a,asc&sort=b,desc');
  });

  it('getPage 는 기본 page=1,size=20', async () => {
    const { http, calls } = setup(() => ok({ list: [], page: 1, size: 20, totalCount: 0, totalPages: 0 }));
    await http.getPage('/x', { codeNm: 'a' });
    expect(calls[0]!.params).toEqual({ page: 1, size: 20, codeNm: 'a' });
  });

  it('saveRows 는 {url}/save 로 rows 를 보낸다', async () => {
    const { http, calls } = setup(() => ok({ inserted: 1, updated: 0, deleted: 0 }));
    await http.saveRows('/code/', [{ rowStatus: 'I', code: 'A' }]);
    expect(calls[0]!.url).toBe('/code/save');
    expect(JSON.parse(calls[0]!.data as string)).toEqual({ rows: [{ rowStatus: 'I', code: 'A' }] });
  });

  it('camelizeResponse 를 켜면 레거시 응답 키를 바꾼다', async () => {
    const { http } = setup(() => ({ status: 200, data: { success: true, code: 'OK', message: '', data: [{ CODE_NM: 'a' }] } }), { camelizeResponse: true });
    await expect(http.get('/x')).resolves.toEqual([{ codeNm: 'a' }]);
  });
});

describe('createCodeStore', () => {
  it('없는 그룹만 조회하고 캐시한다', async () => {
    const { http, calls } = setup((c) => {
      const groups = String(c.params.groupCd).split(',');
      return ok(groups.filter((g) => g === 'USE_YN').map((g) => ({ groupCd: g, codes: [{ code: 'Y', codeNm: '사용' }] })));
    });
    const store = createCodeStore(http);
    const [a, b] = await Promise.all([store.load(['USE_YN', 'NONE']), store.load(['USE_YN'])]);
    expect(a).toEqual({ USE_YN: [{ code: 'Y', codeNm: '사용' }], NONE: [] });
    expect(b.USE_YN).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(store.name('USE_YN', 'Y')).toBe('사용');
    expect(store.name('USE_YN', 'X')).toBe('X');
  });
});
