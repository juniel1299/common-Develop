import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CommonProvider, DataGrid, useGrid, type GridColumn, type GridHandle } from '../src';

type Code = { code: string; codeNm: string; useYn: string };
const columns: GridColumn<Code>[] = [
  { field: 'code', header: '코드', required: true, editable: (r) => r.rowStatus === 'I' },
  { field: 'codeNm', header: '코드명', required: true, editable: true },
  { field: 'useYn', header: '사용', type: 'yn', editable: true },
];
const rows: Code[] = [
  { code: 'A', codeNm: '가', useYn: 'Y' },
  { code: 'B', codeNm: '나', useYn: 'N' },
];

describe('DataGrid + useGrid', () => {
  it('행 추가·수정·삭제를 getChanges 로 모은다', async () => {
    let grid!: GridHandle<Code>;
    function Screen() {
      grid = useGrid<Code>();
      return <DataGrid grid={grid} columns={columns} rows={rows} editable />;
    }
    render(
      <CommonProvider>
        <Screen />
      </CommonProvider>,
    );
    await waitFor(() => expect(grid.agApi).not.toBeNull());
    await waitFor(() => expect(screen.getByText('가')).toBeTruthy());

    act(() => grid.addRow({ useYn: 'Y' }));
    const api = grid.agApi!;
    act(() => {
      api.getDisplayedRowAtIndex(0)!.setDataValue('code', 'C');
      api.getDisplayedRowAtIndex(0)!.setDataValue('codeNm', '다');
      api.getDisplayedRowAtIndex(1)!.setDataValue('codeNm', '가2');
      api.getDisplayedRowAtIndex(2)!.setSelected(true);
    });
    act(() => {
      grid.deleteSelected();
    });

    expect(grid.getChanges()).toEqual([
      { code: 'B', codeNm: '나', useYn: 'N', rowStatus: 'D' },
      { code: 'A', codeNm: '가2', useYn: 'Y', rowStatus: 'U' },
      { code: 'C', codeNm: '다', useYn: 'Y', rowStatus: 'I' },
    ]);
    expect(grid.getRows()).toHaveLength(2);
    expect(grid.validate()).toEqual([]);

    act(() => grid.commit());
    expect(grid.hasChanges()).toBe(false);
    expect(grid.getRows().map((r) => r.code)).toEqual(['C', 'A']);
  });
});
