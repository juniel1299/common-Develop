# frontend

npm workspaces 하나에 공통 패키지 3개와 앱 2개가 있습니다. **화면 코드는 패키지에 있고, 앱은 시작 코드만 다릅니다.**

```
packages/core    @common/core   타입, CODE_NM↔codeNm 변환, API 호출, 공통코드 캐시
packages/ui      @common/ui     조회영역, 폼영역, 그리드, 공통코드 입력, 차트, 레이아웃(탭/내용 교체)
packages/pages   @common/pages  샘플 화면 4개 + 백엔드 없이 동작하는 가짜 API
apps/react-app   React + Vite        http://localhost:5173
apps/next-app    Next.js (App Router) http://localhost:3000
```

## 실행

```bash
cd frontend
npm install
npm run build:packages        # 공통 패키지 먼저 빌드 (core → ui → pages)

npm run dev -w react-app      # React
npm run dev -w next-app       # Next
```

처음에는 가짜 API 로 동작하므로 백엔드 없이 화면을 다 눌러볼 수 있습니다 (사용자 등록·수정·삭제, 공통코드 일괄 저장 포함).

## 설정 (`.env`)

| React (`apps/react-app/.env`) | Next (`apps/next-app/.env`) | 설명 |
|---|---|---|
| `VITE_USE_MOCK` | `NEXT_PUBLIC_USE_MOCK` | `true` 면 가짜 API, `false` 면 실제 백엔드 |
| `VITE_LAYOUT_MODE` | `NEXT_PUBLIC_LAYOUT_MODE` | `tabs` 탭 방식 / `single` 내용만 교체 |
| `BACKEND_URL` | `BACKEND_URL` | `/api` 를 넘길 백엔드 주소 (Spring 8080, Django 8000) |

두 앱 모두 `/api/*` 요청을 `BACKEND_URL` 로 넘기므로 백엔드에 CORS 설정이 필요 없습니다.

## 레이아웃

`AppLayout` 하나로 두 방식을 지원합니다 (`mode`).

- **tabs** (기본): 메뉴를 누르면 탭이 쌓이고, X 로 닫습니다. 탭을 옮겨도 입력값이 유지되고, 새로고침해도 열린 탭이 복원됩니다. 탭 우클릭: 새로고침, 닫기, 다른 탭 닫기, 모두 닫기. 최대 10개 (넘으면 오래된 탭부터 닫힘). `home` 탭은 고정.
- **single**: 본문만 바뀝니다.

두 방식 모두 주소창에 `?menu=user` 처럼 현재 화면이 반영되어, 링크로 특정 화면을 바로 열 수 있습니다.
화면 안에서 다른 화면을 열 때는 `useAppNav().open('user')`.

라우터에 의존하지 않으므로 React·Next 에서 같은 코드로 동작합니다.

## 새 화면 추가

1. 화면 컴포넌트를 만듭니다. 샘플(`packages/pages/src/pages/UserPage.tsx`)을 복사해서 시작하면 빠릅니다.
2. 앱의 `menus` 와 `pages` 에 등록합니다 (React: `src/App.tsx`, Next: `src/Shell.tsx`).

```tsx
const OrderPage = lazy(() => import('./pages/OrderPage'));   // 처음 열 때 불러옴

const menus: MenuItem[] = [...sampleMenus, { key: 'order', label: '주문 관리', icon: <ShoppingOutlined /> }];
const pages: PageRegistry = { ...samplePages, order: OrderPage };
```

React 와 Next 를 둘 다 쓸 화면이면 `packages/pages` 에 두고 양쪽에서 import 합니다.

## 샘플 화면

| 화면 | 보여주는 것 |
|---|---|
| 대시보드 | 통계 카드, ECharts 막대·선 차트 |
| 사용자 관리 | 조회영역 → 서버 페이징 그리드 → 행 클릭 시 상세 폼, 등록·수정·삭제, 서버 검증 오류를 칸 아래 표시 |
| 공통코드 관리 | 그리드 두 개(그룹 → 코드), 행 추가·수정·삭제 후 일괄 저장 (`rowStatus` I/U/D) |
| 좌석 배치도 | `LayoutMap`. 조회 모드는 좌석 사용 현황(색·범례·툴팁), 편집 모드는 끌어서 배치·크기·회전·추가·삭제 후 일괄 저장, 오른쪽 속성 패널에서 이름·종류·사용자 배정 |

## 명령

```bash
npm test            # 전체 테스트
npm run typecheck   # 전체 타입 검사
npm run build       # 패키지와 앱 모두 빌드
```
