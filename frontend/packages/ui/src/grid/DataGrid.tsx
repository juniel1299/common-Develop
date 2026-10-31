import { AG_GRID_LOCALE_KR } from '@ag-grid-community/locale';
import type { CodeItem, CodeMap, RowStatus } from '@common/core';
import { AllCommunityModule, createPart, themeQuartz, type ColDef, type RowClassParams, type RowStyle } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Pagination, theme, Typography } from 'antd';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCodes } from '../provider/CommonProvider';
import type { GridColumn, GridHandle, GridRow } from './types';
import { markUpdated } from './gridState';
import { isEditable, type BoundGrid } from './useGrid';

const modules = [AllCommunityModule];

// 헤더 글자 정렬을 셀 정렬과 맞춘다
const alignPart = createPart({
  feature: 'commonHeaderAlign',
  css: `
    .cm-header-center .ag-header-cell-label { justify-content: center; }
    .cm-header-right .ag-header-cell-label { justify-content: flex-end; }
  `,
});

const STATUS_LABEL: Record<RowStatus, string> = { I: '추가', U: '수정', D: '삭제' };
const YN_OPTIONS: CodeItem[] = [
  { code: 'Y', codeNm: 'Y' },
  { code: 'N', codeNm: 'N' },
];

export interface GridPagination {
  page: number;
  size: number;
  totalCount: number;
  onChange: (page: number, size: number) => void;
  pageSizeOptions?: number[];
}

export interface DataGridProps<T> {
  grid: GridHandle<T>;
  columns: GridColumn<T>[];
  /** 목록 데이터. 바뀔 때마다 grid.setRows() 와 같다 */
  rows?: T[];
  /** 편집 그리드: 상태 컬럼, 행 선택 체크박스, 셀 편집을 켠다 */
  editable?: boolean;
  /** 행 선택. 기본: editable 이면 multiple, 아니면 없음 */
  selection?: 'single' | 'multiple' | false;
  /** 기본 400. 'auto' 면 행 수에 맞춤 (적은 건수 목록용) */
  height?: number | string | 'auto';
  loading?: boolean;
  /** 서버 페이징. 없으면 페이지 표시 안 함 */
  pagination?: GridPagination;
  title?: ReactNode;
  /** 제목 줄 오른쪽 버튼 (추가, 삭제, 저장, 엑셀 등) */
  extra?: ReactNode;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
}

function alignStyle(align: GridColumn['align']): ColDef['cellStyle'] {
  return align ? { textAlign: align, justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' } : undefined;
}

function toColDef<T>(col: GridColumn<T>, codes: CodeMap, editableGrid: boolean): ColDef {
  const def: ColDef = {
    field: col.field,
    headerName: editableGrid && col.required ? `${col.header} *` : col.header,
    width: col.width,
    flex: col.width ? undefined : (col.flex ?? 1),
    minWidth: 70,
    hide: col.hide,
    pinned: col.pinned,
    editable: editableGrid && col.editable ? (p) => isEditable(col, p.data as GridRow<T>) : false,
    // 값이 바뀌는 순간 U 표시. cellValueChanged 이벤트는 비동기라서, 편집 직후 바로 저장하면 놓칠 수 있다
    valueSetter: (p) => {
      if (p.oldValue === p.newValue) return false;
      const row = p.data as GridRow<T> & Record<string, unknown>;
      row[col.field] = p.newValue;
      markUpdated(row);
      return true;
    },
  };
  let align = col.align;

  switch (col.type) {
    case 'number':
      align ??= 'right';
      def.cellDataType = 'number';
      def.cellEditor = 'agNumberCellEditor';
      def.valueFormatter = (p) => (p.value == null || p.value === '' ? '' : Number(p.value).toLocaleString());
      break;
    case 'date':
      align ??= 'center';
      def.cellDataType = 'dateString';
      def.cellEditor = 'agDateStringCellEditor';
      break;
    case 'code':
    case 'yn': {
      align ??= 'center';
      const items = col.options ?? (col.codeGroup ? codes[col.codeGroup] : undefined) ?? (col.type === 'yn' ? YN_OPTIONS : []);
      def.cellDataType = 'text';
      def.refData = Object.fromEntries(items.map((c) => [c.code, c.codeNm]));
      def.cellEditor = 'agSelectCellEditor';
      def.cellEditorParams = { values: items.map((c) => c.code) };
      break;
    }
    default:
      def.cellDataType = 'text';
      if (col.maxLength) def.cellEditorParams = { maxLength: col.maxLength };
  }
  if (col.format) def.valueFormatter = (p) => col.format!(p.value, p.data as T);
  def.cellStyle = alignStyle(align);
  if (align === 'center' || align === 'right') def.headerClass = `cm-header-${align}`;
  return { ...def, ...col.colDef };
}

/**
 * 공통 그리드 (AG Grid Community, MIT).
 * 편집 그리드는 행 상태(I/U/D)를 추적해서 grid.getChanges() 로 일괄 저장 형식을 만들어준다.
 */
export function DataGrid<T>({
  grid,
  columns,
  rows,
  editable = false,
  selection,
  height = 400,
  loading,
  pagination,
  title,
  extra,
  onRowClick,
  onRowDoubleClick,
}: DataGridProps<T>) {
  const { token } = theme.useToken();
  const bound = grid as BoundGrid<T>;
  bound._setColumns(columns);
  const [count, setCount] = useState(0);

  const groups = useMemo(() => columns.filter((c) => c.type === 'code' && c.codeGroup && !c.options).map((c) => c.codeGroup), [columns]);
  const { codes } = useCodes(groups);

  const columnDefs = useMemo<ColDef[]>(() => {
    const defs = columns.map((c) => toColDef(c, codes, editable));
    if (!editable) return defs;
    const status: ColDef = {
      headerName: '상태',
      field: 'rowStatus',
      width: 64,
      pinned: 'left',
      editable: false,
      sortable: false,
      valueFormatter: (p) => (p.value ? STATUS_LABEL[p.value as RowStatus] : ''),
      headerClass: 'cm-header-center',
      cellStyle: (p) => {
        const color = { I: token.colorSuccess, U: token.colorPrimary, D: token.colorError }[p.value as RowStatus];
        return { textAlign: 'center', justifyContent: 'center', fontWeight: 500, ...(color ? { color } : {}) };
      },
    };
    return [status, ...defs];
  }, [columns, codes, editable, token]);

  const gridTheme = useMemo(
    () =>
      themeQuartz.withParams({
        accentColor: token.colorPrimary,
        borderColor: token.colorBorderSecondary,
        foregroundColor: token.colorText,
        headerBackgroundColor: token.colorFillAlter,
        headerFontWeight: 600,
        fontFamily: token.fontFamily,
        fontSize: token.fontSize,
        rowHeight: 34,
        headerHeight: 36,
        spacing: 6,
        wrapperBorderRadius: token.borderRadiusLG,
        browserColorScheme: 'light',
      }).withPart(alignPart),
    [token],
  );

  const mode = selection ?? (editable ? 'multiple' : false);
  const rowSelection = useMemo(
    () => (mode === 'multiple' ? ({ mode: 'multiRow', enableClickSelection: false } as const) : mode === 'single' ? ({ mode: 'singleRow', checkboxes: false, enableClickSelection: true } as const) : undefined),
    [mode],
  );

  useEffect(() => {
    if (rows) grid.setRows(rows);
  }, [rows, grid]);

  useEffect(() => () => bound._attach(null), [bound]);

  const getRowStyle = (p: RowClassParams): RowStyle | undefined =>
    (p.data as GridRow<T> | undefined)?.rowStatus === 'D' ? { textDecoration: 'line-through', color: token.colorTextDisabled } : undefined;

  const total = pagination?.totalCount ?? count;
  const autoHeight = height === 'auto';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {title && <Typography.Text strong style={{ fontSize: token.fontSizeLG }}>{title}</Typography.Text>}
          <Typography.Text type="secondary">
            총 <b style={{ color: token.colorText }}>{total.toLocaleString()}</b>건
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>{extra}</div>
      </div>
      <div style={{ height: autoHeight ? undefined : height, width: '100%' }}>
        <AgGridReact
          modules={modules}
          theme={gridTheme}
          localeText={AG_GRID_LOCALE_KR}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
          domLayout={autoHeight ? 'autoHeight' : 'normal'}
          getRowId={(p) => (p.data as GridRow<T>).__rowId}
          rowSelection={rowSelection}
          loading={loading}
          stopEditingWhenCellsLoseFocus
          getRowStyle={getRowStyle}
          onGridReady={(e) => bound._attach(e.api)}
          onRowDataUpdated={(e) => setCount(e.api.getDisplayedRowCount())}
          onCellValueChanged={(e) => e.api.refreshCells({ rowNodes: [e.node], columns: ['rowStatus'], force: true })}
          onRowClicked={(e) => onRowClick && e.data && onRowClick(e.data as T)}
          onRowDoubleClicked={(e) => onRowDoubleClick && e.data && onRowDoubleClick(e.data as T)}
        />
      </div>
      {pagination && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            size="small"
            current={pagination.page}
            pageSize={pagination.size}
            total={pagination.totalCount}
            pageSizeOptions={pagination.pageSizeOptions ?? [20, 50, 100]}
            showSizeChanger
            onChange={pagination.onChange}
          />
        </div>
      )}
    </div>
  );
}
