package com.common.sample.user;

import com.common.core.mybatis.CamelMap;
import com.common.core.response.ApiResponse;
import com.common.core.response.PageResult;
import com.common.core.save.SaveRequest;
import com.common.core.save.SaveResult;
import jakarta.validation.Valid;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 샘플: 사용자 CRUD + 그리드 일괄 저장. 새 업무 API 를 만들 때 이 파일을 복사해서 시작한다 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResult<CamelMap>> list(@RequestParam MultiValueMap<String, String> params) {
        return ApiResponse.ok(service.list(params));
    }

    @GetMapping("/{userId}")
    public ApiResponse<CamelMap> find(@PathVariable String userId) {
        return ApiResponse.ok(service.find(userId));
    }

    @PostMapping
    public ApiResponse<CamelMap> create(@Valid @RequestBody UserDto body) {
        return ApiResponse.ok(service.create(body));
    }

    @PutMapping("/{userId}")
    public ApiResponse<CamelMap> update(@PathVariable String userId, @Valid @RequestBody UserDto body) {
        return ApiResponse.ok(service.update(userId, body));
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> delete(@PathVariable String userId) {
        service.delete(userId);
        return ApiResponse.ok();
    }

    @PostMapping("/save")
    public ApiResponse<SaveResult> save(@RequestBody SaveRequest<UserDto> body) {
        return ApiResponse.ok(service.save(body.rows()));
    }
}
