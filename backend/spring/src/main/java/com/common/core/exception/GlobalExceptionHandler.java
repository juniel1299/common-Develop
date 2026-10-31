package com.common.core.exception;

import com.common.core.response.ApiResponse;
import com.common.core.response.ResultCode;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** 모든 예외를 공통 응답 형식으로. 서버 오류의 상세 내용은 로그에만 남긴다 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    /** rows[3].userNm → 3, userNm (그리드 일괄 저장 검증) */
    private static final Pattern ROW_FIELD = Pattern.compile("^rows\\[(\\d+)]\\.(.+)$");

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Object>> biz(BizException e) {
        return ResponseEntity.status(e.getStatus()).body(ApiResponse.fail(e.getCode(), e.getMessage(), e.getData()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> invalid(MethodArgumentNotValidException e) {
        List<FieldError> errors = e.getBindingResult().getFieldErrors().stream().map(fe -> {
            Matcher m = ROW_FIELD.matcher(fe.getField());
            return m.matches()
                    ? new FieldError(m.group(2), (Integer.parseInt(m.group(1)) + 1) + "행 " + fe.getDefaultMessage())
                    : new FieldError(fe.getField(), fe.getDefaultMessage());
        }).toList();
        return respond(ResultCode.VALIDATION_ERROR, ResultCode.VALIDATION_ERROR.message(), Map.of("errors", errors));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiResponse<Object>> duplicate(DuplicateKeyException e) {
        log.info("중복 키: {}", e.getMostSpecificCause().getMessage());
        return respond(ResultCode.CONFLICT, "이미 등록된 데이터입니다.", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> integrity(DataIntegrityViolationException e) {
        log.info("무결성 위반: {}", e.getMostSpecificCause().getMessage());
        return respond(ResultCode.CONFLICT, "다른 데이터와 연결되어 있거나 허용되지 않는 값입니다.", null);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Object>> badRequest(Exception e) {
        return respond(ResultCode.BAD_REQUEST, ResultCode.BAD_REQUEST.message(), null);
    }

    @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<ApiResponse<Object>> notFound(Exception e) {
        return respond(ResultCode.NOT_FOUND, "없는 API 입니다.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> unknown(Exception e) {
        log.error("처리되지 않은 오류", e);
        return respond(ResultCode.SERVER_ERROR, ResultCode.SERVER_ERROR.message(), null);
    }

    private ResponseEntity<ApiResponse<Object>> respond(ResultCode code, String message, Object data) {
        return ResponseEntity.status(code.status()).body(ApiResponse.fail(code.name(), message, data));
    }
}
