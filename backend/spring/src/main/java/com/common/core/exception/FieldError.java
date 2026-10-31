package com.common.core.exception;

/** 입력값 오류 한 건. field 는 camelCase (프론트 폼 필드 이름과 같다) */
public record FieldError(String field, String message) {
}
