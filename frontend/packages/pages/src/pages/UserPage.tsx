import { isApiError, type PageResult } from '@common/core';
import { DataGrid, FormArea, SearchArea, useArea, useGrid, useHttp, type FieldDef, type GridColumn } from '@common/ui';
import { App, Button } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MockUser as User } from '../mock/db';

type Search = { userNm: string | null; deptCd: string | null; useYn: string | null; joinDtFrom: string | null; joinDtTo: string | null };

const searchFields: FieldDef[] = [
  { name: 'userNm', label: '이름' },
  { name: 'deptCd', label: '부서', type: 'select', codeGroup: 'DEPT' },
  { name: 'useYn', label: '사용여부', type: 'radio', codeGroup: 'USE_YN' },
  { name: 'joinDt', label: '입사일', type: 'dateRange' },
];

const columns: GridColumn<User>[] = [
  { field: 'userId', header: '아이디', width: 110 },
  { field: 'userNm', header: '이름', width: 110 },
  { field: 'deptCd', header: '부서', type: 'code', codeGroup: 'DEPT', width: 100 },
  { field: 'email', header: '이메일', flex: 1 },
  { field: 'joinDt', header: '입사일', type: 'date', width: 110 },
  { field: 'useYn', header: '사용', type: 'code', codeGroup: 'USE_YN', width: 80 },
];

/** 샘플: 조회영역 + 목록(서버 페이징) + 상세 폼 (등록·수정·삭제) */
export function UserPage() {
  const http = useHttp();
  const { message, modal } = App.useApp();
  const search = useArea<Search>();
  const form = useArea<User>();
  const grid = useGrid<User>();
  const [result, setResult] = useState<PageResult<User> | null>(null);
  const [paging, setPaging] = useState({ page: 1, size: 20 });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // null = 신규

  const load = useCallback(
    async (page = paging.page, size = paging.size) => {
      setLoading(true);
      try {
        setResult(await http.getPage<User>('/users', { ...search.get(), page, size }));
        setPaging({ page, size });
      } finally {
        setLoading(false);
      }
    },
    [http, search, paging.page, paging.size],
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formFields = useMemo<FieldDef[]>(
    () => [
      { name: 'userId', label: '아이디', required: true, maxLength: 20, disabled: editing !== null, pattern: /^[a-z0-9_]{3,20}$/, patternMessage: '영문 소문자·숫자 3~20자' },
      { name: 'userNm', label: '이름', required: true, maxLength: 50 },
      { name: 'deptCd', label: '부서', type: 'select', codeGroup: 'DEPT', required: true },
      { name: 'email', label: '이메일', maxLength: 100 },
      { name: 'joinDt', label: '입사일', type: 'date' },
      { name: 'salary', label: '급여', type: 'number', min: 0 },
      { name: 'useYn', label: '사용여부', type: 'radio', codeGroup: 'USE_YN', required: true },
      { name: 'remark', label: '비고', type: 'textarea', maxLength: 500, span: 2 },
    ],
    [editing],
  );

  async function select(row: User) {
    const detail = await http.get<User>(`/users/${encodeURIComponent(row.userId)}`);
    form.clear();
    form.set(detail);
    setEditing(detail.userId);
  }

  function create() {
    form.reset();
    setEditing(null);
  }

  async function save() {
    const values = await form.validate().catch(() => null);
    if (!values) return;
    try {
      if (editing) await http.put(`/users/${encodeURIComponent(editing)}`, values, { silent: true });
      else await http.post('/users', values, { silent: true });
      message.success('저장했습니다.');
      setEditing(values.userId);
      await load();
    } catch (e) {
      if (isApiError(e) && e.code === 'VALIDATION_ERROR') form.setErrors(e.fieldErrors);
      else if (isApiError(e)) message.error(e.message);
    }
  }

  function remove() {
    if (!editing) return;
    modal.confirm({
      title: '삭제할까요?',
      content: `${form.get('userNm') ?? ''} (${editing})`,
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        await http.delete(`/users/${encodeURIComponent(editing)}`);
        message.success('삭제했습니다.');
        create();
        await load();
      },
    });
  }

  return (
    <>
      <SearchArea area={search} fields={searchFields} onSearch={() => load(1)} loading={loading} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: 12, alignItems: 'start' }}>
        <DataGrid
          grid={grid}
          columns={columns}
          rows={result?.list}
          title="사용자 목록"
          selection="single"
          height={440}
          loading={loading}
          onRowClick={select}
          pagination={result ? { page: result.page, size: result.size, totalCount: result.totalCount, onChange: (p, s) => load(p, s) } : undefined}
        />
        <FormArea
          area={form}
          fields={formFields}
          initialValues={{ useYn: 'Y' }}
          title={editing ? '사용자 수정' : '사용자 등록'}
          extra={
            <>
              <Button onClick={create}>신규</Button>
              <Button danger disabled={!editing} onClick={remove}>
                삭제
              </Button>
              <Button type="primary" onClick={save}>
                저장
              </Button>
            </>
          }
        />
      </div>
    </>
  );
}
