import { CompressOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, theme, Tooltip, Typography } from 'antd';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { fitView, movedPos, resizedSize, visualBox } from './layoutState';
import type { LayoutItem, LayoutItemStyle, LayoutLegend, LayoutMapHandle, LayoutMapInfo, LayoutRow } from './types';
import type { BoundLayout } from './useLayoutMap';

export interface LayoutMapProps<T extends LayoutItem> {
  layout: LayoutMapHandle<T>;
  map: LayoutMapInfo;
  /** 항목 데이터. 바뀔 때마다 layout.setItems() 와 같다 */
  items?: T[];
  /** 편집 모드: 끌어서 이동, 모서리로 크기 조절, 격자 표시, 방향키 이동, Delete 삭제 */
  editable?: boolean;
  /** 격자 간격(도면 단위). 이동·크기가 이 값에 맞춰진다. 0 이면 끔. 기본 10 */
  gridSize?: number;
  /** 기본 520 */
  height?: number | string;
  title?: ReactNode;
  /** 제목 줄 오른쪽 버튼 */
  extra?: ReactNode;
  /** 항목별 색. 상태(사용중/빈자리/고장 등)에 따라 바꿀 때 */
  itemStyle?: (item: T) => LayoutItemStyle | undefined;
  /** 항목 안 글자. 기본 itemNm ?? itemId */
  renderLabel?: (item: T) => string | null | undefined;
  /** 마우스를 올렸을 때 보일 내용 */
  tooltip?: (item: T) => ReactNode;
  /** 왼쪽 아래 범례 */
  legend?: LayoutLegend[];
  /** 항목 클릭 (조회·편집 모두) */
  onItemClick?: (item: T) => void;
  onItemDoubleClick?: (item: T) => void;
  /** 선택이 바뀔 때 */
  onSelect?: (items: T[]) => void;
}

type Drag =
  | { kind: 'move'; px: number; py: number; moved: boolean; start: Map<string, { posX: number; posY: number }>; itemId: string; additive: boolean }
  | { kind: 'resize'; px: number; py: number; itemId: string; start: { width: number; height: number } }
  | { kind: 'pan'; px: number; py: number; moved: boolean; tx: number; ty: number };

const STATUS_STROKE = { I: '#16a34a', U: '#d97706', D: '#dc2626' } as const;

/**
 * 배치도 (좌석·설비·매장 진열·주차면 등). 도면 이미지 위에 항목을 놓고, 조회 모드에서는 상태 색과 클릭,
 * 편집 모드에서는 이동·크기·회전·추가·삭제 후 그리드처럼 rowStatus 로 일괄 저장한다. SVG 만 쓰므로 추가 라이브러리가 없다.
 */
export function LayoutMap<T extends LayoutItem>({
  layout,
  map,
  items,
  editable = false,
  gridSize = 10,
  height = 520,
  title,
  extra,
  itemStyle,
  renderLabel,
  tooltip,
  legend,
  onItemClick,
  onItemDoubleClick,
  onSelect,
}: LayoutMapProps<T>) {
  const { token } = theme.useToken();
  const bound = layout as BoundLayout<T>;
  const patternId = `lm-grid${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<Drag | null>(null);
  const fitted = useRef(false);

  const rows = useSyncExternalStore(bound._subscribe, bound._rows, bound._rows);
  const selected = useSyncExternalStore(bound._subscribe, bound._selected, bound._selected);

  useEffect(() => {
    if (items) layout.setItems(items);
  }, [items, layout]);

  // 선택 변경 알림
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => {
    onSelectRef.current?.(layout.getSelected());
  }, [selected, layout]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (size.w && size.h) setView(fitView(map, size.w, size.h, 40)); // 아래쪽 범례·확대 버튼 자리
  }, [map, size.w, size.h]);

  // 처음 크기가 잡힐 때, 도면이 바뀔 때 전체 보기
  useEffect(() => {
    fitted.current = false;
  }, [map.width, map.height]);
  useEffect(() => {
    if (!fitted.current && size.w && size.h) {
      fitted.current = true;
      fit();
    }
  }, [fit, size.w, size.h]);

  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const k = Math.min(20, Math.max(0.05, v.k * factor));
      const f = k / v.k;
      return { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
    });
  }, []);

  useEffect(() => {
    bound._attach({
      fit,
      zoom: (f) => zoomAt(f, size.w / 2, size.h / 2),
      center: () => {
        const v = viewRef.current;
        return size.w ? { x: (size.w / 2 - v.tx) / v.k, y: (size.h / 2 - v.ty) / v.k } : { x: map.width / 2, y: map.height / 2 };
      },
      map,
      gridSize,
    });
    return () => bound._attach(null);
  }, [bound, fit, zoomAt, map, gridSize, size.w, size.h]);

  // 휠 확대·축소 (passive 가 아니어야 페이지 스크롤을 막을 수 있다)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const capture = (e: PointerEvent) => svgRef.current?.setPointerCapture?.(e.pointerId);

  function startItem(e: PointerEvent, row: LayoutRow<T>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    boxRef.current?.focus({ preventScroll: true });
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    // 이미 선택된 여러 항목 중 하나를 잡으면 함께 끈다
    if (!selected.has(row.itemId) || additive) bound._toggle(row.itemId, additive);
    if (!editable || row.rowStatus === 'D') {
      drag.current = { kind: 'move', px: e.clientX, py: e.clientY, moved: false, start: new Map(), itemId: row.itemId, additive };
      return;
    }
    const ids = additive ? bound._selected() : selected.has(row.itemId) ? selected : new Set([row.itemId]);
    const start = new Map(rows.filter((r) => ids.has(r.itemId) && r.rowStatus !== 'D').map((r) => [r.itemId, { posX: r.posX, posY: r.posY }]));
    drag.current = { kind: 'move', px: e.clientX, py: e.clientY, moved: false, start, itemId: row.itemId, additive };
    capture(e);
  }

  function startResize(e: PointerEvent, row: LayoutRow<T>) {
    e.stopPropagation();
    drag.current = { kind: 'resize', px: e.clientX, py: e.clientY, itemId: row.itemId, start: { width: row.width, height: row.height } };
    capture(e);
  }

  function startPan(e: PointerEvent) {
    if (e.button !== 0) return;
    boxRef.current?.focus({ preventScroll: true });
    drag.current = { kind: 'pan', px: e.clientX, py: e.clientY, moved: false, tx: view.tx, ty: view.ty };
    capture(e);
  }

  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const sx = e.clientX - d.px;
    const sy = e.clientY - d.py;
    if (d.kind === 'pan') {
      if (!d.moved && Math.hypot(sx, sy) < 3) return;
      d.moved = true;
      setView((v) => ({ ...v, tx: d.tx + sx, ty: d.ty + sy }));
      return;
    }
    const dx = sx / view.k;
    const dy = sy / view.k;
    if (d.kind === 'resize') {
      const row = rows.find((r) => r.itemId === d.itemId);
      if (row) bound._patch(d.itemId, resizedSize(row, d.start, dx, dy, map, gridSize) as Partial<T>);
      return;
    }
    if (!d.start.size || (!d.moved && Math.hypot(sx, sy) < 3)) return;
    d.moved = true;
    for (const [id, start] of d.start) {
      const row = rows.find((r) => r.itemId === id);
      if (row) bound._patch(id, movedPos(row, start, dx, dy, map, gridSize) as Partial<T>);
    }
  }

  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === 'pan' && !d.moved) layout.select([]);
    if (d.kind === 'move' && !d.moved) {
      const row = rows.find((r) => r.itemId === d.itemId);
      // 여러 개 선택된 상태에서 하나를 그냥 클릭하면 그것만 선택
      if (!d.additive && selected.size > 1) bound._toggle(d.itemId, false);
      if (row) onItemClick?.(row);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') return layout.select([]);
    if (!editable || !selected.size) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      layout.deleteSelected();
      return;
    }
    const step = Math.max(gridSize, 1) * (e.shiftKey ? 5 : 1);
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    for (const r of rows.filter((x) => selected.has(x.itemId) && x.rowStatus !== 'D')) {
      bound._patch(r.itemId, movedPos(r, r, move[0]!, move[1]!, map, gridSize) as Partial<T>);
    }
  }

  const single = selected.size === 1 ? rows.find((r) => selected.has(r.itemId) && r.rowStatus !== 'D') : undefined;
  const handle = Math.max(6, 8 / view.k);

  function renderItem(row: LayoutRow<T>) {
    const s = itemStyle?.(row) ?? {};
    const isSel = selected.has(row.itemId);
    const deleted = row.rowStatus === 'D';
    const cx = row.posX + row.width / 2;
    const cy = row.posY + row.height / 2;
    const stroke = isSel ? token.colorPrimary : row.rowStatus ? STATUS_STROKE[row.rowStatus] : (s.stroke ?? token.colorBorder);
    const label = renderLabel ? renderLabel(row) : (row.itemNm ?? row.itemId);
    const fontSize = Math.max(9, Math.min(14, Math.min(row.width, row.height) / 3));
    const shapeProps = {
      fill: s.fill ?? token.colorFillQuaternary,
      stroke,
      strokeWidth: isSel || row.rowStatus ? 2 : 1,
      strokeDasharray: deleted || s.dashed ? '4 3' : undefined,
      vectorEffect: 'non-scaling-stroke' as const,
    };
    const g = (
      <g
        key={row.__rowId}
        data-item-id={row.itemId}
        opacity={deleted ? 0.4 : 1}
        style={{ cursor: editable && !deleted ? 'move' : 'pointer' }}
        onPointerDown={(e) => startItem(e, row)}
        onDoubleClick={() => onItemDoubleClick?.(row)}
      >
        <g transform={row.rotate ? `rotate(${row.rotate} ${cx} ${cy})` : undefined}>
          {row.shape === 'circle' ? (
            <ellipse cx={cx} cy={cy} rx={row.width / 2} ry={row.height / 2} {...shapeProps} />
          ) : (
            <rect x={row.posX} y={row.posY} width={row.width} height={row.height} rx={2} {...shapeProps} />
          )}
        </g>
        {label ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={fontSize}
            fill={s.textColor ?? token.colorText}
            textDecoration={deleted ? 'line-through' : undefined}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
    const tip = tooltip?.(row);
    return tip && !drag.current ? (
      <Tooltip key={row.__rowId} title={tip} mouseEnterDelay={0.3}>
        {g}
      </Tooltip>
    ) : (
      g
    );
  }

  const overlay = { position: 'absolute', background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius } as const;

  return (
    <div>
      {title || extra ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <Typography.Text strong>{title}</Typography.Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{extra}</div>
        </div>
      ) : null}
      <div
        ref={boxRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative',
          height,
          overflow: 'hidden',
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          background: token.colorBgLayout,
          outline: 'none',
          touchAction: 'none',
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: 'block', cursor: drag.current?.kind === 'pan' ? 'grabbing' : 'grab' }}
          onPointerDown={startPan}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {editable && gridSize > 0 ? (
            <defs>
              <pattern id={patternId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={token.colorBorderSecondary} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              </pattern>
            </defs>
          ) : null}
          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            <rect width={map.width} height={map.height} fill={token.colorBgContainer} stroke={token.colorBorder} vectorEffect="non-scaling-stroke" />
            {map.bgUrl ? <image href={map.bgUrl} width={map.width} height={map.height} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} /> : null}
            {editable && gridSize > 0 ? <rect width={map.width} height={map.height} fill={`url(#${patternId})`} style={{ pointerEvents: 'none' }} /> : null}
            {/* 선택한 항목을 위에 그린다 (끌 때 다른 항목에 가려지지 않게) */}
            {[...rows].sort((a, b) => Number(selected.has(a.itemId)) - Number(selected.has(b.itemId))).map(renderItem)}
            {editable && single ? (
              <rect
                data-resize-handle
                x={visualBox(single).x + visualBox(single).w - handle / 2}
                y={visualBox(single).y + visualBox(single).h - handle / 2}
                width={handle}
                height={handle}
                fill={token.colorBgContainer}
                stroke={token.colorPrimary}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'nwse-resize' }}
                onPointerDown={(e) => startResize(e, single)}
              />
            ) : null}
          </g>
        </svg>
        {legend?.length ? (
          <div style={{ ...overlay, left: 8, bottom: 8, padding: '4px 8px', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
            {legend.map((l, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, border: `1px solid ${token.colorBorder}` }} />
                {l.label}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ ...overlay, right: 8, bottom: 8, display: 'flex' }}>
          <Button type="text" size="small" icon={<PlusOutlined />} aria-label="확대" onClick={() => layout.zoomIn()} />
          <Button type="text" size="small" icon={<MinusOutlined />} aria-label="축소" onClick={() => layout.zoomOut()} />
          <Button type="text" size="small" icon={<CompressOutlined />} aria-label="전체 보기" onClick={() => layout.fit()} />
        </div>
      </div>
    </div>
  );
}
