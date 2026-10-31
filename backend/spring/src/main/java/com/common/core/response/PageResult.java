package com.common.core.response;

import java.util.List;

/** 페이징 목록 응답 data */
public record PageResult<T>(List<T> list, int page, int size, long totalCount, int totalPages) {

    public static <T> PageResult<T> of(List<T> list, int page, int size, long totalCount) {
        return new PageResult<>(list, page, size, totalCount, (int) Math.ceil((double) totalCount / size));
    }
}
