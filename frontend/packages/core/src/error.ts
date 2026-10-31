import type { FieldError, ResultCode } from './types';

/** API 실패. success=false 응답과 네트워크 오류를 모두 이 형태로 바꿔서 던진다 */
export class ApiError<T = unknown> extends Error {
  readonly code: ResultCode;
  readonly status: number | undefined;
  readonly data: T | null;

  constructor(code: ResultCode, message: string, status?: number, data: T | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }

  /** VALIDATION_ERROR 일 때 필드별 에러. 폼에 바로 표시할 수 있다 */
  get fieldErrors(): FieldError[] {
    const errors = (this.data as { errors?: unknown } | null)?.errors;
    return Array.isArray(errors) ? (errors as FieldError[]) : [];
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
