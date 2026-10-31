package com.common.sample.user;

import com.common.core.save.HasRowStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** 사용자 등록·수정 요청. 필드명은 JSON(camelCase) 과 SQL 파라미터(#{userNm}) 에 그대로 쓰인다 */
public record UserDto(
        String rowStatus,
        @NotBlank(message = "아이디는 필수입니다.")
        @Pattern(regexp = "^[a-z0-9_]{3,20}$", message = "아이디는 영문 소문자·숫자 3~20자입니다.")
        String userId,
        @NotBlank(message = "이름은 필수입니다.") @Size(max = 50, message = "이름은 50자 이하입니다.")
        String userNm,
        @NotBlank(message = "부서는 필수입니다.")
        String deptCd,
        @Email(message = "이메일 형식이 아닙니다.") @Size(max = 100, message = "이메일은 100자 이하입니다.")
        String email,
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "입사일은 YYYY-MM-DD 형식입니다.")
        String joinDt,
        @PositiveOrZero(message = "급여는 0 이상입니다.")
        Long salary,
        @Pattern(regexp = "^[YN]$", message = "사용여부는 Y 또는 N 입니다.")
        String useYn,
        @Size(max = 500, message = "비고는 500자 이하입니다.")
        String remark) implements HasRowStatus {

    /** 경로의 ID 로 바꾼 사본 (PUT /users/{id}) */
    public UserDto withUserId(String id) {
        return new UserDto(rowStatus, id, userNm, deptCd, email, joinDt, salary, useYn, remark);
    }
}
