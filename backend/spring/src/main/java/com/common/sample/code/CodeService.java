package com.common.sample.code;

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

/** 샘플: DTO 없이 Map(MapRow)으로 받는 방식. 컬럼이 많고 단순한 관리 화면에 빠르다 */
@Service
public class CodeService {

    private final CodeMapper mapper;
    private final RowSaver rowSaver;

    public CodeService(CodeMapper mapper, RowSaver rowSaver) {
        this.mapper = mapper;
        this.rowSaver = rowSaver;
    }

    public List<CamelMap> groups() {
        return mapper.groups();
    }

    public List<CamelMap> codes(String groupCd) {
        return mapper.codes(groupCd);
    }

    @Transactional
    public SaveResult saveGroups(List<MapRow> rows) {
        require(rows, new String[][] {{"groupCd", "그룹코드"}, {"groupNm", "그룹명"}});
        String login = CurrentUser.id();
        return rowSaver.save(rows,
                r -> mapper.insertGroup(r, login),
                r -> mapper.updateGroup(r, login),
                r -> {
                    if (mapper.countCodes(r.getString("groupCd")) > 0) {
                        throw new BizException(ResultCode.CONFLICT, "하위 코드가 있어 삭제할 수 없습니다: " + r.getString("groupCd"));
                    }
                    mapper.deleteGroup(r);
                });
    }

    @Transactional
    public SaveResult saveCodes(List<MapRow> rows) {
        require(rows, new String[][] {{"groupCd", "그룹코드"}, {"code", "코드"}, {"codeNm", "코드명"}});
        String login = CurrentUser.id();
        return rowSaver.save(rows, r -> mapper.insertCode(r, login), r -> mapper.updateCode(r, login), mapper::deleteCode);
    }

    /** 필수값 검사 (삭제 행은 키만 확인). 실패하면 'N행 OO은(는) 필수입니다.' */
    private static void require(List<MapRow> rows, String[][] fields) {
        List<FieldError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            MapRow r = rows.get(i);
            String[][] check = "D".equals(r.rowStatus()) ? new String[][] {fields[0]} : fields;
            for (String[] f : check) {
                String v = r.getString(f[0]);
                if (v == null || v.isEmpty()) errors.add(new FieldError(f[0], (i + 1) + "행 " + f[1] + "은(는) 필수입니다."));
            }
        }
        if (!errors.isEmpty()) throw BizException.fields(errors);
    }
}
