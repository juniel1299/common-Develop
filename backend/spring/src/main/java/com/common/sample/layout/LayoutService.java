package com.common.sample.layout;

import com.common.core.CurrentUser;
import com.common.core.exception.BizException;
import com.common.core.exception.FieldError;
import com.common.core.mybatis.CamelMap;
import com.common.core.response.ResultCode;
import com.common.core.save.MapRow;
import com.common.core.save.RowSaver;
import com.common.core.save.SaveResult;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 샘플: 배치도 항목은 화면의 LayoutMap 이 그리드처럼 rowStatus 를 붙여 보내므로 RowSaver 를 그대로 쓴다 */
@Service
public class LayoutService {

    private final LayoutMapper mapper;
    private final RowSaver rowSaver;

    public LayoutService(LayoutMapper mapper, RowSaver rowSaver) {
        this.mapper = mapper;
        this.rowSaver = rowSaver;
    }

    public List<CamelMap> maps() {
        return mapper.maps();
    }

    public List<CamelMap> items(String mapId) {
        return mapper.items(mapId);
    }

    @Transactional
    public SaveResult saveItems(List<MapRow> rows) {
        validate(rows);
        String login = CurrentUser.id();
        return rowSaver.save(rows,
                r -> mapper.insertItem(r, login), // 같은 키면 DuplicateKeyException → CONFLICT
                r -> {
                    if (mapper.updateItem(r, login) == 0) {
                        throw new BizException(ResultCode.NOT_FOUND, "항목을 찾을 수 없습니다: " + r.getString("itemId"));
                    }
                },
                mapper::deleteItem);
    }

    /** 키는 모든 행, 종류·크기는 등록·수정 행만 검사 */
    private static void validate(List<MapRow> rows) {
        List<FieldError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            MapRow r = rows.get(i);
            String no = (i + 1) + "행 ";
            if (blank(r.getString("mapId"))) errors.add(new FieldError("mapId", no + "도면은(는) 필수입니다."));
            if (blank(r.getString("itemId"))) errors.add(new FieldError("itemId", no + "항목키은(는) 필수입니다."));
            if ("D".equals(r.rowStatus())) continue;
            if (blank(r.getString("itemType"))) errors.add(new FieldError("itemType", no + "종류은(는) 필수입니다."));
            for (String[] f : new String[][] {{"width", "가로"}, {"height", "세로"}}) {
                if (number(r.get(f[0])) < 1) errors.add(new FieldError(f[0], no + f[1] + "은(는) 1 이상입니다."));
            }
        }
        if (!errors.isEmpty()) throw BizException.fields(errors);
    }

    private static boolean blank(String v) {
        return v == null || v.isEmpty();
    }

    private static double number(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        try {
            return v == null ? 0 : Double.parseDouble(v.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
