import { DataGrid, useCommon, useGrid, useHttp, type GridColumn } from '@common/ui';
import { App, Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import type { MockCode, MockCodeGroup } from '../mock/db';

const groupColumns: GridColumn<MockCodeGroup>[] = [
  { field: 'groupCd', header: '그룹코드', width: 130, required: true, maxLength: 30, editable: (r) => r.rowStatus === 'I' },
  { field: 'groupNm', header: '그룹명', required: true, maxLength: 100, editable: true },
  { field: 'useYn', header: '사용', type: 'code', codeGroup: 'USE_YN', width: 90, editable: true },
];

const codeColumns: GridColumn<MockCode>[] = [
  { field: 'code', header: '코드', width: 120, required: true, maxLength: 30, editable: (r) => r.rowStatus === 'I' },
  { field: 'codeNm', header: '코드명', required: true, maxLength: 100, editable: true },
  { field: 'sortOrd', header: '순서', type: 'number', width: 80, editable: true },
  { field: 'useYn', header: '사용', type: 'code', codeGroup: 'USE_YN', width: 90, editable: true },
];

/** 샘플: 그리드 두 개 (그룹 → 코드), 행 추가·수정·삭제 후 일괄 저장 */
export function CodePage() {
  const http = useHttp();
  const { codes: codeStore } = useCommon();
  const { message } = App.useApp();
  const groupGrid = useGrid<MockCodeGroup>();
  const codeGrid = useGrid<MockCode>();
  const [groups, setGroups] = useState<MockCodeGroup[]>([]);
  const [codes, setCodes] = useState<MockCode[]>([]);
  const [groupCd, setGroupCd] = useState<string | null>(null);

  const loadGroups = useCallback(async () => setGroups(await http.get<MockCodeGroup[]>('/codes/groups')), [http]);
  const loadCodes = useCallback(async (cd: string | null) => setCodes(cd ? await http.get<MockCode[]>('/codes', { groupCd: cd }) : []), [http]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  async function selectGroup(row: MockCodeGroup & { rowStatus?: string }) {
    if (row.rowStatus === 'I' || row.groupCd === groupCd) return;
    if (codeGrid.hasChanges()) {
      message.warning('저장하지 않은 코드 변경이 있습니다. 먼저 저장하세요.');
      return;
    }
    setGroupCd(row.groupCd);
    await loadCodes(row.groupCd);
  }

  async function save<T>(grid: ReturnType<typeof useGrid<T>>, url: string, after: () => Promise<void>) {
    if (!grid.hasChanges()) return void message.info('변경된 내용이 없습니다.');
    const errors = grid.validate();
    if (errors.length) return void message.warning(errors[0]!.message);
    const r = await http.saveRows(url, grid.getChanges());
    message.success(`저장했습니다. (추가 ${r.inserted}, 수정 ${r.updated}, 삭제 ${r.deleted})`);
    codeStore?.clear(groupCd ?? undefined);
    await after();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 12 }}>
      <DataGrid
        grid={groupGrid}
        columns={groupColumns}
        rows={groups}
        editable
        title="코드 그룹"
        height={520}
        onRowClick={selectGroup}
        extra={
          <>
            <Button onClick={() => groupGrid.addRow({ useYn: 'Y' })}>추가</Button>
            <Button onClick={() => groupGrid.deleteSelected()}>삭제</Button>
            <Button type="primary" onClick={() => save(groupGrid, '/codes/groups', loadGroups)}>
              저장
            </Button>
          </>
        }
      />
      <DataGrid
        grid={codeGrid}
        columns={codeColumns}
        rows={codes}
        editable
        title={groupCd ? `코드 (${groupCd})` : '코드 (그룹을 선택하세요)'}
        height={520}
        extra={
          <>
            <Button disabled={!groupCd} onClick={() => codeGrid.addRow({ groupCd: groupCd!, useYn: 'Y', sortOrd: codeGrid.getRows().length + 1 }, 'bottom')}>
              추가
            </Button>
            <Button disabled={!groupCd} onClick={() => codeGrid.deleteSelected()}>
              삭제
            </Button>
            <Button type="primary" disabled={!groupCd} onClick={() => save(codeGrid, '/codes', () => loadCodes(groupCd))}>
              저장
            </Button>
          </>
        }
      />
    </div>
  );
}
