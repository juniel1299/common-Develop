# common-Develop

외주 웹 프로젝트를 빠르게 시작하기 위한 공통 틀입니다. 디자인, 프론트, 백엔드, SQL 공통을 미리 만들어두고 프로젝트마다 가져다 씁니다.

## 조합

| 영역 | 버전 |
|---|---|
| 프론트 | React (Vite), Next.js — 컴포넌트는 공통 패키지 하나를 같이 씀 |
| UI | Ant Design, AG Grid Community, ECharts (모두 무료 라이선스) |
| 백엔드 | Spring Boot + MyBatis, Django |
| DB | Oracle, PostgreSQL |

모든 조합은 [API 규약](docs/api-convention.md) 하나를 따르므로 어떤 프론트와 어떤 백엔드를 붙여도 동작합니다.
핵심 규칙: DB는 `CODE_NM`, JSON과 프론트는 `codeNm`, 변환은 백엔드가 한다.

## 구조

```
docs/
  api-convention.md     API 규약 (응답 형식, 이름 규칙, 페이징, 저장, 공통코드)
frontend/               npm workspaces
  packages/core/        @common/core  타입, 키 변환, API 호출, 공통코드 캐시   ✅
  packages/ui/          @common/ui    조회영역, 폼영역, 그리드, 코드 셀렉트, 차트, 레이아웃, 배치도  ✅
  packages/pages/       @common/pages 샘플 화면 4개 + 백엔드 없이 동작하는 가짜 API    ✅
  apps/react-app/       React(Vite) 앱                                        ✅
  apps/next-app/        Next 앱                                               ✅
backend/
  spring/               Spring Boot + MyBatis (공통 계층 + 샘플 API)           ✅
  django/               Django + DRF (공통 계층 + 샘플 API)                    ✅
sql/
  oracle/, postgresql/  공통코드·사용자·배치도 테이블, 샘플 데이터               ✅
docker-compose.yml      PostgreSQL·Oracle 을 명령 하나로 띄움                   ✅
```

## 진행 상황

1. ✅ API 규약 문서 + 공통 프론트 패키지 뼈대 (`@common/core`)
2. ✅ 공통 컴포넌트와 프론트 API (`get`, `set` 등). 미리보기: [docs/images/step2-preview.png](docs/images/step2-preview.png)
3. ✅ React 앱과 Next 앱 (탭/내용 교체 설정, 샘플 화면). 실행 방법: [frontend/README.md](frontend/README.md)
4. ✅ Spring·Django 백엔드, Oracle·PostgreSQL 스크립트, 샘플 화면을 실제 백엔드에 연결. 화면: [Spring×Oracle](docs/images/step4-spring-oracle-user.png), [Django×PostgreSQL](docs/images/step4-django-postgres-code.png)
5. ✅ 배치도 공통 컴포넌트 `LayoutMap` (좌석·설비·매장 진열 등). 샘플 화면 "좌석 배치도": [조회](docs/images/step5-layout-view.png), [편집](docs/images/step5-layout-edit.png)

## 빠른 시작 (실제 백엔드까지)

```bash
docker compose up -d postgres                 # DB (Oracle 이면 oracle, 첫 기동은 1~2분)

cd backend/spring && mvn spring-boot:run      # Spring :8080  (Oracle: DB=oracle mvn spring-boot:run)
# 또는
cd backend/django && pip install -r requirements.txt && python manage.py runserver 8000

cd frontend && npm install && npm run build:packages
# apps/react-app/.env 에서 VITE_USE_MOCK=false, BACKEND_URL=http://localhost:8080 (Django 는 8000)
npm run dev -w react-app
```

자세한 내용: [backend/spring](backend/spring/README.md), [backend/django](backend/django/README.md), [sql](sql/README.md), [frontend](frontend/README.md)

## 규약 테스트

백엔드가 [API 규약](docs/api-convention.md)을 지키는지 같은 테스트 12개로 확인합니다 (응답 형식, camelCase, 페이징·정렬, 검증 오류, 일괄 저장, 공통코드, 배치도).

```bash
cd frontend/packages/pages
npx vitest run test/contract.test.ts                               # 가짜 API
API_URL=http://localhost:8080/api npx vitest run test/contract.test.ts   # 실제 백엔드
```

Spring·Django × Oracle·PostgreSQL 4개 조합과 가짜 API 모두 통과했습니다. (배치도 테스트 2개는 가짜 API, Spring×PostgreSQL, Django×PostgreSQL 에서 통과. Oracle 조합은 아직 돌려보지 못했습니다.) 백엔드를 고치거나 새로 만들 때 이 테스트를 돌리면 프론트와 맞는지 바로 알 수 있습니다.
