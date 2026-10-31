# @common/ui

React·Next 공용 화면 컴포넌트. 무료 라이선스만 사용합니다.

| 라이브러리 | 라이선스 | 용도 |
|---|---|---|
| Ant Design | MIT | 입력, 버튼, 레이아웃 |
| AG Grid **Community** | MIT | 그리드 (Enterprise 기능은 쓰지 않음) |
| ECharts | Apache-2.0 | 차트 |
| dayjs | MIT | 날짜 |

Next.js App Router 에서도 바로 쓸 수 있도록 빌드 결과에 `"use client"` 가 붙어 있습니다.

## 시작

```tsx
import { createHttp } from '@common/core';
import { CommonProvider } from '@common/ui';

const http = createHttp({ baseURL: '/api' });

<CommonProvider http={http}>   {/* antd 한국어·테마, 공통코드 캐시 */}
  <App />
</CommonProvider>
```

## 조회영역 · 폼영역

필드를 배열로 정의하고, `useArea()` 로 값을 다룹니다. 값은 항상 API 규약 형식입니다
(날짜는 `'2026-10-17'` 문자열, 여부는 `'Y'/'N'`, 기간은 `regDtFrom`/`regDtTo` 로 분리).

```tsx
const search = useArea<UserSearch>();

<SearchArea
  area={search}
  columns={4}
  initialValues={{ useYn: 'Y' }}
  fields={[
    { name: 'userNm', label: '사용자명' },
    { name: 'deptCd', label: '부서', type: 'select', codeGroup: 'DEPT' },   // '전체' 자동
    { name: 'useYn', label: '사용여부', type: 'radio', codeGroup: 'USE_YN' },
    { name: 'regDt', label: '등록일', type: 'dateRange' },                  // regDtFrom, regDtTo
  ]}
  onSearch={(params) => load(params)}
/>

search.get();                 // { userNm: null, deptCd: null, useYn: 'Y', regDtFrom: null, regDtTo: null }
search.get('useYn');          // 'Y'
search.set('userNm', '홍길동');
search.set({ regDtFrom: '2026-10-01', regDtTo: '2026-10-17' });
search.reset();               // initialValues 로
```

```tsx
const form = useArea<User>();

<FormArea area={form} title="사용자 정보" columns={2} extra={<Button onClick={save}>저장</Button>}
  fields={[
    { name: 'userId', label: '아이디', required: true, maxLength: 20 },
    { name: 'joinDt', label: '입사일', type: 'date' },
    { name: 'adminYn', label: '관리자', type: 'yn' },                       // 체크박스 ↔ 'Y'/'N'
    { name: 'remark', label: '비고', type: 'textarea', span: 2 },
  ]}
/>

form.set(await http.get(`/users/${id}`));       // 상세 조회 결과를 그대로
async function save() {
  const values = await form.validate();          // 실패하면 첫 오류 칸으로 이동
  try {
    await http.post('/users', values, { silent: true });
  } catch (e) {
    if (isApiError(e)) form.setErrors(e.fieldErrors);  // 서버 검증 오류를 칸 아래 표시
  }
}
```

필드 `type`: `text` `password` `number` `textarea` `select` `multiSelect` `radio` `checkbox` `yn` `date` `month` `dateRange` `custom`

정의에 없는 키(숨은 PK 등)도 `set()` 하면 보관했다가 `get()` 에 같이 나옵니다.

## 공통코드 컴포넌트

폼 밖에서 단독으로도 씁니다. 같은 그룹은 앱 전체에서 한 번만 조회합니다.

```tsx
<CodeSelect codeGroup="DEPT" all value={v} onChange={setV} />
<CodeRadio codeGroup="USE_YN" />
<CodeCheckbox codeGroup="ROLE" all />           // '전체' 체크 = 모두 선택
const { codes } = useCodes(['DEPT']);           // 직접 필요할 때
```

## 그리드

```tsx
const grid = useGrid<User>();

<DataGrid
  grid={grid}
  rows={list}
  editable                                      // 상태 컬럼 + 체크박스 + 셀 편집
  title="사용자 목록"
  pagination={{ page, size, totalCount, onChange }}
  extra={<>
    <Button onClick={() => grid.addRow({ useYn: 'Y' })}>추가</Button>
    <Button onClick={() => grid.deleteSelected()}>삭제</Button>
    <Button type="primary" onClick={save}>저장</Button>
  </>}
  columns={[
    { field: 'userId', header: '아이디', required: true, editable: (r) => r.rowStatus === 'I' },  // 신규 행만 입력
    { field: 'deptCd', header: '부서', type: 'code', codeGroup: 'DEPT', editable: true },        // 코드명 표시, 셀렉트 편집
    { field: 'salary', header: '급여', type: 'number', editable: true },                          // 천 단위 콤마, 우측 정렬
    { field: 'joinDt', header: '입사일', type: 'date', editable: true },
  ]}
/>

async function save() {
  if (grid.validate().length) return;           // 필수·길이 검사, 첫 오류 칸으로 이동
  await http.saveRows('/users', grid.getChanges());  // D → U → I 순서의 rows
  reload();                                      // 또는 grid.commit()
}
```

- 수정한 행은 `수정`, 추가한 행은 `추가`, 삭제한 행은 취소선과 `삭제`로 표시됩니다.
- 신규 행을 삭제하면 바로 사라지고, 기존 행은 `삭제` 표시만 됩니다. 한 번 더 삭제하면 취소됩니다.

## 배치도

좌석·설비·매장 진열·주차면처럼 **도면 위에 항목을 놓는 화면**. 추가 라이브러리 없이 SVG 로 그립니다.
조회 모드는 상태 색·범례·툴팁·클릭, 편집 모드는 끌어서 이동, 모서리로 크기 조절, 회전, 추가·삭제 후 그리드와 같은 `rowStatus` 로 일괄 저장합니다.

```tsx
const layout = useLayoutMap<Seat>();

<LayoutMap
  layout={layout}
  map={{ width: 800, height: 500, bgUrl: '/floor3.png' }}   // 배경 평면도는 선택. 좌표는 이 크기 기준
  items={seats}                                            // { itemId, itemNm, itemType, posX, posY, width, height, rotate, shape, ...업무 값 }
  editable={editing}
  gridSize={10}                                            // 이동·크기가 10 단위로 맞춰짐
  itemStyle={(s) => (s.userId ? { fill: '#dbeafe', stroke: '#2563eb' } : { fill: '#fff' })}
  legend={[{ label: '사용 중', color: '#dbeafe' }, { label: '빈자리', color: '#fff' }]}
  tooltip={(s) => `${s.itemNm} · ${s.userNm ?? '빈자리'}`}
  onItemClick={(s) => open(s)}
  onSelect={(list) => setSelected(list)}
  extra={<Button onClick={save}>저장</Button>}
/>

layout.addItem({ itemId: layout.nextId('S'), itemType: 'SEAT', width: 60, height: 40 });  // 화면 가운데에 추가
layout.updateItem('S001', { userId: 'user002' });      // 속성 패널에서 바꿀 때
layout.rotateSelected();  layout.deleteSelected();     // 선택 항목 90도 회전, 삭제 (기존 항목은 D 표시)
layout.fit();  layout.zoomIn();  layout.zoomOut();

async function save() {
  await http.saveRows('/layouts/items', layout.getChanges());   // D → U → I
  reload();                                                     // 또는 layout.commit()
}
```

- 조작: 끌어서 이동, Shift·Ctrl+클릭 여러 개 선택(함께 이동), 방향키 이동(Shift 는 5칸), Delete 삭제, Esc 선택 해제, 휠 확대·축소, 빈 곳 끌기로 화면 이동
- 회전한 항목도 도면 밖으로 나가지 않게 맞춥니다. 추가·수정·삭제한 항목은 테두리 색(초록·주황·빨강 점선)으로 표시됩니다.
- 샘플: `packages/pages/src/pages/LayoutPage.tsx` (좌석 배치도, 오른쪽 속성 패널에서 사용자 배정)

## 차트

```tsx
<Chart height={260} option={{ xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: {}, series: [{ type: 'bar', data: [3, 5] }] }} />
```

ECharts option 을 그대로 넘깁니다. 크기 자동 조절과 정리(dispose)는 컴포넌트가 합니다.

## 테마

`commonTheme` 이 기본입니다 (글자 13px, 모서리 4px, 그림자·애니메이션 최소화). 프로젝트 색만 바꾸려면:

```tsx
<CommonProvider http={http} theme={{ token: { colorPrimary: '#0f766e' } }}>
```

## 미리보기

샘플 앱으로 확인합니다. [frontend/README.md](../../README.md) 의 실행 방법 참고.

## 레이아웃

```tsx
<AppLayout title="업무 시스템" menus={menus} pages={pages} home="dashboard" mode="tabs" />  // 또는 mode="single"
const nav = useAppNav(); nav.open('user');   // 화면 안에서 다른 화면 열기
```
