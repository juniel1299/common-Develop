"""한글 오류 메시지를 가진 serializer 필드. 라벨만 주면 '이름은 필수입니다.' 같은 메시지가 만들어진다."""
from rest_framework import serializers


def _josa(label: str, with_batchim: str, without: str) -> str:
    last = label[-1]
    has = '가' <= last <= '힣' and (ord(last) - 0xAC00) % 28 > 0
    return with_batchim if has else without


def _msgs(label: str, **extra) -> dict:
    eun = _josa(label, '은', '는')
    base = {
        'required': f'{label}{eun} 필수입니다.',
        'blank': f'{label}{eun} 필수입니다.',
        'null': f'{label}{eun} 필수입니다.',
        'invalid': f'{label} 형식이 올바르지 않습니다.',
        'max_length': f'{label}{eun} {{max_length}}자 이하입니다.',
        'min_value': f'{label}{eun} {{min_value}} 이상입니다.',
        'max_value': f'{label}{eun} {{max_value}} 이하입니다.',
        'invalid_choice': f'{label} 값이 올바르지 않습니다.',
    }
    return {**base, **extra}


def text(label: str, required=False, max_length=None, regex=None, regex_message=None, **kw):
    msgs = _msgs(label, invalid=regex_message or f'{label} 형식이 올바르지 않습니다.')
    if regex:
        return serializers.RegexField(regex, required=required, allow_null=not required, allow_blank=not required,
                                      max_length=max_length, error_messages=msgs, **kw)
    return serializers.CharField(required=required, allow_null=not required, allow_blank=not required,
                                 max_length=max_length, error_messages=msgs, **kw)


def email(label: str, required=False, max_length=100):
    return serializers.EmailField(required=required, allow_null=not required, allow_blank=not required,
                                  max_length=max_length, error_messages=_msgs(label, invalid=f'{label} 형식이 아닙니다.'))


def date(label: str, required=False):
    """'YYYY-MM-DD' 문자열 그대로 받는다 (SQL 에서 TO_DATE)."""
    return text(label, required, regex=r'^\d{4}-\d{2}-\d{2}$', regex_message=f'{label}은(는) YYYY-MM-DD 형식입니다.')


def integer(label: str, required=False, min_value=None, max_value=None):
    return serializers.IntegerField(required=required, allow_null=not required, min_value=min_value,
                                    max_value=max_value, error_messages=_msgs(label))


def yn(label: str, default='Y'):
    return serializers.ChoiceField(['Y', 'N'], required=False, allow_null=True, default=default, error_messages=_msgs(label))
