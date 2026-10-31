import type { CodeItem, RowStatus, SaveRow } from '@common/core';
import type { ColDef, GridApi } from 'ag-grid-community';

export type GridColumnType = 'text' | 'number' | 'date' | 'code' | 'yn';

/** 그리드 컬럼 정의 (AG Grid ColDef 를 간단하게) */
export interface GridColumn<T = Record<string, unknown>> {
  field: keyof T & string;
  header: string;
  /** 기본 text */
  type?: GridColumnType;
  /** type 이 code 일 때 공통코드 그룹. 화면에는 코드명이 보인다 */
  codeGroup?: string;
  /** type 이 code 일 때 직접 옵션 */
  options?: CodeItem[];
  width?: number;
  /** width 가 없을 때 남는 폭 비율. 기본 1 */
  flex?: number;
  align?: 'left' | 'center' | 'right';
  /** 편집 가능 여부. 함수면 행마다 판단 (예: 신규 행만 PK 입력) */
  editable?: boolean | ((row: T & { rowStatus?: RowStatus }) => boolean);
  /** grid.validate() 에서 검사 */
  required?: boolean;
  maxLength?: number;
  pinned?: 'left' | 'right';
  hide?: boolean;
  /** 표시 형식을 직접 지정 */
  format?: (value: unknown, row: T) => string;
  /** AG Grid ColDef 를 직접 덮어쓸 때 */
  colDef?: Partial<ColDef>;
}

export type GridRow<T> = T & { __rowId: string; rowStatus?: RowStatus; __prevStatus?: RowStatus };

export interface GridValidationError {
  rowId: string;
  rowIndex: number;
  field: string;
  message: string;
}

/** 그리드 API. useGrid() 로 만들고 <DataGrid grid={grid}> 에 연결 */
export interface GridHandle<T = Record<string, unknown>> {
  /** 목록 데이터를 넣는다. 행 상태는 모두 초기화 */
  setRows(rows: T[]): void;
  /** 삭제(D) 표시된 행을 뺀 현재 행들 */
  getRows(): T[];
  getSelected(): T[];
  /** 새 행(I) 추가 후 첫 편집 칸으로 이동 */
  addRow(defaults?: Partial<T>, position?: 'top' | 'bottom'): void;
  /** 선택한 행 삭제. 신규 행은 바로 빠지고, 기존 행은 D 표시 (다시 누르면 취소) */
  deleteSelected(): number;
  /** 저장할 행들. D → U → I 순서. http.saveRows() 에 그대로 넘긴다 */
  getChanges(): SaveRow<T>[];
  hasChanges(): boolean;
  /** 필수·길이 검사. 오류가 있으면 첫 칸으로 이동하고 목록을 돌려준다 */
  validate(): GridValidationError[];
  /** 저장 성공 후: D 행을 지우고 상태 표시를 없앤다 (다시 조회하지 않을 때) */
  commit(): void;
  /** AG Grid 원본 API (준비 전에는 null) */
  readonly agApi: GridApi | null;
}
