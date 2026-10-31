package com.common.core.save;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/** 그리드 일괄 저장 요청. { rows: [{ rowStatus: 'I'|'U'|'D', ... }] }. 행 검증은 RowSaver 가 한다 (삭제 행 제외) */
public record SaveRequest<T extends HasRowStatus>(@NotNull List<T> rows) {
}
