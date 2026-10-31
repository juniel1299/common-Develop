"""
SQL 실행 도우미 (MyBatis 처럼 SQL 을 직접 쓰는 방식).
- 조회 결과의 컬럼명(CODE_NM, code_nm)을 camelCase(codeNm) 로 바꿔서 돌려준다.
- 파라미터는 camelCase 이름 그대로: %(userNm)s
- '' 는 None 으로 바꾼다 (Oracle 은 '' 를 NULL 로 취급하므로 두 DB 결과를 맞춘다)
- 파라미터 이름은 영문자로 시작해야 한다 (Oracle 바인드 변수 규칙)
- SQL 안의 % 문자는 %% 로 쓴다: LIKE '%%' || %(userNm)s || '%%'

    rows = select_list('SELECT CODE, CODE_NM FROM TB_COMM_CODE WHERE GROUP_CD = %(groupCd)s', {'groupCd': 'DEPT'})
    # [{'code': 'D01', 'codeNm': '개발팀'}, ...]
"""
from decimal import Decimal

from django.db import connection

from .case import to_camel
from .paging import PageParam


def _clean(sql: str, params: dict | None) -> dict:
    # Oracle 드라이버는 SQL 에 없는 파라미터가 있으면 오류를 내므로, 실제로 쓰인 것만 넘긴다
    return {k: (None if v == '' else v) for k, v in (params or {}).items() if f'%({k})s' in sql}


def _value(v):
    # NUMBER(15) 같은 정수 컬럼이 Decimal 로 오면 int 로
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    return v


def select_list(sql: str, params: dict | None = None) -> list[dict]:
    with connection.cursor() as cur:
        cur.execute(sql, _clean(sql, params))
        names = [to_camel(c[0]) for c in cur.description]
        return [dict(zip(names, map(_value, row))) for row in cur.fetchall()]


def select_one(sql: str, params: dict | None = None) -> dict | None:
    rows = select_list(sql, params)
    return rows[0] if rows else None


def select_value(sql: str, params: dict | None = None):
    with connection.cursor() as cur:
        cur.execute(sql, _clean(sql, params))
        row = cur.fetchone()
        return _value(row[0]) if row else None


def select_page(sql: str, params: dict, page: PageParam) -> dict:
    """
    목록 SQL(ORDER BY 없이)을 받아 건수 조회 + 페이지 조회를 한다.
    OFFSET ... FETCH NEXT ... 는 Oracle 12c+ 와 PostgreSQL 공통 문법.
    """
    total = select_value(f'SELECT COUNT(*) FROM ({sql}) T', params) or 0
    rows = []
    if total:
        rows = select_list(
            f'{sql} ORDER BY {page.order_by} OFFSET %(pageOffset)s ROWS FETCH NEXT %(pageSize)s ROWS ONLY',
            {**params, 'pageOffset': page.offset, 'pageSize': page.size},
        )
    return page.result(rows, total)


def execute(sql: str, params: dict | None = None) -> int:
    """INSERT / UPDATE / DELETE. 영향받은 행 수."""
    with connection.cursor() as cur:
        cur.execute(sql, _clean(sql, params))
        return cur.rowcount

