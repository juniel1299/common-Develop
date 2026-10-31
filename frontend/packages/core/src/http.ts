import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { camelizeKeys } from './case';
import { ApiError } from './error';
import type { ApiResponse, PageParams, PageResult, SaveResult, SaveRow } from './types';

export interface HttpOptions {
  /** 예: `/api` 또는 `https://example.com/api` */
  baseURL?: string;
  timeout?: number;
  /** 토큰을 돌려주면 `Authorization: Bearer {token}` 헤더를 붙인다 */
  getToken?: () => string | null | undefined;
  /** 401 응답 시 호출 (로그인 화면 이동 등) */
  onUnauthorized?: (error: ApiError) => void;
  /** 모든 실패 시 호출 (공통 에러 메시지 표시 등). 호출 측 catch 와 별개로 실행된다 */
  onError?: (error: ApiError) => void;
  /**
   * 응답 키를 camelCase로 한 번 더 변환한다. 기본 false.
   * 규약상 백엔드가 변환하므로, 규약을 따르지 않는 레거시 API에 붙일 때만 켠다.
   */
  camelizeResponse?: boolean;
  /** GET 파라미터에서 빈 문자열·null·undefined 를 뺀다. 기본 true (조회영역 빈 칸 처리) */
  cleanParams?: boolean;
}

export interface RequestOptions extends AxiosRequestConfig {
  /** true면 이 요청은 onError 를 호출하지 않는다 (화면에서 직접 처리할 때) */
  silent?: boolean;
}

export interface Http {
  /** axios 원본. 파일 다운로드 등 특수한 경우에만 직접 사용 */
  client: AxiosInstance;
  get<T = unknown>(url: string, params?: object, options?: RequestOptions): Promise<T>;
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = unknown>(url: string, params?: object, options?: RequestOptions): Promise<T>;
  /** 페이징 목록 조회 */
  getPage<T = unknown>(url: string, params?: PageParams & Record<string, unknown>, options?: RequestOptions): Promise<PageResult<T>>;
  /** 그리드 일괄 저장. `POST {url}/save` */
  saveRows<T = unknown>(url: string, rows: SaveRow<T>[], options?: RequestOptions): Promise<SaveResult>;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    silent?: boolean;
  }
}

export function cleanParams(params: object | undefined): Record<string, unknown> | undefined {
  if (!params) return params;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

function isEnvelope(body: unknown): body is ApiResponse {
  return typeof body === 'object' && body !== null && 'success' in body && 'code' in body;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const body = error.response?.data;
    if (isEnvelope(body)) return new ApiError(body.code, body.message, status, body.data);
    if (!error.response) return new ApiError('NETWORK_ERROR', '서버에 연결할 수 없습니다.', undefined);
    const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR';
    return new ApiError(code, '요청을 처리하지 못했습니다.', status);
  }
  return new ApiError('SERVER_ERROR', error instanceof Error ? error.message : String(error));
}

export function createHttp(options: HttpOptions = {}): Http {
  const { getToken, onUnauthorized, onError, camelizeResponse = false } = options;
  const shouldClean = options.cleanParams ?? true;

  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30_000,
    headers: { 'Content-Type': 'application/json' },
    // sort=a,asc&sort=b,desc 형식 (배열을 sort[]= 로 보내지 않음)
    paramsSerializer: { indexes: null },
  });

  client.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    if (shouldClean && config.params) config.params = cleanParams(config.params);
    return config;
  });

  async function request<T>(config: RequestOptions): Promise<T> {
    try {
      const res = await client.request(config);
      const body: unknown = camelizeResponse ? camelizeKeys(res.data) : res.data;
      if (!isEnvelope(body)) return body as T; // 파일 등 규약 밖 응답은 그대로
      if (!body.success) throw new ApiError(body.code, body.message, res.status, body.data);
      return body.data as T;
    } catch (e) {
      const err = toApiError(e);
      if (err.code === 'UNAUTHORIZED') onUnauthorized?.(err);
      if (!config.silent) onError?.(err);
      throw err;
    }
  }

  return {
    client,
    get: (url, params, opts) => request({ ...opts, method: 'GET', url, params }),
    post: (url, body, opts) => request({ ...opts, method: 'POST', url, data: body }),
    put: (url, body, opts) => request({ ...opts, method: 'PUT', url, data: body }),
    delete: (url, params, opts) => request({ ...opts, method: 'DELETE', url, params }),
    getPage: (url, params, opts) => request({ ...opts, method: 'GET', url, params: { page: 1, size: 20, ...params } }),
    saveRows: (url, rows, opts) =>
      request({ ...opts, method: 'POST', url: `${url.replace(/\/$/, '')}/save`, data: { rows } }),
  };
}
