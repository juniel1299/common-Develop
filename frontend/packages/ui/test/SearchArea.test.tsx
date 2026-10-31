import { createHttp } from '@common/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommonProvider, SearchArea, useArea, type AreaApi, type FieldDef } from '../src';

function fakeHttp() {
  const http = createHttp({ baseURL: '/api' });
  http.client.defaults.adapter = async (config) => ({
    data: {
      success: true,
      code: 'OK',
      message: '',
      data: [{ groupCd: 'USE_YN', codes: [{ code: 'Y', codeNm: '사용' }, { code: 'N', codeNm: '미사용' }] }],
    },
    status: 200,
    statusText: '',
    headers: {},
    config,
  });
  return http;
}

const fields: FieldDef[] = [
  { name: 'userNm', label: '이름' },
  { name: 'useYn', label: '사용여부', type: 'select', codeGroup: 'USE_YN' },
  { name: 'regDt', label: '등록일', type: 'dateRange' },
];

function setup(onSearch = vi.fn()) {
  let area!: AreaApi;
  function Screen() {
    area = useArea();
    return <SearchArea area={area} fields={fields} initialValues={{ useYn: 'Y' }} onSearch={onSearch} />;
  }
  render(
    <CommonProvider http={fakeHttp()}>
      <Screen />
    </CommonProvider>,
  );
  return { area: () => area, onSearch };
}

describe('SearchArea + useArea', () => {
  it('get / set / reset', async () => {
    const { area } = setup();
    expect(area().get()).toEqual({ userNm: null, useYn: 'Y', regDtFrom: null, regDtTo: null });

    act(() => area().set({ userNm: '홍길동', regDtFrom: '2026-10-01' }));
    expect(area().get('userNm')).toBe('홍길동');
    expect(area().get('regDtFrom')).toBe('2026-10-01');
    expect(area().isDirty()).toBe(true);

    act(() => area().reset());
    expect(area().get()).toEqual({ userNm: null, useYn: 'Y', regDtFrom: null, regDtTo: null });
    expect(area().isDirty()).toBe(false);
  });

  it('조회 버튼은 규약 형식 값으로 onSearch 를 부른다', async () => {
    const { area, onSearch } = setup();
    act(() => area().set('userNm', '  홍 '));
    fireEvent.click(screen.getByRole('button', { name: /조회/ }));
    await waitFor(() => expect(onSearch).toHaveBeenCalledOnce());
    expect(onSearch.mock.calls[0]![0]).toEqual({ userNm: '홍', useYn: 'Y', regDtFrom: null, regDtTo: null });
  });

  it('공통코드를 불러와 셀렉트에 코드명을 보여준다', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('사용')).toBeTruthy());
  });
});
