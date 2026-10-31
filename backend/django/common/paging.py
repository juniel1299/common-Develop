"""목록 조회 파라미터. sort 는 허용 목록으로 검사한 뒤 ORDER BY 로 바꾼다 (화면 값을 SQL 에 그대로 넣지 않음)."""
import math

from .response import ApiException

DEFAULT_SIZE = 20
MAX_SIZE = 1000


def _int(v, fallback):
    try:
        return int(v)
    except (TypeError, ValueError):
        return fallback


class PageParam:
    """
        page = PageParam(request.query_params, sorts={'userNm': 'USER_NM'}, default_sort='USER_ID ASC')
        select_page(sql, page.conditions, page)
    """

    def __init__(self, query_params, sorts: dict[str, str], default_sort: str):
        self.page = max(1, _int(query_params.get('page'), 1))
        self.size = min(MAX_SIZE, max(1, _int(query_params.get('size'), DEFAULT_SIZE)))
        self.offset = (self.page - 1) * self.size

        order = []
        for spec in query_params.getlist('sort') if hasattr(query_params, 'getlist') else []:
            field, _, direction = spec.partition(',')
            column = sorts.get(field.strip())
            if not column:
                raise ApiException('BAD_REQUEST', f'정렬할 수 없는 항목입니다: {field}')
            order.append(f"{column} {'DESC' if direction.strip().lower() == 'desc' else 'ASC'}")
        self.order_by = ', '.join(order) or default_sort

        # 조회 조건: page·size·sort 를 뺀 나머지 (빈 값 제외)
        self.conditions = {
            k: v.strip() for k, v in query_params.items() if k not in ('page', 'size', 'sort') and v and v.strip()
        }

    def cond(self, *names: str) -> dict:
        """SQL 에서 쓰는 조건 키를 모두 채운 dict (없으면 None)."""
        return {n: self.conditions.get(n) for n in names}

    def result(self, rows: list, total: int) -> dict:
        return {'list': rows, 'page': self.page, 'size': self.size, 'totalCount': total,
                'totalPages': math.ceil(total / self.size)}
