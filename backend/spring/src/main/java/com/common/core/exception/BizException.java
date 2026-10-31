package com.common.core.exception;

import com.common.core.response.ResultCode;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * 업무 예외. 서비스에서 던지면 공통 응답 형식으로 바뀐다.
 * <pre>
 * throw new BizException(ResultCode.NOT_FOUND, "사용자를 찾을 수 없습니다.");
 * throw BizException.biz("BIZ_ALREADY_APPROVED", "이미 승인된 건입니다.");
 * throw BizException.field("userNm", "이름은 필수입니다.");
 * </pre>
 */
public class BizException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final transient Object data;

    public BizException(ResultCode code, String message) {
        this(code.name(), code.status(), message, null);
    }

    public BizException(String code, HttpStatus status, String message, Object data) {
        super(message);
        this.code = code;
        this.status = status;
        this.data = data;
    }

    /** 업무 코드 (BIZ_ 로 시작). HTTP 400 */
    public static BizException biz(String code, String message) {
        return new BizException(code, HttpStatus.BAD_REQUEST, message, null);
    }

    /** 입력값 오류 */
    public static BizException fields(List<FieldError> errors) {
        return new BizException(ResultCode.VALIDATION_ERROR.name(), HttpStatus.BAD_REQUEST,
                ResultCode.VALIDATION_ERROR.message(), Map.of("errors", errors));
    }

    public static BizException field(String field, String message) {
        return fields(List.of(new FieldError(field, message)));
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Object getData() {
        return data;
    }
}
