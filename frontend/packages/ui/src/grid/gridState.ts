import type { SaveRow } from '@common/core';
import type { GridColumn, GridRow, GridValidationError } from './types';

let seq = 0;
export const newRowId = () => `r${++seq}`;

export function prepareRows<T>(rows: T[]): GridRow<T>[] {
  return rows.map((r) => ({ ...r, __rowId: newRowId(), rowStatus: undefined }));
}

/** 편집된 행 표시. 신규(I)·삭제(D) 행은 그대로 */
export function markUpdated<T>(row: GridRow<T>): void {
  if (!row.rowStatus) row.rowStatus = 'U';
}

/** 삭제 처리. 신규 행은 remove 로, 기존 행은 D 로 표시하거나 이미 D 면 원래 상태로 되돌린다 */
export function applyDelete<T>(rows: GridRow<T>[]): { remove: GridRow<T>[]; changed: GridRow<T>[] } {
  const remove: GridRow<T>[] = [];
  const changed: GridRow<T>[] = [];
  for (const row of rows) {
    if (row.rowStatus === 'I') remove.push(row);
    else if (row.rowStatus === 'D') {
      row.rowStatus = row.__prevStatus;
      delete row.__prevStatus;
      changed.push(row);
    } else {
      row.__prevStatus = row.rowStatus;
      row.rowStatus = 'D';
      changed.push(row);
    }
  }
  return { remove, changed };
}

export function stripRow<T>(row: GridRow<T>): T {
  const { __rowId: _id, __prevStatus: _prev, rowStatus: _status, ...rest } = row;
  return rest as unknown as T;
}

const ORDER = { D: 0, U: 1, I: 2 } as const;

export function collectChanges<T>(rows: GridRow<T>[]): SaveRow<T>[] {
  return rows
    .filter((r) => r.rowStatus)
    .sort((a, b) => ORDER[a.rowStatus!] - ORDER[b.rowStatus!])
    .map((r) => ({ ...stripRow(r), rowStatus: r.rowStatus! }) as SaveRow<T>);
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/** 변경된 행(I·U)만 검사한다. 삭제 행과 손대지 않은 행은 건너뜀 */
export function validateRows<T>(rows: GridRow<T>[], columns: GridColumn<T>[]): GridValidationError[] {
  const errors: GridValidationError[] = [];
  rows.forEach((row, rowIndex) => {
    if (row.rowStatus !== 'I' && row.rowStatus !== 'U') return;
    for (const col of columns) {
      const v = (row as Record<string, unknown>)[col.field];
      if (col.required && isEmpty(v)) {
        errors.push({ rowId: row.__rowId, rowIndex, field: col.field, message: `${rowIndex + 1}행 ${col.header}은(는) 필수입니다.` });
      } else if (col.maxLength && typeof v === 'string' && v.length > col.maxLength) {
        errors.push({ rowId: row.__rowId, rowIndex, field: col.field, message: `${rowIndex + 1}행 ${col.header}은(는) ${col.maxLength}자 이하입니다.` });
      }
    }
  });
  return errors;
}
