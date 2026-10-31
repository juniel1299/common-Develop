package com.common.core.mybatis;

import java.util.LinkedHashMap;

/**
 * 조회 결과용 Map. 넣는 순간 키를 camelCase 로 바꾼다.
 * MyBatis 의 mapUnderscoreToCamelCase 는 DTO 에만 적용되고 Map 결과에는 적용되지 않으므로 이걸 쓴다.
 * <pre>
 * &lt;select id="list" resultType="camelMap"&gt;
 *   SELECT CODE, CODE_NM FROM ...      → { "code": ..., "codeNm": ... }
 * </pre>
 */
public class CamelMap extends LinkedHashMap<String, Object> {

    @Override
    public Object put(String key, Object value) {
        return super.put(CaseUtil.toCamel(key), value);
    }

    public String getString(String key) {
        Object v = get(key);
        return v == null ? null : v.toString();
    }
}
