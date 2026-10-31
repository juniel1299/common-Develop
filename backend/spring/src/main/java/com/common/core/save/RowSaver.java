package com.common.core.save;

import com.common.core.exception.BizException;
import com.common.core.exception.FieldError;
import com.common.core.response.ResultCode;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Consumer;
import org.springframework.stereotype.Component;

/**
 * 그리드 일괄 저장 처리. 등록·수정 행만 검증(@NotBlank 등)한 뒤 D → U → I 순서로 실행한다.
 * 호출하는 서비스 메서드에 @Transactional 을 붙이면 한 건이라도 실패할 때 모두 취소된다.
 * <pre>
 * return rowSaver.save(rows, mapper::insert, mapper::update, mapper::delete);
 * </pre>
 */
@Component
public class RowSaver {

    private final Validator validator;

    public RowSaver(Validator validator) {
        this.validator = validator;
    }

    public <T extends HasRowStatus> SaveResult save(List<T> rows, Consumer<T> insert, Consumer<T> update, Consumer<T> delete) {
        validate(rows);
        int d = 0;
        int u = 0;
        int i = 0;
        for (T row : rows) if ("D".equals(row.rowStatus())) { delete.accept(row); d++; }
        for (T row : rows) if ("U".equals(row.rowStatus())) { update.accept(row); u++; }
        for (T row : rows) if ("I".equals(row.rowStatus())) { insert.accept(row); i++; }
        return new SaveResult(i, u, d);
    }

    /** 삭제 행은 키만 있으면 되므로 검증하지 않는다. 오류 메시지는 'N행 ...' */
    private <T extends HasRowStatus> void validate(List<T> rows) {
        List<FieldError> errors = new ArrayList<>();
        for (int n = 0; n < rows.size(); n++) {
            T row = rows.get(n);
            String s = row.rowStatus();
            if (!"I".equals(s) && !"U".equals(s) && !"D".equals(s)) {
                throw new BizException(ResultCode.BAD_REQUEST, (n + 1) + "행 rowStatus 는 I, U, D 중 하나여야 합니다.");
            }
            if ("D".equals(s)) continue;
            int rowNo = n + 1;
            validator.validate(row).stream()
                    .sorted(Comparator.comparing((ConstraintViolation<T> v) -> v.getPropertyPath().toString()))
                    .forEach(v -> errors.add(new FieldError(v.getPropertyPath().toString(), rowNo + "행 " + v.getMessage())));
        }
        if (!errors.isEmpty()) throw BizException.fields(errors);
    }
}
