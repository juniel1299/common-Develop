import { describe, expect, it } from 'vitest';
import { applyDelete, collectChanges, markUpdated, prepareRows, validateRows } from '../src/grid/gridState';
import type { GridColumn, GridRow } from '../src/grid/types';

type Code = { code: string; codeNm: string };
const columns: GridColumn<Code>[] = [
  { field: 'code', header: '코드', required: true, maxLength: 3 },
  { field: 'codeNm', header: '코드명', required: true },
];

describe('그리드 행 상태', () => {
  it('수정 → U, 신규 삭제는 제거, 기존 삭제는 D, 다시 삭제하면 취소', () => {
    const rows = prepareRows<Code>([
      { code: 'A', codeNm: '가' },
      { code: 'B', codeNm: '나' },
    ]);
    const added = { code: 'C', codeNm: '다', __rowId: 'x', rowStatus: 'I' } as GridRow<Code>;
    markUpdated(rows[0]!);
    expect(rows[0]!.rowStatus).toBe('U');

    const first = applyDelete([rows[0]!, rows[1]!, added]);
    expect(first.remove).toEqual([added]);
    expect(rows.map((r) => r.rowStatus)).toEqual(['D', 'D']);

    applyDelete([rows[0]!]);
    expect(rows[0]!.rowStatus).toBe('U'); // 원래 상태로
  });

  it('getChanges 형식: D → U → I 순서, 내부 키 제거', () => {
    const rows = [
      { code: 'N', codeNm: '신규', __rowId: '1', rowStatus: 'I' },
      { code: 'A', codeNm: '그대로', __rowId: '2' },
      { code: 'B', codeNm: '수정', __rowId: '3', rowStatus: 'U' },
      { code: 'C', codeNm: '삭제', __rowId: '4', rowStatus: 'D', __prevStatus: undefined },
    ] as GridRow<Code>[];
    expect(collectChanges(rows)).toEqual([
      { code: 'C', codeNm: '삭제', rowStatus: 'D' },
      { code: 'B', codeNm: '수정', rowStatus: 'U' },
      { code: 'N', codeNm: '신규', rowStatus: 'I' },
    ]);
  });

  it('검증은 I·U 행만, 필수와 길이', () => {
    const rows = [
      { code: '', codeNm: 'x', __rowId: '1', rowStatus: 'I' },
      { code: 'ABCD', codeNm: 'y', __rowId: '2', rowStatus: 'U' },
      { code: '', codeNm: '', __rowId: '3' },
      { code: '', codeNm: '', __rowId: '4', rowStatus: 'D' },
    ] as GridRow<Code>[];
    expect(validateRows(rows, columns).map((e) => e.message)).toEqual([
      '1행 코드은(는) 필수입니다.',
      '2행 코드은(는) 3자 이하입니다.',
    ]);
  });
});
