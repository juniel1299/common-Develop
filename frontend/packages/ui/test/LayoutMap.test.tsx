import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutMap } from '../src/layoutmap/LayoutMap';
import { createLayout } from '../src/layoutmap/useLayoutMap';
import type { LayoutItem } from '../src/layoutmap/types';

type Seat = LayoutItem & { userNm?: string | null };
const map = { width: 400, height: 300 };
const items: Seat[] = [
  { itemId: 'S001', itemNm: '1번', posX: 10, posY: 10, width: 60, height: 40, userNm: '김민수' },
  { itemId: 'S002', itemNm: '2번', posX: 100, posY: 10, width: 60, height: 40, userNm: null },
];

describe('LayoutMap', () => {
  it('항목 이름과 범례를 그리고, 클릭하면 선택·onItemClick', () => {
    const layout = createLayout<Seat>();
    const onClick = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <LayoutMap
        layout={layout}
        map={map}
        items={items}
        legend={[{ label: '사용중', color: '#2563eb' }]}
        itemStyle={(s) => ({ fill: s.userNm ? '#2563eb' : '#fff' })}
        onItemClick={onClick}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('1번')).toBeTruthy();
    expect(screen.getByText('사용중')).toBeTruthy();
    expect(container.querySelector('[data-item-id="S001"] rect')?.getAttribute('fill')).toBe('#2563eb');

    const g = container.querySelector('[data-item-id="S002"]')!;
    fireEvent.pointerDown(g, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(g, { clientX: 5, clientY: 5 });
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'S002' }));
    expect(layout.getSelected().map((s) => s.itemId)).toEqual(['S002']);
    expect(onSelect).toHaveBeenLastCalledWith([expect.objectContaining({ itemId: 'S002' })]);
  });

  it('편집 모드: 끌어서 이동하면 U, 방향키로 이동, Delete 로 삭제 표시', () => {
    const layout = createLayout<Seat>();
    const { container } = render(<LayoutMap layout={layout} map={map} items={items} editable gridSize={10} />);
    const g = container.querySelector('[data-item-id="S001"]')!;
    // jsdom 은 크기가 0 이라 배율 1 로 계산된다
    fireEvent.pointerDown(g, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(g, { clientX: 22, clientY: 31 });
    fireEvent.pointerUp(g, { clientX: 22, clientY: 31 });
    expect(layout.getChanges()).toMatchObject([{ itemId: 'S001', posX: 30, posY: 40, rowStatus: 'U' }]);

    const box = container.querySelector('[tabindex="0"]')!;
    fireEvent.keyDown(box, { key: 'ArrowRight' });
    expect(layout.getItems()[0]).toMatchObject({ posX: 40, posY: 40 });
    fireEvent.keyDown(box, { key: 'Delete' });
    expect(layout.getChanges()).toMatchObject([{ itemId: 'S001', rowStatus: 'D' }]);
    expect(container.querySelector('[data-item-id="S001"]')?.getAttribute('opacity')).toBe('0.4');
  });

  it('조회 모드에서는 끌어도 움직이지 않는다', () => {
    const layout = createLayout<Seat>();
    const { container } = render(<LayoutMap layout={layout} map={map} items={items} />);
    const g = container.querySelector('[data-item-id="S001"]')!;
    fireEvent.pointerDown(g, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(g, { clientX: 50, clientY: 50 });
    fireEvent.pointerUp(g, { clientX: 50, clientY: 50 });
    expect(layout.hasChanges()).toBe(false);
    act(() => layout.addItem({ itemId: 'S003' }));
    expect(container.querySelector('[data-item-id="S003"]')).toBeTruthy();
  });
});
