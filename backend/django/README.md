# Django 공통 백엔드

Python 3.12+, Django 6.1, Django REST framework. Oracle 과 PostgreSQL 을 환경변수 하나로 바꿉니다. 규칙은 [API 규약](../../docs/api-convention.md) 을 따릅니다.

ORM 대신 **SQL 을 직접 쓰는 방식**(MyBatis 와 같은 방식)으로 만들었습니다. 쿼리 별칭 `CODE_NM` 이 응답에서 `codeNm` 이 되는 규칙을 Spring 과 똑같이 맞추기 위해서입니다.

## 실행

```bash
docker compose up -d postgres            # 저장소 루트에서. Oracle 이면 oracle
cd backend/django
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 8000          # PostgreSQL (기본)
DB=oracle python manage.py runserver 8000
```

프론트는 `.env` 에서 `USE_MOCK=false`, `BACKEND_URL=http://localhost:8000`.
DB 접속 정보는 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` 환경변수. Oracle 드라이버(oracledb)는 thin 모드라 Instant Client 가 필요 없습니다.

## 공통 (`common/`) — 프로젝트에 그대로 가져가는 부분

| 파일 | 하는 일 |
|---|---|
| `response.py` | `ok(data)`, `ApiException`, 모든 예외 → `{ success, code, message, data }` |
| `sql.py` | **`select_list` / `select_one` / `select_page` / `execute`.** 결과 키를 camelCase 로 바꿔준다 |
| `paging.py` | `PageParam`: page/size/sort 처리. sort 는 허용 목록으로만 ORDER BY 에 들어간다 |
| `save.py` | `save_rows`: 그리드 일괄 저장. 등록·수정 행만 검증 후 D → U → I, 한 트랜잭션 |
| `fields.py` | 한글 오류 메시지 필드: `fields.text('이름', required=True)` → "이름은 필수입니다." |
| `case.py` | `to_camel`, `to_snake` |
| `views.py` | `GET /api/common/codes?groupCd=A,B` |

```python
from common.sql import select_list
rows = select_list("SELECT CODE, CODE_NM FROM TB_COMM_CODE WHERE GROUP_CD = %(groupCd)s", {'groupCd': 'DEPT'})
# [{'code': 'D01', 'codeNm': '개발팀'}, ...]
```

SQL 작성 시 주의:
- 파라미터는 `%(codeNm)s` (camelCase 그대로, 영문자로 시작)
- SQL 안의 `%` 는 `%%` 로: `LIKE '%%' || %(userNm)s || '%%'`
- 선택 조건은 `(%(userNm)s IS NULL OR USER_NM LIKE ...)` 형태

## 샘플 (`sample/`) — 새 업무 API 를 만들 때 복사해서 시작

| 샘플 | 내용 |
|---|---|
| `users.py` | 목록(페이징·검색·정렬), 상세, 등록, 수정, 삭제, 일괄 저장 |
| `codes.py` | 공통코드 그룹·코드 관리 (일괄 저장, 하위 코드가 있으면 그룹 삭제 불가) |
| `layouts.py` | 배치도. 도면 목록, 항목 조회(배정 사용자 이름), 항목 일괄 저장 (좌표는 반올림해서 정수로) |

URL 은 `config/urls.py`.
