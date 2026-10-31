package com.common.sample.code;

import com.common.core.mybatis.CamelMap;
import com.common.core.response.ApiResponse;
import com.common.core.save.MapRow;
import com.common.core.save.SaveRequest;
import com.common.core.save.SaveResult;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 샘플: 공통코드 관리 화면 API (그룹·코드 일괄 저장) */
@RestController
@RequestMapping("/api/codes")
public class CodeController {

    private final CodeService service;

    public CodeController(CodeService service) {
        this.service = service;
    }

    @GetMapping("/groups")
    public ApiResponse<List<CamelMap>> groups() {
        return ApiResponse.ok(service.groups());
    }

    @GetMapping
    public ApiResponse<List<CamelMap>> codes(@RequestParam String groupCd) {
        return ApiResponse.ok(service.codes(groupCd));
    }

    @PostMapping("/groups/save")
    public ApiResponse<SaveResult> saveGroups(@RequestBody SaveRequest<MapRow> body) {
        return ApiResponse.ok(service.saveGroups(body.rows()));
    }

    @PostMapping("/save")
    public ApiResponse<SaveResult> saveCodes(@RequestBody SaveRequest<MapRow> body) {
        return ApiResponse.ok(service.saveCodes(body.rows()));
    }
}
