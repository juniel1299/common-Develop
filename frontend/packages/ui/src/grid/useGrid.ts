import type { GridApi, IRowNode } from 'ag-grid-community';
import { useRef } from 'react';
import { applyDelete, collectChanges, newRowId, prepareRows, stripRow, validateRows } from './gridState';
import type { GridColumn, GridHandle, GridRow } from './types';

export interface BoundGrid<T> extends GridHandle<T> {
  _attach(api: GridApi | null): void;
  _setColumns(columns: GridColumn<T>[]): void;
}

export function isEditable<T>(col: GridColumn<T>, row: GridRow<T>): boolean {
  if (row.rowStatus === 'D' || !col.editable) return false;
  return typeof col.editable === 'function' ? col.editable(row) : true;
}

export function createGrid<T>(): BoundGrid<T> {
  let api: GridApi | null = null;
  let pending: GridRow<T>[] | null = null;
  let columns: GridColumn<T>[] = [];

  function displayed(): GridRow<T>[] {
    const out: GridRow<T>[] = [];
    api?.forEachNodeAfterFilterAndSort((n) => n.data && out.push(n.data as GridRow<T>));
    return out;
  }

  function nodesOf(rows: GridRow<T>[]): IRowNode[] {
    return rows.map((r) => api?.getRowNode(r.__rowId)).filter((n): n is IRowNode => !!n);
  }

  const handle: BoundGrid<T> = {
    get agApi() {
      return api;
    },
    setRows(rows) {
      const data = prepareRows(rows);
      if (api) api.setGridOption('rowData', data);
      else pending = data;
    },
    getRows: () => displayed().filter((r) => r.rowStatus !== 'D').map(stripRow),
    getSelected: () => ((api?.getSelectedRows() ?? []) as GridRow<T>[]).map(stripRow),
    addRow(defaults = {}, position = 'top') {
      if (!api) return;
      const row = { ...defaults, __rowId: newRowId(), rowStatus: 'I' } as GridRow<T>;
      api.applyTransaction({ add: [row], addIndex: position === 'top' ? 0 : undefined });
      const index = api.getRowNode(row.__rowId)?.rowIndex ?? 0;
      api.ensureIndexVisible(index);
      const first = columns.find((c) => !c.hide && isEditable(c, row));
      if (first) {
        // 버튼 클릭 직후에는 포커스가 버튼에 남아 있어서, 한 박자 뒤에 편집을 시작해야 입력칸에 커서가 들어간다
        const target = api;
        setTimeout(() => {
          target.setFocusedCell(index, first.field);
          target.startEditingCell({ rowIndex: index, colKey: first.field });
        }, 0);
      }
    },
    deleteSelected() {
      if (!api) return 0;
      api.stopEditing();
      const selected = api.getSelectedRows() as GridRow<T>[];
      const { remove, changed } = applyDelete(selected);
      api.applyTransaction({ remove, update: changed });
      api.redrawRows({ rowNodes: nodesOf(changed) });
      api.deselectAll();
      return selected.length;
    },
    getChanges() {
      api?.stopEditing();
      return collectChanges(displayed());
    },
    hasChanges: () => displayed().some((r) => r.rowStatus),
    validate() {
      api?.stopEditing();
      const errors = validateRows(displayed(), columns);
      const first = errors[0];
      if (api && first) {
        api.ensureIndexVisible(first.rowIndex);
        api.ensureColumnVisible(first.field);
        api.setFocusedCell(first.rowIndex, first.field);
      }
      return errors;
    },
    commit() {
      if (!api) return;
      const rows = displayed();
      const removed = rows.filter((r) => r.rowStatus === 'D');
      const kept = rows.filter((r) => r.rowStatus !== 'D');
      for (const r of kept) {
        r.rowStatus = undefined;
        delete r.__prevStatus;
      }
      api.applyTransaction({ remove: removed, update: kept });
      api.redrawRows();
    },
    _attach(next) {
      api = next;
      if (api) {
        api.setGridOption('rowData', pending ?? []);
        pending = null;
      }
    },
    _setColumns(next) {
      columns = next;
    },
  };
  return handle;
}

/**
 * 그리드 API 를 만든다.
 *
 * ```tsx
 * const grid = useGrid<Code>();
 * <DataGrid grid={grid} columns={...} editable />
 * grid.addRow({ useYn: 'Y' });
 * await http.saveRows('/codes', grid.getChanges());
 * ```
 */
export function useGrid<T = Record<string, unknown>>(): GridHandle<T> {
  const ref = useRef<BoundGrid<T> | null>(null);
  if (!ref.current) ref.current = createGrid<T>();
  return ref.current;
}
