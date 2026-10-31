"""샘플: 좌석 배치도 API. 화면의 LayoutMap 이 그리드처럼 rowStatus 를 붙여 보내므로 save_rows 를 그대로 쓴다."""
from rest_framework import serializers
from rest_framework.decorators import api_view

from common import fields
from common.response import ApiException, ok
from common.save import save_rows
from common.sql import execute, select_list

LOGIN_ID = 'system'


def _int(label: str, required=False, min_value=None):
    # 화면에서 끌어 놓은 좌표는 소수가 올 수 있어 반올림해서 받는다
    class RoundField(serializers.FloatField):
        def to_internal_value(self, data):
            v = super().to_internal_value(data)
            return None if v is None else int(round(v))

    return RoundField(required=required, allow_null=not required, min_value=min_value,
                      error_messages={'required': f'{label}은(는) 필수입니다.', 'null': f'{label}은(는) 필수입니다.',
                                      'invalid': f'{label}은(는) 숫자입니다.', 'min_value': f'{label}은(는) {{min_value}} 이상입니다.'})


class ItemSerializer(serializers.Serializer):
    mapId = fields.text('도면', required=True, max_length=20)
    itemId = fields.text('항목키', required=True, max_length=30)
    itemNm = fields.text('이름', max_length=50)
    itemType = fields.text('종류', required=True, max_length=30)
    posX = _int('X')
    posY = _int('Y')
    width = _int('가로', required=True, min_value=1)
    height = _int('세로', required=True, min_value=1)
    rotate = serializers.ChoiceField([0, 90, 180, 270], required=False, allow_null=True, default=0,
                                     error_messages={'invalid_choice': '회전은 0, 90, 180, 270 중 하나입니다.'})
    shape = serializers.ChoiceField(['rect', 'circle'], required=False, allow_null=True, default='rect',
                                    error_messages={'invalid_choice': '모양은 rect, circle 중 하나입니다.'})
    userId = fields.text('사용자', max_length=20)


@api_view(['GET'])
def maps(request):
    return ok(select_list(
        "SELECT MAP_ID, MAP_NM, WIDTH, HEIGHT, BG_URL FROM TB_LAYOUT_MAP WHERE USE_YN = 'Y' ORDER BY SORT_ORD, MAP_ID"))


@api_view(['GET'])
def items(request):
    return ok(select_list(
        """
        SELECT I.MAP_ID, I.ITEM_ID, I.ITEM_NM, I.ITEM_TYPE, I.POS_X, I.POS_Y, I.WIDTH, I.HEIGHT, I.ROTATE, I.SHAPE,
               I.USER_ID, U.USER_NM
          FROM TB_LAYOUT_ITEM I
          LEFT JOIN TB_USER U ON U.USER_ID = I.USER_ID
         WHERE I.MAP_ID = %(mapId)s
         ORDER BY I.ITEM_ID
        """,
        {'mapId': request.query_params.get('mapId')},
    ))


COLS = ('mapId', 'itemId', 'itemNm', 'itemType', 'posX', 'posY', 'width', 'height', 'rotate', 'shape', 'userId')


def _p(r):
    return {**{k: r.get(k) for k in COLS}, 'loginId': LOGIN_ID}


def _update(r):
    n = execute(
        """UPDATE TB_LAYOUT_ITEM
              SET ITEM_NM = %(itemNm)s, ITEM_TYPE = %(itemType)s, POS_X = COALESCE(%(posX)s, 0), POS_Y = COALESCE(%(posY)s, 0),
                  WIDTH = %(width)s, HEIGHT = %(height)s, ROTATE = COALESCE(%(rotate)s, 0), SHAPE = COALESCE(%(shape)s, 'rect'),
                  USER_ID = %(userId)s, MOD_ID = %(loginId)s, MOD_DT = CURRENT_TIMESTAMP
            WHERE MAP_ID = %(mapId)s AND ITEM_ID = %(itemId)s""",
        _p(r))
    if not n:
        raise ApiException('NOT_FOUND', f"항목을 찾을 수 없습니다: {r['itemId']}")


@api_view(['POST'])
def save_items(request):
    return ok(save_rows(
        request.data.get('rows'), ItemSerializer,
        insert=lambda r: execute(  # 같은 키면 IntegrityError → CONFLICT
            """INSERT INTO TB_LAYOUT_ITEM (MAP_ID, ITEM_ID, ITEM_NM, ITEM_TYPE, POS_X, POS_Y, WIDTH, HEIGHT, ROTATE, SHAPE,
                                           USER_ID, REG_ID, REG_DT)
               VALUES (%(mapId)s, %(itemId)s, %(itemNm)s, %(itemType)s, COALESCE(%(posX)s, 0), COALESCE(%(posY)s, 0),
                       %(width)s, %(height)s, COALESCE(%(rotate)s, 0), COALESCE(%(shape)s, 'rect'), %(userId)s,
                       %(loginId)s, CURRENT_TIMESTAMP)""",
            _p(r)),
        update=_update,
        delete=lambda r: execute('DELETE FROM TB_LAYOUT_ITEM WHERE MAP_ID = %(mapId)s AND ITEM_ID = %(itemId)s', _p(r)),
        key_fields=('mapId', 'itemId'),
    ))
