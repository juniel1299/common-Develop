import type { CodeItem } from '@common/core';
import type { FormInstance } from 'antd';
import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';

export type FieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiSelect'
  | 'radio'
  | 'checkbox'
  | 'yn'
  | 'date'
  | 'month'
  | 'dateRange'
  | 'custom';

/** 조회영역·폼영역 필드 정의 */
export interface FieldDef {
  /** 값의 키. camelCase (`userNm`) */
  name: string;
  label: ReactNode;
  /** 기본 text */
  type?: FieldType;
  /** select·radio·checkbox 옵션을 공통코드에서 가져올 때 그룹코드 */
  codeGroup?: string;
  /** 직접 옵션을 줄 때. codeGroup 보다 우선 */
  options?: CodeItem[];
  /** select·radio 에 '전체' 항목 추가. 문자열이면 그 문구로. 조회영역에서는 기본 true */
  all?: boolean | string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  /** antd Form 검증 규칙을 직접 추가 */
  rules?: Rule[];
  placeholder?: string;
  disabled?: boolean;
  /** 차지할 칸 수. 기본 1 */
  span?: number;
  hidden?: boolean;
  /** dateRange 의 실제 키. 기본 `${name}From`, `${name}To` */
  rangeNames?: [string, string];
  /** type 이 custom 일 때 그릴 입력 컴포넌트. antd Form.Item 안에 들어가므로 value/onChange 를 받는다 */
  render?: () => ReactNode;
  /** 입력 컴포넌트에 그대로 넘길 props */
  inputProps?: Record<string, unknown>;
}

export type Values = Record<string, unknown>;

export interface FieldErrorLike {
  field: string;
  message: string;
}

/**
 * 조회영역·폼영역 API.
 * 값은 항상 API 규약 형식(문자열 날짜, 'Y'/'N', from/to 분리)으로 주고받는다.
 */
export interface AreaApi<T extends object = Values> {
  /** 전체 값 */
  get(): T;
  /** 키 하나의 값 */
  get<K extends keyof T & string>(key: K): T[K];
  set<K extends keyof T & string>(key: K, value: T[K] | null): void;
  set(values: Partial<T>): void;
  /** 처음 값(initialValues)으로 되돌린다 */
  reset(): void;
  /** 모든 값을 비운다 */
  clear(): void;
  /** 검증 후 값을 돌려준다. 실패하면 첫 오류 칸으로 이동하고 예외를 던진다 */
  validate(): Promise<T>;
  /** 서버 VALIDATION_ERROR 의 필드 오류를 칸 아래에 표시 */
  setErrors(errors: FieldErrorLike[]): void;
  /** 처음 값과 달라졌는지 */
  isDirty(): boolean;
  /** antd FormInstance. 특수한 경우에만 직접 사용 */
  form: FormInstance;
}
