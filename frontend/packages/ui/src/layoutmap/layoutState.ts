import type { LayoutItem, LayoutMapInfo } from './types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const snap = (v: number, grid: number) => (grid > 0 ? Math.round(v / grid) * grid : Math.round(v));

/** 90·270도면 가로세로가 바뀐다 */
export const isTurned = (item: LayoutItem) => (((item.rotate ?? 0) % 180) + 180) % 180 === 90;

/** 회전을 반영해 화면에 보이는 사각형 (회전은 항목 가운데 기준) */
export function visualBox(item: LayoutItem): Box {
  if (!isTurned(item)) return { x: item.posX, y: item.posY, w: item.width, h: item.height };
  const cx = item.posX + item.width / 2;
  const cy = item.posY + item.height / 2;
  return { x: cx - item.height / 2, y: cy - item.width / 2, w: item.height, h: item.width };
}

/** 보이는 사각형이 도면 밖으로 나가지 않게 posX·posY 를 맞춘다 */
export function clampPos(item: LayoutItem, map: LayoutMapInfo): { posX: number; posY: number } {
  const box = visualBox(item);
  const dx = Math.min(Math.max(box.x, 0), Math.max(map.width - box.w, 0)) - box.x;
  const dy = Math.min(Math.max(box.y, 0), Math.max(map.height - box.h, 0)) - box.y;
  return { posX: item.posX + dx, posY: item.posY + dy };
}

/** 끌기 시작 위치(start)에서 dx·dy 만큼 옮긴 위치. 격자에 맞추고 도면 안으로 */
export function movedPos(item: LayoutItem, start: { posX: number; posY: number }, dx: number, dy: number, map: LayoutMapInfo, grid: number) {
  return clampPos({ ...item, posX: snap(start.posX + dx, grid), posY: snap(start.posY + dy, grid) }, map);
}

/** 크기 조절. 회전된 항목은 화면 방향 그대로 늘어나도록 가로세로를 바꿔 적용한다 */
export function resizedSize(item: LayoutItem, start: { width: number; height: number }, dx: number, dy: number, map: LayoutMapInfo, grid: number) {
  const [ddw, ddh] = isTurned(item) ? [dy, dx] : [dx, dy];
  const min = Math.max(grid, 1);
  const width = Math.max(min, snap(start.width + ddw, grid));
  const height = Math.max(min, snap(start.height + ddh, grid));
  return { width: Math.min(width, map.width), height: Math.min(height, map.height) };
}

export const rotated = (item: LayoutItem) => ((item.rotate ?? 0) + 90) % 360;

/** prefix 로 시작하는 키 중 가장 큰 번호 + 1. ('S', ['S001','S007']) → 'S008' */
export function nextItemId(ids: string[], prefix: string, digits = 3): string {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  const max = ids.reduce((m, id) => Math.max(m, Number(re.exec(id)?.[1] ?? 0)), 0);
  return `${prefix}${String(max + 1).padStart(digits, '0')}`;
}

/** 화면(px) 크기에 도면 전체가 들어가는 배율과 위치 */
export function fitView(map: LayoutMapInfo, viewW: number, viewH: number, padding = 16) {
  const k = Math.max(0.05, Math.min((viewW - padding * 2) / map.width, (viewH - padding * 2) / map.height));
  return { k, tx: (viewW - map.width * k) / 2, ty: (viewH - map.height * k) / 2 };
}
