"""공통 응답 { success, code, message, data } 와 예외 처리."""
import logging

from django.db import IntegrityError
from django.http import Http404, JsonResponse
from rest_framework import exceptions
from rest_framework.response import Response

log = logging.getLogger('common')

MESSAGES = {
    'OK': '정상 처리되었습니다.',
    'BAD_REQUEST': '잘못된 요청입니다.',
    'VALIDATION_ERROR': '입력값을 확인해주세요.',
    'UNAUTHORIZED': '로그인이 필요합니다.',
    'FORBIDDEN': '권한이 없습니다.',
    'NOT_FOUND': '대상을 찾을 수 없습니다.',
    'CONFLICT': '이미 있거나 다른 데이터와 충돌합니다.',
    'SERVER_ERROR': '서버 오류가 발생했습니다.',
}
STATUS = {
    'BAD_REQUEST': 400, 'VALIDATION_ERROR': 400, 'UNAUTHORIZED': 401, 'FORBIDDEN': 403,
    'NOT_FOUND': 404, 'CONFLICT': 409, 'SERVER_ERROR': 500,
}


def ok(data=None) -> Response:
    return Response({'success': True, 'code': 'OK', 'message': MESSAGES['OK'], 'data': data})


def fail(code: str, message: str | None = None, data=None, status: int | None = None) -> Response:
    return Response(
        {'success': False, 'code': code, 'message': message or MESSAGES.get(code, ''), 'data': data},
        status=status or STATUS.get(code, 400),
    )


class ApiException(Exception):
    """
    업무 예외. 뷰·서비스에서 던지면 공통 응답 형식으로 바뀐다.
        raise ApiException('NOT_FOUND', '사용자를 찾을 수 없습니다.')
        raise ApiException('BIZ_ALREADY_APPROVED', '이미 승인된 건입니다.')
        raise ApiException.fields([{'field': 'userNm', 'message': '이름은 필수입니다.'}])
    """

    def __init__(self, code: str, message: str | None = None, data=None, status: int | None = None):
        super().__init__(message or MESSAGES.get(code, code))
        self.code = code
        self.message = message or MESSAGES.get(code, code)
        self.data = data
        self.status = status or STATUS.get(code, 400)

    @classmethod
    def fields(cls, errors: list[dict]) -> 'ApiException':
        return cls('VALIDATION_ERROR', data={'errors': errors})


def field_errors(errors: dict, prefix: str = '') -> list[dict]:
    """DRF serializer.errors → [{ field, message }] (필드마다 첫 메시지)."""
    out = []
    for field, msgs in errors.items():
        msg = msgs[0] if isinstance(msgs, list) and msgs else msgs
        out.append({'field': field, 'message': f'{prefix}{msg}'})
    return out


def exception_handler(exc, context):
    if isinstance(exc, ApiException):
        return fail(exc.code, exc.message, exc.data, exc.status)
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail if isinstance(exc.detail, dict) else {'non_field_errors': exc.detail}
        return fail('VALIDATION_ERROR', data={'errors': field_errors(detail)})
    if isinstance(exc, (Http404, exceptions.NotFound, exceptions.MethodNotAllowed)):
        return fail('NOT_FOUND', '없는 API 입니다.' if not isinstance(exc, Http404) else None)
    if isinstance(exc, (exceptions.ParseError, exceptions.UnsupportedMediaType)):
        return fail('BAD_REQUEST')
    if isinstance(exc, exceptions.NotAuthenticated):
        return fail('UNAUTHORIZED')
    if isinstance(exc, exceptions.PermissionDenied):
        return fail('FORBIDDEN')
    if isinstance(exc, IntegrityError):
        log.info('무결성 위반: %s', exc)
        text = str(exc).lower()
        duplicate = 'unique' in text or 'duplicate' in text or 'ora-00001' in text
        return fail('CONFLICT', '이미 등록된 데이터입니다.' if duplicate else '다른 데이터와 연결되어 있거나 허용되지 않는 값입니다.')
    log.exception('처리되지 않은 오류')
    return fail('SERVER_ERROR')


def not_found(request, *args, **kwargs):
    """등록되지 않은 /api 경로."""
    return JsonResponse({'success': False, 'code': 'NOT_FOUND', 'message': '없는 API 입니다.', 'data': None}, status=404)
