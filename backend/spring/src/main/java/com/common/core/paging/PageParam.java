package com.common.core.paging;

import com.common.core.exception.BizException;
import com.common.core.response.ResultCode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.util.MultiValueMap;

/**
 * 목록 조회 파라미터 (page, size, sort + 조회 조건).
 * sort 는 허용 목록(camelCase → 컬럼)으로 검사한 뒤 ORDER BY 문자열로 바꾼다. 화면 값을 그대로 SQL 에 넣지 않는다.
 * <pre>
 * PageParam p = PageParam.of(params, Map.of("userNm", "USER_NM"), "USER_ID ASC");
 * mapper.list(p.toMap());   // #{userNm}, #{offset}, #{size}, ${orderBy}
 * </pre>
 */
public final class PageParam {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 1000;

    private final int page;
    private final int size;
    private final String orderBy;
    private final Map<String, Object> conditions;

    private PageParam(int page, int size, String orderBy, Map<String, Object> conditions) {
        this.page = page;
        this.size = size;
        this.orderBy = orderBy;
        this.conditions = conditions;
    }

    /**
     * @param params      요청 파라미터. 컨트롤러에서 @RequestParam MultiValueMap 으로 받는다
     *                    (List&lt;String&gt; 으로 받으면 Spring 이 'codeNm,asc' 를 쉼표로 쪼개버린다)
     * @param sorts       정렬 허용 목록. 필드명(camelCase) → 컬럼명
     * @param defaultSort 정렬 조건이 없을 때 ORDER BY
     */
    public static PageParam of(MultiValueMap<String, String> multi, Map<String, String> sorts, String defaultSort) {
        Map<String, String> params = multi.toSingleValueMap();
        List<String> sortParams = multi.get("sort");
        int page = Math.max(1, parseInt(params.get("page"), 1));
        int size = Math.min(MAX_SIZE, Math.max(1, parseInt(params.get("size"), DEFAULT_SIZE)));

        List<String> order = new ArrayList<>();
        for (String spec : sortParams == null ? List.<String>of() : sortParams) {
            String[] parts = spec.split(",");
            String column = sorts.get(parts[0].trim());
            if (column == null) throw new BizException(ResultCode.BAD_REQUEST, "정렬할 수 없는 항목입니다: " + parts[0]);
            boolean desc = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc");
            order.add(column + (desc ? " DESC" : " ASC"));
        }

        Map<String, Object> conditions = new HashMap<>();
        params.forEach((k, v) -> {
            if (!k.equals("page") && !k.equals("size") && !k.equals("sort") && v != null && !v.isBlank()) conditions.put(k, v.trim());
        });
        return new PageParam(page, size, order.isEmpty() ? defaultSort : String.join(", ", order), conditions);
    }

    private static int parseInt(String v, int fallback) {
        try {
            return v == null ? fallback : Integer.parseInt(v);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    /** MyBatis 파라미터. 조회 조건 + offset, size, orderBy */
    public Map<String, Object> toMap() {
        Map<String, Object> m = new HashMap<>(conditions);
        m.put("offset", (page - 1) * size);
        m.put("size", size);
        m.put("orderBy", orderBy);
        return m;
    }

    public int page() {
        return page;
    }

    public int size() {
        return size;
    }
}
