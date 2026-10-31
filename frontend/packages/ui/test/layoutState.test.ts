import { describe, expect, it } from 'vitest';
import { clampPos, fitView, movedPos, nextItemId, resizedSize, visualBox } from '../src/layoutmap/layoutState';
import { createLayout } from '../src/layoutmap/useLayoutMap';
import type { LayoutItem } from '../src/layoutmap/types';

const map = { width: 400, height: 300 };
const item = (id: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({ itemId: id, posX: 0, posY: 0, width: 60, height: 40, rotate: 0, ...extra });

describe('배치도 좌표 계산', () => {
  it('이동은 격자에 맞추고 도면 밖으로 나가지 않는다', () => {
    const a = item('A', { posX: 100, posY: 100 });
    expect(movedPos(a, a, 13, 26, map, 10)).toEqual({ posX: 110, posY: 130 });
    expect(movedPos(a, a, -500, 500, map, 10)).toEqual({ posX: 0, posY: 260 });
  });

  it('90도 회전하면 보이는 가로세로가 바뀌고, 그 기준으로 도면 안에 둔다', () => {
    const a = item('A', { posX: 0, posY: 0, rotate: 90 });
    expect(visualBox(a)).toEqual({ x: 10, y: -10, w: 40, h: 60 });
    expect(clampPos(a, map)).toEqual({ posX: 0, posY: 10 });
  });

  it('크기 조절: 최소 격자 1칸, 회전된 항목은 화면 방향대로', () => {
    expect(resizedSize(item('A'), { width: 60, height: 40 }, 24, -100, map, 10)).toEqual({ width: 80, height: 10 });
    expect(resizedSize(item('A', { rotate: 90 }), { width: 60, height: 40 }, 20, 0, map, 10)).toEqual({ width: 60, height: 60 });
  });

  it('다음 키 번호', () => {
    expect(nextItemId(['S001', 'S007', 'R001', 'Sx'], 'S')).toBe('S008');
    expect(nextItemId([], 'R', 2)).toBe('R01');
  });

  it('전체 보기 배율', () => {
    expect(fitView(map, 432, 632, 16)).toEqual({ k: 1, tx: 16, ty: 166 });
  });
});

describe('배치도 API', () => {
  it('추가·수정·삭제 → getChanges 는 D → U → I, commit 후 상태 없음', () => {
    const layout = createLayout<LayoutItem>();
    layout.setItems([item('A'), item('B', { posX: 100 }), item('C', { posX: 200 })]);
    layout.updateItem('A', { itemNm: '창가' });
    layout.updateItem('B', { posX: 100 }); // 값이 같으면 수정 아님
    layout.select(['C']);
    expect(layout.deleteSelected()).toBe(1);
    layout.addItem({ itemId: layout.nextId('A'), posX: 300, posY: 200 });

    expect(layout.getChanges().map((r) => [r.rowStatus, r.itemId])).toEqual([
      ['D', 'C'],
      ['U', 'A'],
      ['I', 'A001'],
    ]);
    expect(layout.getChanges()[1]).toEqual({ itemId: 'A', itemNm: '창가', posX: 0, posY: 0, width: 60, height: 40, rotate: 0, rowStatus: 'U' });
    expect(layout.getItems().map((r) => r.itemId)).toEqual(['A', 'B', 'A001']);

    layout.commit();
    expect(layout.hasChanges()).toBe(false);
    expect(layout.getItems().map((r) => r.itemId)).toEqual(['A', 'B', 'A001']);
  });

  it('신규 항목 삭제는 바로 사라지고, 기존 항목은 다시 삭제하면 취소', () => {
    const layout = createLayout<LayoutItem>();
    layout.setItems([item('A')]);
    layout.addItem({ itemId: 'N' });
    layout.select(['N']);
    layout.deleteSelected();
    expect(layout.getChanges()).toEqual([]);
    layout.select(['A']);
    layout.deleteSelected();
    expect(layout.getChanges().map((r) => r.rowStatus)).toEqual(['D']);
    layout.select(['A']);
    layout.deleteSelected();
    expect(layout.hasChanges()).toBe(false);
  });

  it('같은 키는 추가할 수 없다', () => {
    const layout = createLayout<LayoutItem>();
    layout.setItems([item('A')]);
    expect(() => layout.addItem({ itemId: 'A' })).toThrow('이미 있는 항목입니다: A');
  });

  it('회전은 90도씩, 기존 항목은 U', () => {
    const layout = createLayout<LayoutItem>();
    layout.setItems([item('A', { posX: 100, posY: 100, rotate: 270 })]);
    layout.select(['A']);
    layout.rotateSelected();
    expect(layout.getChanges()).toMatchObject([{ itemId: 'A', rotate: 0, rowStatus: 'U' }]);
  });
});
