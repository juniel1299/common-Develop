"""CODE_NM ↔ codeNm. 규칙은 docs/api-convention.md 1장, 프론트 @common/core case.ts 와 같다."""
import re


def to_camel(key: str) -> str:
    """CODE_NM · code_nm → codeNm. 이미 camelCase 면 그대로."""
    if '_' not in key and key != key.upper():
        return key
    parts = [p for p in key.lower().split('_') if p]
    return parts[0] + ''.join(p[:1].upper() + p[1:] for p in parts[1:]) if parts else key


def to_snake(key: str) -> str:
    """codeNm → CODE_NM."""
    if key == key.upper():
        return key
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', key)
    return re.sub(r'([a-z])([0-9])', r'\1_\2', s).upper()
