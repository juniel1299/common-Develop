package com.common.core.save;

import java.util.LinkedHashMap;

/** DTO 없이 Map 으로 받는 저장 행. 키는 camelCase 그대로 SQL 파라미터가 된다 (#{codeNm}) */
public class MapRow extends LinkedHashMap<String, Object> implements HasRowStatus {

    @Override
    public String rowStatus() {
        Object v = get("rowStatus");
        return v == null ? null : v.toString();
    }

    public String getString(String key) {
        Object v = get(key);
        return v == null ? null : v.toString().trim();
    }
}
