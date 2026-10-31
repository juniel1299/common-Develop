import type { ApiResponse, FieldError, ResultCode, RowStatus } from '@common/core';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { createDb, type MockCode, type MockDb, type MockLayoutItem, type MockUser } from './db';

/**
 * 백엔드 없이 화면을 돌려보기 위한 가짜 API. docs/api-convention.md 를 그대로 따른다.
 * http.client.defaults.adapter = createMockAdapter();
 */

class HttpFail extends Error {
  constructor(
    readonly status: number,
    readonly code: ResultCode,
    message: string,
    readonly data: unknown = null,
  ) {
    super(message);
  }
}

type Params = Record<string, unknown>;
type Route = (params: Params, body: Params, match: string[]) => unknown;

function page<T>(list: T[], params: Params) {
  const pageNo = Math.max(1, Number(params.page ?? 1));
  const size = Math.min(1000, Math.max(1, Number(params.size ?? 20)));
  const totalCount = list.length;
  return {
    list: list.slice((pageNo - 1) * size, pageNo * size),
    page: pageNo,
    size,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };
}

function sortBy<T>(list: T[], sort: unknown, allowed: (keyof T & string)[]): T[] {
  const specs = (Array.isArray(sort) ? sort : sort ? [sort] : []).map(String);
  const out = [...list];
  for (const spec of specs.reverse()) {
    const [field, dir] = spec.split(',');
    if (!field || !allowed.includes(field as keyof T & string)) throw new HttpFail(400, 'BAD_REQUEST', `정렬할 수 없는 항목입니다: ${field}`);
    const sign = dir === 'desc' ? -1 : 1;
    out.sort((a, b) => {
      const x = a[field as keyof T] as unknown as string | number | null;
      const y = b[field as keyof T] as unknown as string | number | null;
      return x === y ? 0 : x == null ? 1 : y == null ? -1 : x > y ? sign : -sign;
    });
  }
  return out;
}

function validateUser(u: Params, creating: boolean, db: MockDb) {
  const errors: FieldError[] = [];
  if (creating && !String(u.userId ?? '').trim()) errors.push({ field: 'userId', message: '아이디는 필수입니다.' });
  if (creating && u.userId && !/^[a-z0-9_]{3,20}$/.test(String(u.userId))) errors.push({ field: 'userId', message: '아이디는 영문 소문자·숫자 3~20자입니다.' });
  if (!String(u.userNm ?? '').trim()) errors.push({ field: 'userNm', message: '이름은 필수입니다.' });
  if (!u.deptCd) errors.push({ field: 'deptCd', message: '부서는 필수입니다.' });
  if (u.email && !/^[^@\s]+@[^@\s]+$/.test(String(u.email))) errors.push({ field: 'email', message: '이메일 형식이 아닙니다.' });
  if (errors.length) throw new HttpFail(400, 'VALIDATION_ERROR', '입력값을 확인해주세요.', { errors });
  if (creating && db.users.some((x) => x.userId === u.userId)) throw new HttpFail(409, 'CONFLICT', '이미 있는 아이디입니다.');
}

function pickUser(body: Params, base?: MockUser): MockUser {
  const n = (v: unknown) => (v === undefined || v === '' ? null : v);
  return {
    userId: String(base?.userId ?? body.userId),
    userNm: String(body.userNm ?? base?.userNm ?? '').trim(),
    deptCd: String(body.deptCd ?? base?.deptCd),
    email: (n(body.email) as string | null) ?? null,
    joinDt: (n(body.joinDt) as string | null) ?? null,
    salary: body.salary == null || body.salary === '' ? null : Number(body.salary),
    useYn: body.useYn === 'N' ? 'N' : 'Y',
    remark: (n(body.remark) as string | null) ?? null,
    regDt: base?.regDt ?? new Date().toISOString().slice(0, 19),
  };
}

function rowsOf(body: Params, required: [string, string][] = []): (Params & { rowStatus: RowStatus })[] {
  const rows = body.rows;
  if (!Array.isArray(rows)) throw new HttpFail(400, 'BAD_REQUEST', 'rows 가 필요합니다.');
  // 필수값 검사 (삭제 행은 첫 번째 키만)
  const errors: FieldError[] = [];
  (rows as Params[]).forEach((r, i) => {
    for (const [field, label] of r.rowStatus === 'D' ? required.slice(0, 1) : required) {
      if (!String(r[field] ?? '').trim()) errors.push({ field, message: `${i + 1}행 ${label}은(는) 필수입니다.` });
    }
  });
  if (errors.length) throw new HttpFail(400, 'VALIDATION_ERROR', '입력값을 확인해주세요.', { errors });
  return rows as (Params & { rowStatus: RowStatus })[];
}

function routes(db: MockDb): [string, RegExp, Route][] {
  return [
    [
      'GET',
      /^\/common\/codes$/,
      (p) =>
        String(p.groupCd ?? '')
          .split(',')
          .filter(Boolean)
          .map((groupCd) => ({
            groupCd,
            codes: db.codes
              .filter((c) => c.groupCd === groupCd && c.useYn === 'Y')
              .sort((a, b) => a.sortOrd - b.sortOrd)
              .map(({ code, codeNm }) => ({ code, codeNm })),
          })),
    ],
    [
      'GET',
      /^\/users$/,
      (p) => {
        let list = db.users.filter(
          (u) =>
            (!p.userNm || u.userNm.includes(String(p.userNm))) &&
            (!p.userId || u.userId.includes(String(p.userId))) &&
            (!p.deptCd || u.deptCd === p.deptCd) &&
            (!p.useYn || u.useYn === p.useYn) &&
            (!p.joinDtFrom || (u.joinDt ?? '') >= String(p.joinDtFrom)) &&
            (!p.joinDtTo || (u.joinDt ?? '') <= String(p.joinDtTo)),
        );
        list = sortBy(list, p.sort ?? 'userId,asc', ['userId', 'userNm', 'deptCd', 'joinDt', 'salary', 'regDt']);
        return page(list, p);
      },
    ],
    [
      'GET',
      /^\/users\/([^/]+)$/,
      (_p, _b, [id]) => {
        const u = db.users.find((x) => x.userId === id);
        if (!u) throw new HttpFail(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');
        return u;
      },
    ],
    [
      'POST',
      /^\/users$/,
      (_p, body) => {
        validateUser(body, true, db);
        const u = pickUser(body);
        db.users.unshift(u);
        return u;
      },
    ],
    [
      'PUT',
      /^\/users\/([^/]+)$/,
      (_p, body, [id]) => {
        const i = db.users.findIndex((x) => x.userId === id);
        if (i < 0) throw new HttpFail(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');
        validateUser(body, false, db);
        db.users[i] = pickUser(body, db.users[i]);
        return db.users[i];
      },
    ],
    [
      'DELETE',
      /^\/users\/([^/]+)$/,
      (_p, _b, [id]) => {
        const before = db.users.length;
        db.users = db.users.filter((x) => x.userId !== id);
        if (db.users.length === before) throw new HttpFail(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.');
        return null;
      },
    ],
    [
      'POST',
      /^\/users\/save$/,
      (_p, body) => {
        const result = { inserted: 0, updated: 0, deleted: 0 };
        const next = [...db.users];
        for (const r of rowsOf(body)) {
          if (r.rowStatus === 'D') {
            const i = next.findIndex((x) => x.userId === r.userId);
            if (i >= 0) next.splice(i, 1), result.deleted++;
          } else if (r.rowStatus === 'U') {
            const i = next.findIndex((x) => x.userId === r.userId);
            if (i < 0) throw new HttpFail(404, 'NOT_FOUND', `사용자를 찾을 수 없습니다: ${String(r.userId)}`);
            validateUser(r, false, db);
            next[i] = pickUser(r, next[i]);
            result.updated++;
          } else {
            validateUser(r, true, { ...db, users: next });
            next.unshift(pickUser(r));
            result.inserted++;
          }
        }
        db.users = next; // 한 건이라도 실패하면 반영하지 않음 (트랜잭션 흉내)
        return result;
      },
    ],
    ['GET', /^\/codes\/groups$/, () => db.groups],
    [
      'GET',
      /^\/codes$/,
      (p) => db.codes.filter((c) => c.groupCd === p.groupCd).sort((a, b) => a.sortOrd - b.sortOrd),
    ],
    [
      'POST',
      /^\/codes\/groups\/save$/,
      (_p, body) => {
        const result = { inserted: 0, updated: 0, deleted: 0 };
        for (const r of rowsOf(body, [['groupCd', '그룹코드'], ['groupNm', '그룹명']])) {
          const i = db.groups.findIndex((g) => g.groupCd === r.groupCd);
          if (r.rowStatus === 'D') {
            if (db.codes.some((c) => c.groupCd === r.groupCd)) throw new HttpFail(409, 'CONFLICT', `하위 코드가 있어 삭제할 수 없습니다: ${String(r.groupCd)}`);
            if (i >= 0) db.groups.splice(i, 1), result.deleted++;
          } else if (r.rowStatus === 'U') {
            if (i >= 0) db.groups[i] = { ...db.groups[i]!, groupNm: String(r.groupNm), useYn: r.useYn === 'N' ? 'N' : 'Y' };
            result.updated++;
          } else {
            if (i >= 0) throw new HttpFail(409, 'CONFLICT', `이미 있는 그룹코드입니다: ${String(r.groupCd)}`);
            db.groups.push({ groupCd: String(r.groupCd), groupNm: String(r.groupNm), useYn: r.useYn === 'N' ? 'N' : 'Y' });
            result.inserted++;
          }
        }
        return result;
      },
    ],
    [
      'POST',
      /^\/codes\/save$/,
      (_p, body) => {
        const result = { inserted: 0, updated: 0, deleted: 0 };
        for (const r of rowsOf(body, [['groupCd', '그룹코드'], ['code', '코드'], ['codeNm', '코드명']])) {
          const i = db.codes.findIndex((c) => c.groupCd === r.groupCd && c.code === r.code);
          const item: MockCode = {
            groupCd: String(r.groupCd),
            code: String(r.code),
            codeNm: String(r.codeNm),
            sortOrd: Number(r.sortOrd ?? 0),
            useYn: r.useYn === 'N' ? 'N' : 'Y',
          };
          if (r.rowStatus === 'D') {
            if (i >= 0) db.codes.splice(i, 1), result.deleted++;
          } else if (r.rowStatus === 'U') {
            if (i >= 0) db.codes[i] = item;
            result.updated++;
          } else {
            if (i >= 0) throw new HttpFail(409, 'CONFLICT', `이미 있는 코드입니다: ${item.code}`);
            db.codes.push(item);
            result.inserted++;
          }
        }
        return result;
      },
    ],
    ['GET', /^\/layouts$/, () => db.layoutMaps.filter((m) => m.useYn === 'Y')],
    [
      'GET',
      /^\/layouts\/items$/,
      (p) =>
        db.layoutItems
          .filter((i) => i.mapId === p.mapId)
          .sort((a, b) => (a.itemId < b.itemId ? -1 : 1))
          .map((i) => ({ ...i, userNm: db.users.find((u) => u.userId === i.userId)?.userNm ?? null })),
    ],
    [
      'POST',
      /^\/layouts\/items\/save$/,
      (_p, body) => {
        const result = { inserted: 0, updated: 0, deleted: 0 };
        const next = [...db.layoutItems];
        const rows = rowsOf(body, [['mapId', '도면'], ['itemId', '항목키'], ['itemType', '종류']]);
        const errors: FieldError[] = [];
        rows.forEach((r, i) => {
          if (r.rowStatus === 'D') return;
          for (const [f, label] of [['width', '가로'], ['height', '세로']] as const) {
            if (!(Number(r[f]) > 0)) errors.push({ field: f, message: `${i + 1}행 ${label}은(는) 1 이상입니다.` });
          }
        });
        if (errors.length) throw new HttpFail(400, 'VALIDATION_ERROR', '입력값을 확인해주세요.', { errors });
        for (const r of rows) {
          const i = next.findIndex((x) => x.mapId === r.mapId && x.itemId === r.itemId);
          const item: MockLayoutItem = {
            mapId: String(r.mapId),
            itemId: String(r.itemId),
            itemNm: r.itemNm ? String(r.itemNm) : null,
            itemType: String(r.itemType),
            posX: Math.round(Number(r.posX ?? 0)),
            posY: Math.round(Number(r.posY ?? 0)),
            width: Math.round(Number(r.width)),
            height: Math.round(Number(r.height)),
            rotate: Number(r.rotate ?? 0),
            shape: r.shape === 'circle' ? 'circle' : 'rect',
            userId: r.userId ? String(r.userId) : null,
          };
          if (r.rowStatus === 'D') {
            if (i >= 0) next.splice(i, 1), result.deleted++;
          } else if (r.rowStatus === 'U') {
            if (i < 0) throw new HttpFail(404, 'NOT_FOUND', `항목을 찾을 수 없습니다: ${item.itemId}`);
            next[i] = item;
            result.updated++;
          } else {
            if (i >= 0) throw new HttpFail(409, 'CONFLICT', `이미 있는 항목키입니다: ${item.itemId}`);
            next.push(item);
            result.inserted++;
          }
        }
        db.layoutItems = next;
        return result;
      },
    ],
  ];
}

export interface MockOptions {
  /** 응답 지연(ms). 로딩 표시 확인용. 기본 150 */
  delay?: number;
  db?: MockDb;
}

export function createMockAdapter(options: MockOptions = {}): AxiosAdapter {
  const db = options.db ?? createDb();
  const table = routes(db);
  const delay = options.delay ?? 150;

  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await new Promise((r) => setTimeout(r, delay));
    const method = (config.method ?? 'get').toUpperCase();
    const path = (config.url ?? '').split('?')[0]!.replace(/^\/api/, '');
    const body = typeof config.data === 'string' && config.data ? (JSON.parse(config.data) as Params) : ((config.data as Params) ?? {});
    const respond = (status: number, data: ApiResponse): AxiosResponse => ({ data, status, statusText: '', headers: {}, config });

    try {
      for (const [m, re, handler] of table) {
        const match = m === method ? re.exec(path) : null;
        if (match) {
          const data = handler((config.params as Params) ?? {}, body, match.slice(1).map(decodeURIComponent));
          return respond(200, { success: true, code: 'OK', message: '정상 처리되었습니다.', data });
        }
      }
      throw new HttpFail(404, 'NOT_FOUND', `없는 API 입니다: ${method} ${path}`);
    } catch (e) {
      const f = e instanceof HttpFail ? e : new HttpFail(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
      const res = respond(f.status, { success: false, code: f.code, message: f.message, data: f.data });
      throw new AxiosError(f.message, 'ERR_BAD_RESPONSE', config, null, res);
    }
  };
}
