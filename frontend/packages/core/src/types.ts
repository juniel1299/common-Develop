/** 공통 응답 형식. docs/api-convention.md 2장 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: ResultCode;
  message: string;
  data: T;
}

/** 기본 결과 코드. 업무 코드는 `BIZ_` 로 시작 */
export type ResultCode =
  | 'OK'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | `BIZ_${string}`;

export interface FieldError {
  field: string;
  message: string;
}

/** 목록 조회 요청. 조회 조건은 그 외 키로 함께 보낸다 */
export interface PageParams {
  page?: number;
  size?: number;
  /** `codeNm,asc` 형식. 여러 개면 배열 */
  sort?: string | string[];
}

export interface PageResult<T> {
  list: T[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
}

/** 그리드 행 상태. I 등록, U 수정, D 삭제 */
export type RowStatus = 'I' | 'U' | 'D';

export type SaveRow<T> = Partial<T> & { rowStatus: RowStatus };

export interface SaveResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export type YN = 'Y' | 'N';

export interface CodeItem {
  code: string;
  codeNm: string;
  [key: string]: unknown;
}

export interface CodeGroup {
  groupCd: string;
  codes: CodeItem[];
}
