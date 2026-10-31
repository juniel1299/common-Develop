import { useRef } from 'react';
import { applyDelete, collectChanges, markUpdated, newRowId, prepareRows, stripRow } from '../grid/gridState';
import type { GridRow } from '../grid/types';
import { clampPos, nextItemId, rotated, snap } from './layoutState';
import type { LayoutItem, LayoutMapHandle, LayoutMapInfo, LayoutRow } from './types';

/** LayoutMap 컴포넌트가 붙이는 화면 기능 */
export interface LayoutView {
  fit(): void;
  zoom(factor: number): void;
  /** 지금 보이는 화면 가운데의 도면 좌표 */
  center(): { x: number; y: number };
  map: LayoutMapInfo;
  gridSize: number;
}

export interface BoundLayout<T extends LayoutItem> extends LayoutMapHandle<T> {
  _rows(): LayoutRow<T>[];
  _selected(): Set<string>;
  _subscribe(fn: () => void): () => void;
  _attach(view: LayoutView | null): void;
  /** 컴포넌트 안에서 끌기·크기 조절 결과를 반영 */
  _patch(itemId: string, patch: Partial<T>): void;
  _toggle(itemId: string, additive: boolean): void;
}

export function createLayout<T extends LayoutItem>(): BoundLayout<T> {
  let rows: LayoutRow<T>[] = [];
  let selected = new Set<string>();
  let view: LayoutView | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  const find = (id: string) => rows.find((r) => r.itemId === id);

  function patch(itemId: string, values: Partial<T>, mark: boolean) {
    const row = find(itemId);
    if (!row || row.rowStatus === 'D') return;
    const changed = Object.entries(values).some(([k, v]) => (row as unknown as Record<string, unknown>)[k] !== v);
    if (!changed) return;
    Object.assign(row, values);
    if (mark) markUpdated(row as unknown as GridRow<T>);
    rows = [...rows];
    notify();
  }

  const handle: BoundLayout<T> = {
    setItems(items) {
      rows = prepareRows(items) as LayoutRow<T>[];
      selected = new Set();
      notify();
    },
    getItems: () => rows.filter((r) => r.rowStatus !== 'D').map((r) => stripRow(r as unknown as GridRow<T>)),
    getSelected: () => rows.filter((r) => selected.has(r.itemId)).map((r) => stripRow(r as unknown as GridRow<T>)),
    select(ids) {
      selected = new Set(ids.filter((id) => find(id)));
      notify();
    },
    addItem(item) {
      if (find(item.itemId)) throw new Error(`이미 있는 항목입니다: ${item.itemId}`);
      const grid = view?.gridSize ?? 10;
      const width = item.width ?? grid * 4;
      const height = item.height ?? grid * 4;
      const c = view?.center() ?? { x: width / 2, y: height / 2 };
      const base = {
        rotate: 0,
        ...item,
        width,
        height,
        posX: item.posX ?? snap(c.x - width / 2, grid),
        posY: item.posY ?? snap(c.y - height / 2, grid),
      } as T;
      const pos = view ? clampPos(base, view.map) : { posX: base.posX, posY: base.posY };
      rows = [...rows, { ...base, ...pos, __rowId: newRowId(), rowStatus: 'I' } as LayoutRow<T>];
      selected = new Set([item.itemId]);
      notify();
    },
    updateItem: (itemId, values) => patch(itemId, values, true),
    deleteSelected() {
      const targets = rows.filter((r) => selected.has(r.itemId));
      const { remove } = applyDelete(targets as unknown as GridRow<T>[]);
      const removed = new Set(remove.map((r) => r.__rowId));
      rows = rows.filter((r) => !removed.has(r.__rowId));
      selected = new Set();
      notify();
      return targets.length;
    },
    rotateSelected() {
      for (const r of rows.filter((x) => selected.has(x.itemId))) {
        const next = { ...r, rotate: rotated(r) };
        patch(r.itemId, { rotate: next.rotate, ...(view ? clampPos(next, view.map) : {}) } as Partial<T>, true);
      }
    },
    nextId: (prefix, digits) => nextItemId(rows.map((r) => r.itemId), prefix, digits),
    getChanges: () => collectChanges(rows as unknown as GridRow<T>[]),
    hasChanges: () => rows.some((r) => r.rowStatus),
    commit() {
      rows = rows
        .filter((r) => r.rowStatus !== 'D')
        .map((r) => {
          const { __prevStatus: _p, ...rest } = r;
          return { ...rest, rowStatus: undefined } as LayoutRow<T>;
        });
      selected = new Set([...selected].filter((id) => find(id)));
      notify();
    },
    fit: () => view?.fit(),
    zoomIn: () => view?.zoom(1.25),
    zoomOut: () => view?.zoom(0.8),
    _rows: () => rows,
    _selected: () => selected,
    _subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    _attach(next) {
      view = next;
    },
    _patch: (itemId, values) => patch(itemId, values, true),
    _toggle(itemId, additive) {
      if (!additive) selected = new Set([itemId]);
      else {
        selected = new Set(selected);
        if (selected.has(itemId)) selected.delete(itemId);
        else selected.add(itemId);
      }
      notify();
    },
  };
  return handle;
}

/**
 * 배치도 API 를 만든다.
 *
 * ```tsx
 * const layout = useLayoutMap<Seat>();
 * <LayoutMap layout={layout} map={map} items={items} editable />
 * layout.addItem({ itemId: layout.nextId('S'), itemType: 'SEAT', width: 60, height: 40 });
 * await http.saveRows('/layouts/items', layout.getChanges());
 * ```
 */
export function useLayoutMap<T extends LayoutItem = LayoutItem>(): LayoutMapHandle<T> {
  const ref = useRef<BoundLayout<T> | null>(null);
  if (!ref.current) ref.current = createLayout<T>();
  return ref.current;
}
