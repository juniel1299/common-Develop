from rest_framework.decorators import api_view

from .response import ok
from .sql import select_list


@api_view(['GET'])
def codes(request):
    """GET /api/common/codes?groupCd=USE_YN,DEPT → [{ groupCd, codes: [{ code, codeNm }] }]"""
    group_cds = list(dict.fromkeys(g.strip() for g in request.query_params.get('groupCd', '').split(',') if g.strip()))
    if not group_cds:
        return ok([])
    names = {f'g{i}': g for i, g in enumerate(group_cds)}
    rows = select_list(
        f"""
        SELECT C.GROUP_CD, C.CODE, C.CODE_NM
          FROM TB_COMM_CODE C
          JOIN TB_COMM_CODE_GROUP G ON G.GROUP_CD = C.GROUP_CD
         WHERE C.GROUP_CD IN ({', '.join(f'%({k})s' for k in names)})
           AND C.USE_YN = 'Y' AND G.USE_YN = 'Y'
         ORDER BY C.GROUP_CD, C.SORT_ORD, C.CODE
        """,
        names,
    )
    by_group = {g: [] for g in group_cds}
    for r in rows:
        by_group[r['groupCd']].append({'code': r['code'], 'codeNm': r['codeNm']})
    return ok([{'groupCd': g, 'codes': c} for g, c in by_group.items()])
