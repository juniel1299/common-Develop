package com.common.core;

/**
 * 현재 로그인 사용자 ID. REG_ID, MOD_ID 에 쓴다.
 * 인증을 붙이면 SecurityContext 등에서 꺼내도록 이 한 곳만 바꾼다.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static String id() {
        return "system";
    }
}
