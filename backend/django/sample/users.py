"""샘플: 사용자 CRUD + 그리드 일괄 저장. 새 업무 API 를 만들 때 이 파일을 복사해서 시작한다."""
from rest_framework import serializers
from rest_framework.decorators import api_view

from common import fields
from common.paging import PageParam
from common.response import ApiException, ok
from common.save import save_rows
from common.sql import execute, select_one, select_page

LOGIN_ID = 'system'  # 인증을 붙이면 request.user 에서

SORTS = {'userId': 'USER_ID', 'userNm': 'USER_NM', 'deptCd': 'DEPT_CD', 'joinDt': 'JOIN_DT', 'salary': 'SALARY',
         'regDt': 'REG_DT'}

COLUMNS = """
    U.USER_ID, U.USER_NM, U.DEPT_CD, U.EMAIL,
    TO_CHAR(U.JOIN_DT, 'YYYY-MM-DD') AS JOIN_DT,
    U.SALARY, U.USE_YN, U.REMARK,
    TO_CHAR(U.REG_DT, 'YYYY-MM-DD"T"HH24:MI:SS') AS REG_DT
"""


class UserSerializer(serializers.Serializer):
    """필드명은 JSON(camelCase) 과 SQL 파라미터 %(userNm)s 에 그대로 쓰인다."""
    userId = fields.text('아이디', required=True, regex=r'^[a-z0-9_]{3,20}$', regex_message='아이디는 영문 소문자·숫자 3~20자입니다.')
    userNm = fields.text('이름', required=True, max_length=50)
    deptCd = fields.text('부서', required=True)
    email = fields.email('이메일')
    joinDt = fields.date('입사일')
    salary = fields.integer('급여', min_value=0)
    useYn = fields.yn('사용여부')
    remark = fields.text('비고', max_length=500)


def _find(user_id):
    u = select_one(f'SELECT {COLUMNS} FROM TB_USER U WHERE U.USER_ID = %(userId)s', {'userId': user_id})
    if not u:
        raise ApiException('NOT_FOUND', '사용자를 찾을 수 없습니다.')
    return u


def _validated(data, user_id=None):
    s = UserSerializer(data={**data, **({'userId': user_id} if user_id else {})})
    s.is_valid(raise_exception=True)
    return s.validated_data


def _insert(u):
    execute(
        """
        INSERT INTO TB_USER (USER_ID, USER_NM, DEPT_CD, EMAIL, JOIN_DT, SALARY, USE_YN, REMARK, REG_ID, REG_DT)
        VALUES (%(userId)s, %(userNm)s, %(deptCd)s, %(email)s, TO_DATE(%(joinDt)s, 'YYYY-MM-DD'), %(salary)s,
                COALESCE(%(useYn)s, 'Y'), %(remark)s, %(loginId)s, CURRENT_TIMESTAMP)
        """,
        {**_params(u), 'loginId': LOGIN_ID},
    )


def _update(u):
    n = execute(
        """
        UPDATE TB_USER
           SET USER_NM = %(userNm)s, DEPT_CD = %(deptCd)s, EMAIL = %(email)s,
               JOIN_DT = TO_DATE(%(joinDt)s, 'YYYY-MM-DD'), SALARY = %(salary)s,
               USE_YN = COALESCE(%(useYn)s, 'Y'), REMARK = %(remark)s,
               MOD_ID = %(loginId)s, MOD_DT = CURRENT_TIMESTAMP
         WHERE USER_ID = %(userId)s
        """,
        {**_params(u), 'loginId': LOGIN_ID},
    )
    if n == 0:
        raise ApiException('NOT_FOUND', f"사용자를 찾을 수 없습니다: {u['userId']}")


def _delete(u):
    return execute('DELETE FROM TB_USER WHERE USER_ID = %(userId)s', {'userId': u['userId']})


def _params(u):
    keys = ('userId', 'userNm', 'deptCd', 'email', 'joinDt', 'salary', 'useYn', 'remark')
    return {k: u.get(k) for k in keys}


@api_view(['GET', 'POST'])
def users(request):
    if request.method == 'POST':
        u = _validated(request.data)
        _insert(u)  # 중복이면 IntegrityError → CONFLICT
        return ok(_find(u['userId']))

    page = PageParam(request.query_params, SORTS, 'USER_ID ASC')
    sql = f"""
        SELECT {COLUMNS}
          FROM TB_USER U
         WHERE (%(userId)s IS NULL OR U.USER_ID LIKE '%%' || %(userId)s || '%%')
           AND (%(userNm)s IS NULL OR U.USER_NM LIKE '%%' || %(userNm)s || '%%')
           AND (%(deptCd)s IS NULL OR U.DEPT_CD = %(deptCd)s)
           AND (%(useYn)s IS NULL OR U.USE_YN = %(useYn)s)
           AND (%(joinDtFrom)s IS NULL OR U.JOIN_DT >= TO_DATE(%(joinDtFrom)s, 'YYYY-MM-DD'))
           AND (%(joinDtTo)s IS NULL OR U.JOIN_DT < TO_DATE(%(joinDtTo)s, 'YYYY-MM-DD') + 1)
    """
    return ok(select_page(sql, page.cond('userId', 'userNm', 'deptCd', 'useYn', 'joinDtFrom', 'joinDtTo'), page))


@api_view(['GET', 'PUT', 'DELETE'])
def user(request, user_id):
    if request.method == 'GET':
        return ok(_find(user_id))
    if request.method == 'PUT':
        u = _validated(request.data, user_id)
        _update(u)
        return ok(_find(user_id))
    if _delete({'userId': user_id}) == 0:
        raise ApiException('NOT_FOUND', '사용자를 찾을 수 없습니다.')
    return ok()


@api_view(['POST'])
def save(request):
    return ok(save_rows(request.data.get('rows'), UserSerializer, _insert, _update, _delete, key_fields=('userId',)))
