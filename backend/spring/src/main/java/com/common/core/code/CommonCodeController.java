package com.common.core.code;

import com.common.core.mybatis.CamelMap;
import com.common.core.response.ApiResponse;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 공통코드 조회. GET /api/common/codes?groupCd=USE_YN,DEPT → [{ groupCd, codes: [{ code, codeNm }] }] */
@RestController
public class CommonCodeController {

    private final CommonCodeMapper mapper;

    public CommonCodeController(CommonCodeMapper mapper) {
        this.mapper = mapper;
    }

    public record CodeItem(String code, String codeNm) {
    }

    public record CodeGroup(String groupCd, List<CodeItem> codes) {
    }

    @GetMapping("/api/common/codes")
    public ApiResponse<List<CodeGroup>> codes(@RequestParam(defaultValue = "") String groupCd) {
        List<String> groupCds = Arrays.stream(groupCd.split(",")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
        if (groupCds.isEmpty()) return ApiResponse.ok(List.of());

        Map<String, List<CodeItem>> byGroup = new LinkedHashMap<>();
        groupCds.forEach(g -> byGroup.put(g, new java.util.ArrayList<>()));
        for (CamelMap row : mapper.findCodes(groupCds)) {
            byGroup.get(row.getString("groupCd")).add(new CodeItem(row.getString("code"), row.getString("codeNm")));
        }
        return ApiResponse.ok(byGroup.entrySet().stream().map(e -> new CodeGroup(e.getKey(), e.getValue())).toList());
    }
}
