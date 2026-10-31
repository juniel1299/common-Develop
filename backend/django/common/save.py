"""그리드 일괄 저장. 등록·수정 행만 검증한 뒤 D → U → I 순서로 실행하고, 한 건이라도 실패하면 모두 취소한다."""
from typing import Callable

from django.db import transaction
from rest_framework import serializers

from .response import ApiException, field_errors


def save_rows(rows, serializer_class: type[serializers.Serializer] | None,
              insert: Callable[[dict], None], update: Callable[[dict], None], delete: Callable[[dict], None],
              key_fields: tuple[str, ...] = ()) -> dict:
    """
        return ok(save_rows(request.data.get('rows'), UserSerializer, insert_user, update_user, delete_user,
                            key_fields=('userId',)))
    """
    if not isinstance(rows, list):
        raise ApiException('BAD_REQUEST', 'rows 가 필요합니다.')

    cleaned, errors = [], []
    for n, row in enumerate(rows, start=1):
        status = row.get('rowStatus') if isinstance(row, dict) else None
        if status not in ('I', 'U', 'D'):
            raise ApiException('BAD_REQUEST', f'{n}행 rowStatus 는 I, U, D 중 하나여야 합니다.')
        if status == 'D':
            missing = [k for k in key_fields if not str(row.get(k) or '').strip()]
            errors += [{'field': k, 'message': f'{n}행 {k} 은(는) 필수입니다.'} for k in missing]
            cleaned.append(row)
            continue
        if serializer_class:
            s = serializer_class(data=row)
            if not s.is_valid():
                errors += field_errors(s.errors, prefix=f'{n}행 ')
                continue
            cleaned.append({**s.validated_data, 'rowStatus': status})
        else:
            cleaned.append(row)
    if errors:
        raise ApiException.fields(errors)

    result = {'inserted': 0, 'updated': 0, 'deleted': 0}
    with transaction.atomic():
        for r in cleaned:
            if r['rowStatus'] == 'D':
                delete(r)
                result['deleted'] += 1
        for r in cleaned:
            if r['rowStatus'] == 'U':
                update(r)
                result['updated'] += 1
        for r in cleaned:
            if r['rowStatus'] == 'I':
                insert(r)
                result['inserted'] += 1
    return result
