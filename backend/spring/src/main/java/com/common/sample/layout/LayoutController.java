package com.common.sample.layout;

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

/** 샘플: 좌석 배치도 API (도면 목록, 항목 조회, 항목 일괄 저장) */
@RestController
@RequestMapping("/api/layouts")
public class LayoutController {

    private final LayoutService service;

    public LayoutController(LayoutService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<CamelMap>> maps() {
        return ApiResponse.ok(service.maps());
    }

    @GetMapping("/items")
    public ApiResponse<List<CamelMap>> items(@RequestParam String mapId) {
        return ApiResponse.ok(service.items(mapId));
    }

    @PostMapping("/items/save")
    public ApiResponse<SaveResult> saveItems(@RequestBody SaveRequest<MapRow> body) {
        return ApiResponse.ok(service.saveItems(body.rows()));
    }
}
