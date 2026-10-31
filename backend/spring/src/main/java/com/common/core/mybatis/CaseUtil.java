package com.common.core.mybatis;

/** CODE_NM ↔ codeNm. 규칙은 docs/api-convention.md 1장, 프론트 @common/core case.ts 와 같다 */
public final class CaseUtil {

    private CaseUtil() {
    }

    /** CODE_NM · code_nm → codeNm. 이미 camelCase 면 그대로 */
    public static String toCamel(String key) {
        if (key.indexOf('_') < 0 && !key.equals(key.toUpperCase())) return key;
        StringBuilder sb = new StringBuilder(key.length());
        boolean upper = false;
        for (char c : key.toLowerCase().toCharArray()) {
            if (c == '_') {
                upper = sb.length() > 0;
            } else {
                sb.append(upper ? Character.toUpperCase(c) : c);
                upper = false;
            }
        }
        return sb.toString();
    }

    /** codeNm → CODE_NM */
    public static String toSnake(String key) {
        if (key.equals(key.toUpperCase())) return key;
        return key.replaceAll("([a-z0-9])([A-Z])", "$1_$2").replaceAll("([a-z])([0-9])", "$1_$2").toUpperCase();
    }
}
