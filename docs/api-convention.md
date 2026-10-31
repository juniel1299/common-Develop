# API 규약 (공통)

이 문서는 모든 조합(React·Next × Spring·Django × Oracle·PostgreSQL)이 똑같이 따르는 규칙입니다.
백엔드가 이 규칙만 지키면 어떤 프론트를 붙여도 그대로 동작합니다.

---

## 1. 이름 규칙 (가장 중요)

| 위치 | 형식 | 예시 |
|---|---|---|
| DB 컬럼 / SQL 별칭 | `UPPER_SNAKE` | `CODE_NM`, `USE_YN`, `REG_DT` |
| JSON (요청·응답 모두) | `camelCase` | `codeNm`, `useYn`, `regDt` |
| SQL 파라미터 | `camelCase` | `#{codeNm}` (MyBatis), `%(codeNm)s` (Django) |

**변환 책임은 백엔드에 있습니다.** 프론트는 항상 camelCase만 보고, camelCase만 보냅니다.

- 응답: 쿼리 결과의 `CODE_NM` → `codeNm` 으로 바꿔서 내려준다.
- 요청: 프론트가 보낸 `codeNm` 을 그대로 SQL 파라미터 이름으로 쓴다. (SQL 쪽 컬럼명은 `CODE_NM` 그대로)

### 변환 규칙 (snake → camel)

1. 키에 `_` 가 있거나 전부 대문자이면 변환한다. 소문자로 바꾼 뒤 `_` 다음 글자만 대문자로.
   - `CODE_NM` → `codeNm`, `code_nm` → `codeNm`, `ID` → `id`, `USER_ID_2` → `userId2`
2. 이미 camelCase인 키(`codeNm`)는 그대로 둔다. → 두 번 변환해도 결과가 같다.

### DB별 주의

- **Oracle**: 따옴표 없는 별칭은 대문자로 돌아온다 (`AS CODE_NM` → `CODE_NM`). 규칙과 그대로 맞는다.
- **PostgreSQL**: 따옴표 없는 별칭은 소문자로 돌아온다 (`AS CODE_NM` → `code_nm`). 위 변환 규칙이 둘 다 처리하므로 SQL을 바꿀 필요는 없다.
- 별칭에 따옴표(`AS "codeNm"`)는 쓰지 않는다. 변환은 공통 계층에서 한 번만 한다.

---

## 2. 응답 형식

모든 API는 아래 한 가지 모양으로 응답합니다. 성공·실패 모두 같습니다.

```json
{
  "success": true,
  "code": "OK",
  "message": "정상 처리되었습니다.",
  "data": { }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `success` | boolean | 성공 여부 |
| `code` | string | 결과 코드 (아래 표) |
| `message` | string | 사용자에게 보여줄 수 있는 메시지 |
| `data` | any \| null | 실제 데이터. 실패 시 `null` 또는 상세 정보 |

### 결과 코드

| code | HTTP | 의미 |
|---|---|---|
| `OK` | 200 | 성공 |
| `BAD_REQUEST` | 400 | 잘못된 요청 |
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 (`data.errors` 포함) |
| `UNAUTHORIZED` | 401 | 로그인 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 대상 없음 |
| `CONFLICT` | 409 | 중복 등 충돌 |
| `SERVER_ERROR` | 500 | 서버 오류 (상세 내용은 로그에만, 메시지는 일반 문구) |

업무별 코드가 필요하면 `BIZ_` 로 시작한다. 예: `BIZ_ALREADY_APPROVED` (HTTP 400 또는 409)

### 입력값 검증 실패

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "입력값을 확인해주세요.",
  "data": {
    "errors": [
      { "field": "codeNm", "message": "코드명은 필수입니다." }
    ]
  }
}
```

`field` 는 camelCase 이고, 프론트 폼의 필드 이름과 같아서 해당 입력칸에 바로 에러를 표시할 수 있다.

---

## 3. 목록 조회와 페이징

### 요청 (GET 쿼리스트링)

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `page` | `1` | 1부터 시작 |
| `size` | `20` | 한 페이지 건수. 최대 1000 |
| `sort` | 없음 | `codeNm,asc` 형식. 여러 개면 `sort=a,asc&sort=b,desc` |
| 그 외 | | 조회 조건. camelCase (`codeNm`, `useYn`, `regDtFrom`) |

`sort` 의 필드명은 백엔드가 허용 목록으로 검사한 뒤 컬럼명으로 바꾼다. (SQL 인젝션 방지: 문자열을 그대로 `ORDER BY` 에 넣지 않는다.)

### 응답 `data`

```json
{
  "list": [ { "code": "A01", "codeNm": "사용" } ],
  "page": 1,
  "size": 20,
  "totalCount": 135,
  "totalPages": 7
}
```

페이징 없는 목록(콤보 데이터 등)은 `data` 에 배열을 바로 넣는다.

---

## 4. URL 과 저장 방식

```
GET    /api/{업무}            목록 (페이징)
GET    /api/{업무}/{id}       단건
POST   /api/{업무}            등록
PUT    /api/{업무}/{id}       수정
DELETE /api/{업무}/{id}       삭제
POST   /api/{업무}/save       그리드 일괄 저장 (아래)
```

### 그리드 일괄 저장

그리드에서 여러 행을 추가·수정·삭제한 뒤 한 번에 저장할 때 씁니다. 한 트랜잭션으로 처리합니다.

```json
{
  "rows": [
    { "rowStatus": "I", "code": "A03", "codeNm": "신규" },
    { "rowStatus": "U", "code": "A01", "codeNm": "수정됨" },
    { "rowStatus": "D", "code": "A02" }
  ]
}
```

`rowStatus`: `I` 등록, `U` 수정, `D` 삭제. 처리 순서는 `D` → `U` → `I`.

응답 `data`: `{ "inserted": 1, "updated": 1, "deleted": 1 }`

### 배치도 항목

배치도(`LayoutMap`)도 같은 일괄 저장 형식입니다. 항목 키 이름은 고정입니다.

| 키 | DB 컬럼 | 내용 |
|---|---|---|
| `itemId` | `ITEM_ID` | 도면 안에서 유일 (도면 키 `mapId` 와 함께 PK) |
| `itemNm`, `itemType` | `ITEM_NM`, `ITEM_TYPE` | 이름, 종류 (공통코드) |
| `posX`, `posY` | `POS_X`, `POS_Y` | 왼쪽 위 좌표 (도면 기준 단위, 정수로 저장) |
| `width`, `height` | `WIDTH`, `HEIGHT` | 크기 (1 이상) |
| `rotate` | `ROTATE` | 0, 90, 180, 270. 항목 가운데를 기준으로 돈다 |
| `shape` | `SHAPE` | `rect` 또는 `circle` |

업무 값(배정 사용자, 설비 상태 등)은 같은 행에 키를 더해서 보냅니다. 샘플: `GET /api/layouts`, `GET /api/layouts/items?mapId=F3`, `POST /api/layouts/items/save`.

---

## 5. 값 형식

| 종류 | 형식 | 예시 |
|---|---|---|
| 날짜 | `YYYY-MM-DD` | `2026-10-17` |
| 일시 | `YYYY-MM-DDTHH:mm:ss` (시간대 없음, 서버 시간 기준) | `2026-10-17T20:08:43` |
| 여부 | `"Y"` / `"N"` 문자열 | `"useYn": "Y"` |
| 금액·수량 | number. 소수점이 중요한 금액은 string | `1500`, `"1500.25"` |
| 빈 값 | `null` (키는 생략하지 않는다) | `"remark": null` |

키를 생략하지 않아야 프론트에서 `get()` / `set()` 할 때 필드가 항상 존재한다.
(MyBatis는 `callSettersOnNulls=true` 설정 필요)

---

## 6. 공통코드 API

셀렉트·체크박스·라디오가 공통으로 쓰는 코드 조회입니다.

```
GET /api/common/codes?groupCd=USE_YN,GENDER
```

```json
{
  "success": true,
  "code": "OK",
  "message": "",
  "data": [
    { "groupCd": "USE_YN", "codes": [ { "code": "Y", "codeNm": "사용" }, { "code": "N", "codeNm": "미사용" } ] },
    { "groupCd": "GENDER", "codes": [ { "code": "M", "codeNm": "남" }, { "code": "F", "codeNm": "여" } ] }
  ]
}
```

그룹코드를 객체의 키로 쓰지 않고 배열로 내려주는 이유: 키 변환 규칙이 `USE_YN` 같은 **값**까지 `useYn` 으로 바꿔버리지 않게 하기 위해서다.
(규칙: JSON 객체의 키는 항상 필드명이어야 하고, 데이터 값을 키로 쓰지 않는다.)
프론트 공통 모듈이 받아서 `{ USE_YN: [...], GENDER: [...] }` 형태로 캐시한다. 항목은 `sortOrd` 순으로 정렬해서 내려준다.

공통코드 테이블 기본 구조 (Oracle·PostgreSQL 스크립트는 `sql/`):

```
TB_COMM_CODE_GROUP (GROUP_CD, GROUP_NM, USE_YN, ...)
TB_COMM_CODE       (GROUP_CD, CODE, CODE_NM, SORT_ORD, USE_YN, ...)
```

---

## 7. 인증 (기본값)

- 기본은 세션 쿠키 대신 `Authorization: Bearer {token}` 헤더.
- 토큰 만료 시 `401 UNAUTHORIZED` → 프론트 공통 모듈이 로그인 화면으로 보낸다.
- 프로젝트별로 세션 방식이 필요하면 백엔드만 바꾸고 응답 규약은 그대로 유지한다.

---

## 8. SQL 작성 규칙 (Oracle·PostgreSQL 공통)

SQL 하나로 두 DB 에서 같이 돌도록 아래 공통 문법만 씁니다. (Spring 매퍼, Django 샘플 모두 이 규칙으로 작성)

| 용도 | 쓰는 것 | 쓰지 않는 것 |
|---|---|---|
| 페이징 | `OFFSET n ROWS FETCH NEXT m ROWS ONLY` (Oracle 12c+) | `ROWNUM`, `LIMIT` |
| 날짜 → 문자 | `TO_CHAR(JOIN_DT, 'YYYY-MM-DD')`, 일시는 `'YYYY-MM-DD"T"HH24:MI:SS'` | DB 날짜 타입을 그대로 응답 |
| 문자 → 날짜 | `TO_DATE(#{joinDt}, 'YYYY-MM-DD')` | |
| 기간 끝 날짜 | `JOIN_DT < TO_DATE(#{joinDtTo}, 'YYYY-MM-DD') + 1` | `<=` (시간이 있으면 빠짐) |
| 문자열 연결 | `'%' \|\| #{userNm} \|\| '%'` | `CONCAT(a, b, c)` (Oracle 은 인자 2개) |
| null 대체 | `COALESCE` | `NVL`, `IFNULL` |
| 현재 시각 | `CURRENT_TIMESTAMP` | `SYSDATE`, `NOW()` |
| 서브쿼리 별칭 | `FROM (...) T` | `FROM (...) AS T` (Oracle 오류) |

- **빈 문자열**: Oracle 은 `''` 를 NULL 로 저장합니다. 두 DB 결과를 맞추기 위해 백엔드 공통 계층이 `''` 를 `null` 로 바꿔서 넘깁니다.
- **null 파라미터**: MyBatis 는 `#{email,jdbcType=VARCHAR}` 처럼 타입을 적습니다 (PostgreSQL 타입 추론, Oracle null 처리).
- **정렬**: PostgreSQL DB 는 `C.UTF-8` 로 만들면 Oracle 기본 정렬(BINARY)과 같아집니다.
- **식별자**: 테이블·컬럼은 따옴표 없이 `UPPER_SNAKE`. 따옴표를 쓰면 대소문자가 고정되어 두 DB 가 달라집니다.
- **DB 별로 꼭 달라야 할 때**: MyBatis 는 `databaseId`, Django 는 `connection.vendor` 로 나눕니다.
