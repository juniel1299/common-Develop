import { Form, type FormInstance } from 'antd';
import { useRef } from 'react';
import { findField, rangeNames, toExternal, toInternal } from './convert';
import type { AreaApi, FieldDef, FieldErrorLike, Values } from './types';

/** 컴포넌트가 영역에 필드 정의를 연결할 때 쓰는 내부 메서드 */
export interface BoundArea<T extends object = Values> extends AreaApi<T> {
  _bind(fields: FieldDef[], initialValues?: Partial<T>): Values;
  _setFields(fields: FieldDef[]): void;
}

function stableStringify(v: Values): string {
  return JSON.stringify(Object.keys(v).sort().map((k) => [k, v[k]]));
}

export function createArea<T extends object>(form: FormInstance): BoundArea<T> {
  let fields: FieldDef[] = [];
  let initial: Values = {};
  let extra: Values = {};

  const current = (): Values => toExternal(fields, form.getFieldsValue(true) as Values, extra);

  function apply(external: Values) {
    const next = toInternal(fields, external);
    extra = next.extra;
    form.setFieldsValue(next.values);
  }

  function focus(name: string) {
    form.scrollToField(name);
    (form as FormInstance & { focusField?: (n: string) => void }).focusField?.(name);
  }

  const api: BoundArea<T> = {
    form,
    get: ((key?: string) => {
      const all = current();
      return key === undefined ? all : all[key];
    }) as AreaApi<T>['get'],
    set: ((keyOrValues: string | Values, value?: unknown) => {
      const patch = typeof keyOrValues === 'string' ? { [keyOrValues]: value } : keyOrValues;
      apply({ ...current(), ...patch });
    }) as AreaApi<T>['set'],
    reset() {
      form.resetFields();
      apply(initial);
    },
    clear() {
      form.resetFields();
      apply({});
    },
    async validate() {
      try {
        await form.validateFields();
      } catch (e) {
        const first = (e as { errorFields?: { name: (string | number)[] }[] }).errorFields?.[0];
        if (first) focus(String(first.name[0]));
        throw e;
      }
      return current() as T;
    },
    setErrors(errors: FieldErrorLike[]) {
      const list = errors
        .map((e) => {
          const f = findField(fields, e.field);
          return f ? { name: f.name, errors: [e.message] } : null;
        })
        .filter((x): x is { name: string; errors: string[] } => x !== null);
      form.setFields(list);
      if (list[0]) focus(list[0].name);
    },
    isDirty() {
      const base = toInternal(fields, initial);
      return stableStringify(current()) !== stableStringify(toExternal(fields, base.values, base.extra));
    },
    _bind(nextFields, initialValues = {}) {
      fields = nextFields;
      initial = { ...initialValues };
      const next = toInternal(fields, { ...initial, ...extra });
      extra = next.extra;
      return next.values;
    },
    _setFields(nextFields) {
      fields = nextFields;
    },
  };
  return api;
}

/**
 * 조회영역·폼영역에 연결할 API 를 만든다.
 *
 * ```tsx
 * const search = useArea<UserSearch>();
 * <SearchArea area={search} fields={...} onSearch={load} />
 * search.get();               // { userNm: '홍', useYn: 'Y', regDtFrom: '2026-10-01', regDtTo: null }
 * search.set('useYn', 'N');
 * ```
 */
export function useArea<T extends object = Values>(): AreaApi<T> {
  const [form] = Form.useForm();
  const ref = useRef<BoundArea<T> | null>(null);
  if (!ref.current) ref.current = createArea<T>(form);
  return ref.current;
}

export { rangeNames };
