import dayjs, { type Dayjs } from 'dayjs';
import type { FieldDef, Values } from './types';

export const DATE_FORMAT = 'YYYY-MM-DD';
export const MONTH_FORMAT = 'YYYY-MM';

export function rangeNames(field: FieldDef): [string, string] {
  return field.rangeNames ?? [`${field.name}From`, `${field.name}To`];
}

function toDayjs(value: unknown, format: string): Dayjs | null {
  if (value == null || value === '') return null;
  if (dayjs.isDayjs(value)) return value;
  const d = dayjs(value as string, format);
  return d.isValid() ? d : dayjs(value as string).isValid() ? dayjs(value as string) : null;
}

function fromDayjs(value: unknown, format: string): string | null {
  if (value == null || value === '') return null;
  return dayjs.isDayjs(value) ? value.format(format) : String(value);
}

function emptyOf(field: FieldDef): unknown {
  if (field.type === 'multiSelect' || field.type === 'checkbox') return [];
  // '전체' 가 있는 셀렉트·라디오는 빈 값일 때 '전체'(값 '')가 선택되어 보이도록
  if ((field.type === 'select' || field.type === 'radio') && field.all) return '';
  return null;
}

/** 화면 내부 값(antd: Dayjs, boolean, [from,to]) → API 규약 값 */
export function toExternal(fields: FieldDef[], internal: Values, extra: Values = {}): Values {
  const out: Values = { ...extra };
  for (const f of fields) {
    const v = internal[f.name];
    switch (f.type) {
      case 'date':
        out[f.name] = fromDayjs(v, DATE_FORMAT);
        break;
      case 'month':
        out[f.name] = fromDayjs(v, MONTH_FORMAT);
        break;
      case 'dateRange': {
        const [from, to] = rangeNames(f);
        const [a, b] = Array.isArray(v) ? v : [];
        out[from] = fromDayjs(a, DATE_FORMAT);
        out[to] = fromDayjs(b, DATE_FORMAT);
        break;
      }
      case 'yn':
        out[f.name] = v ? 'Y' : 'N';
        break;
      case 'number':
        out[f.name] = v === '' || v == null ? null : Number(v);
        break;
      case 'text':
      case 'password':
      case 'textarea':
      case undefined:
        out[f.name] = v === undefined || v === '' ? null : typeof v === 'string' ? v.trim() : v;
        break;
      case 'select':
      case 'radio':
        out[f.name] = v === undefined || v === '' ? null : v;
        break;
      default:
        out[f.name] = v === undefined || v === null ? emptyOf(f) : v;
    }
  }
  return out;
}

/** API 규약 값 → 화면 내부 값. 정의에 없는 키는 extra 로 따로 돌려준다 (숨은 PK 등) */
export function toInternal(fields: FieldDef[], external: Values): { values: Values; extra: Values } {
  const values: Values = {};
  const used = new Set<string>();
  for (const f of fields) {
    switch (f.type) {
      case 'date':
        values[f.name] = toDayjs(external[f.name], DATE_FORMAT);
        used.add(f.name);
        break;
      case 'month':
        values[f.name] = toDayjs(external[f.name], MONTH_FORMAT);
        used.add(f.name);
        break;
      case 'dateRange': {
        const [from, to] = rangeNames(f);
        const a = toDayjs(external[from], DATE_FORMAT);
        const b = toDayjs(external[to], DATE_FORMAT);
        values[f.name] = a || b ? [a, b] : null;
        used.add(from).add(to).add(f.name);
        break;
      }
      case 'yn':
        values[f.name] = external[f.name] === 'Y' || external[f.name] === true;
        used.add(f.name);
        break;
      default:
        values[f.name] = external[f.name] ?? emptyOf(f);
        used.add(f.name);
    }
  }
  const extra: Values = {};
  for (const [k, v] of Object.entries(external)) if (!used.has(k)) extra[k] = v;
  return { values, extra };
}

/** set(key, value) 의 key 가 어느 필드에 속하는지. dateRange 의 from/to 키도 찾는다 */
export function findField(fields: FieldDef[], key: string): FieldDef | undefined {
  return fields.find((f) => f.name === key || (f.type === 'dateRange' && rangeNames(f).includes(key)));
}
