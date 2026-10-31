# Spring Boot + MyBatis 공통 백엔드

Java 21, Spring Boot 4.1, MyBatis. Oracle 과 PostgreSQL 을 프로필 하나로 바꿉니다. 규칙은 [API 규약](../../docs/api-convention.md) 을 따릅니다.

## 실행

```bash
docker compose up -d postgres          # 저장소 루트에서. Oracle 이면 oracle
cd backend/spring
mvn spring-boot:run                    # PostgreSQL (기본)
DB=oracle mvn spring-boot:run          # Oracle
```

`http://localhost:8080/api/...` 로 뜹니다. 프론트는 `.env` 에서 `USE_MOCK=false`, `BACKEND_URL=http://localhost:8080`.

DB 접속 정보는 `DB_URL`, `DB_USER`, `DB_PASSWORD` 환경변수 (기본: 로컬 docker compose).

## 공통 (`com.common.core`) — 프로젝트에 그대로 가져가는 부분

| 클래스 | 하는 일 |
|---|---|
| `ApiResponse` | `{ success, code, message, data }`. 컨트롤러는 `ApiResponse.ok(data)` 만 돌려준다 |
| `ResultCode`, `BizException` | 결과 코드와 업무 예외. `throw new BizException(ResultCode.NOT_FOUND, "...")` |
| `GlobalExceptionHandler` | 모든 예외 → 공통 형식. `@Valid` 오류 → `VALIDATION_ERROR` + 필드 목록, 중복 키 → `CONFLICT` |
| `CamelMap` | **조회 결과 키를 camelCase 로.** `resultType="camelMap"` 이면 `CODE_NM` → `codeNm` |
| `PageParam`, `PageResult` | page/size/sort 처리. sort 는 허용 목록으로만 ORDER BY 에 들어간다 |
| `RowSaver`, `SaveRequest`, `MapRow` | 그리드 일괄 저장. 등록·수정 행만 검증 후 D → U → I 실행 |
| `CommonCodeController` | `GET /api/common/codes?groupCd=A,B` |
| `CurrentUser` | REG_ID/MOD_ID 에 쓸 로그인 ID. 인증을 붙일 때 여기만 바꾼다 |

### CODE_NM → codeNm 은 어디서 바뀌나

- **조회 결과**: `resultType="camelMap"` (Map 결과) 또는 DTO + `map-underscore-to-camel-case: true`
- **요청 → SQL**: JSON 의 `codeNm` 이 그대로 `#{codeNm}` 파라미터 이름이 된다. SQL 컬럼은 `CODE_NM` 그대로

MyBatis 의 `map-underscore-to-camel-case` 는 DTO 에만 적용되고 Map 결과에는 적용되지 않습니다. 그래서 `CamelMap` 이 필요합니다.

## 샘플 (`com.common.sample`) — 새 업무 API 를 만들 때 복사해서 시작

| 샘플 | 방식 |
|---|---|
| `user` | DTO(`record UserDto`) + Bean Validation. 검증이 많은 업무에 |
| `code` | DTO 없이 `MapRow`. 컬럼이 많고 단순한 관리 화면에 빠르다 |
| `layout` | 배치도. 도면 목록, 항목 조회(배정 사용자 이름 LEFT JOIN), 항목 일괄 저장 (`MapRow` + `RowSaver`) |

## SQL 은 두 DB 공통 문법으로

매퍼 XML 하나로 Oracle·PostgreSQL 이 같이 돌도록 작성했습니다. 규칙은 [API 규약 8장](../../docs/api-convention.md#8-sql-작성-규칙-oraclepostgresql-공통).
DB 별로 꼭 달라야 하는 SQL 이 생기면 `databaseIdProvider` 를 켜고 `<select databaseId="oracle">` 로 나눕니다.
