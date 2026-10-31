"""샘플: 공통코드 관리 화면 API. serializer 대신 필수값만 검사하는 간단한 방식."""
from rest_framework import serializers
from rest_framework.decorators import api_view

from common import fields
from common.response import ApiException, ok
from common.save import save_rows
from common.sql import execute, select_list, select_value

LOGIN_ID = 'system'


class GroupSerializer(serializers.Serializer):
    groupCd = fields.text('그룹코드', required=True, max_length=30)
    groupNm = fields.text('그룹명', required=True, max_length=100)
    useYn = fields.yn('사용여부')


class CodeSerializer(serializers.Serializer):
    groupCd = fields.text('그룹코드', required=True, max_length=30)
    code = fields.text('코드', required=True, max_length=30)
    codeNm = fields.text('코드명', required=True, max_length=100)
    sortOrd = fields.integer('순서', min_value=0)
    useYn = fields.yn('사용여부')


@api_view(['GET'])
def groups(request):
    return ok(select_list('SELECT GROUP_CD, GROUP_NM, USE_YN FROM TB_COMM_CODE_GROUP ORDER BY GROUP_CD'))


@api_view(['GET'])
def codes(request):
    return ok(select_list(
        """
        SELECT GROUP_CD, CODE, CODE_NM, SORT_ORD, USE_YN
          FROM TB_COMM_CODE
         WHERE GROUP_CD = %(groupCd)s
         ORDER BY SORT_ORD, CODE
        """,
        {'groupCd': request.query_params.get('groupCd')},
    ))


def _p(r, *keys):
    return {**{k: r.get(k) for k in keys}, 'loginId': LOGIN_ID}


@api_view(['POST'])
def save_groups(request):
    def delete(r):
        if select_value('SELECT COUNT(*) FROM TB_COMM_CODE WHERE GROUP_CD = %(groupCd)s', {'groupCd': r['groupCd']}):
            raise ApiException('CONFLICT', f"하위 코드가 있어 삭제할 수 없습니다: {r['groupCd']}")
        execute('DELETE FROM TB_COMM_CODE_GROUP WHERE GROUP_CD = %(groupCd)s', {'groupCd': r['groupCd']})

    return ok(save_rows(
        request.data.get('rows'), GroupSerializer,
        insert=lambda r: execute(
            """INSERT INTO TB_COMM_CODE_GROUP (GROUP_CD, GROUP_NM, USE_YN, REG_ID, REG_DT)
               VALUES (%(groupCd)s, %(groupNm)s, COALESCE(%(useYn)s, 'Y'), %(loginId)s, CURRENT_TIMESTAMP)""",
            _p(r, 'groupCd', 'groupNm', 'useYn')),
        update=lambda r: execute(
            """UPDATE TB_COMM_CODE_GROUP SET GROUP_NM = %(groupNm)s, USE_YN = COALESCE(%(useYn)s, 'Y'),
                      MOD_ID = %(loginId)s, MOD_DT = CURRENT_TIMESTAMP
                WHERE GROUP_CD = %(groupCd)s""",
            _p(r, 'groupCd', 'groupNm', 'useYn')),
        delete=delete,
        key_fields=('groupCd',),
    ))


@api_view(['POST'])
def save_codes(request):
    return ok(save_rows(
        request.data.get('rows'), CodeSerializer,
        insert=lambda r: execute(
            """INSERT INTO TB_COMM_CODE (GROUP_CD, CODE, CODE_NM, SORT_ORD, USE_YN, REG_ID, REG_DT)
               VALUES (%(groupCd)s, %(code)s, %(codeNm)s, COALESCE(%(sortOrd)s, 0), COALESCE(%(useYn)s, 'Y'),
                       %(loginId)s, CURRENT_TIMESTAMP)""",
            _p(r, 'groupCd', 'code', 'codeNm', 'sortOrd', 'useYn')),
        update=lambda r: execute(
            """UPDATE TB_COMM_CODE SET CODE_NM = %(codeNm)s, SORT_ORD = COALESCE(%(sortOrd)s, 0),
                      USE_YN = COALESCE(%(useYn)s, 'Y'), MOD_ID = %(loginId)s, MOD_DT = CURRENT_TIMESTAMP
                WHERE GROUP_CD = %(groupCd)s AND CODE = %(code)s""",
            _p(r, 'groupCd', 'code', 'codeNm', 'sortOrd', 'useYn')),
        delete=lambda r: execute('DELETE FROM TB_COMM_CODE WHERE GROUP_CD = %(groupCd)s AND CODE = %(code)s',
                                 _p(r, 'groupCd', 'code')),
        key_fields=('groupCd', 'code'),
    ))
