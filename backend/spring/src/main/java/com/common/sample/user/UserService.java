package com.common.sample.user;

import com.common.core.CurrentUser;
import com.common.core.exception.BizException;
import com.common.core.mybatis.CamelMap;
import com.common.core.paging.PageParam;
import com.common.core.response.PageResult;
import com.common.core.response.ResultCode;
import com.common.core.save.RowSaver;
import com.common.core.save.SaveResult;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    /** 정렬 허용 목록: 화면 필드 → 컬럼 */
    private static final Map<String, String> SORTS = Map.of(
            "userId", "USER_ID", "userNm", "USER_NM", "deptCd", "DEPT_CD",
            "joinDt", "JOIN_DT", "salary", "SALARY", "regDt", "REG_DT");

    private final UserMapper mapper;
    private final RowSaver rowSaver;

    public UserService(UserMapper mapper, RowSaver rowSaver) {
        this.mapper = mapper;
        this.rowSaver = rowSaver;
    }

    public PageResult<CamelMap> list(MultiValueMap<String, String> params) {
        PageParam p = PageParam.of(params, SORTS, "USER_ID ASC");
        Map<String, Object> m = p.toMap();
        long total = mapper.count(m);
        return PageResult.of(total == 0 ? List.of() : mapper.list(m), p.page(), p.size(), total);
    }

    public CamelMap find(String userId) {
        CamelMap u = mapper.find(userId);
        if (u == null) throw new BizException(ResultCode.NOT_FOUND, "사용자를 찾을 수 없습니다.");
        return u;
    }

    @Transactional
    public CamelMap create(UserDto u) {
        mapper.insert(u, CurrentUser.id()); // 중복이면 DuplicateKeyException → CONFLICT
        return find(u.userId());
    }

    @Transactional
    public CamelMap update(String userId, UserDto u) {
        if (mapper.update(u.withUserId(userId), CurrentUser.id()) == 0) throw new BizException(ResultCode.NOT_FOUND, "사용자를 찾을 수 없습니다.");
        return find(userId);
    }

    @Transactional
    public void delete(String userId) {
        if (mapper.delete(userId) == 0) throw new BizException(ResultCode.NOT_FOUND, "사용자를 찾을 수 없습니다.");
    }

    @Transactional
    public SaveResult save(List<UserDto> rows) {
        String login = CurrentUser.id();
        return rowSaver.save(rows,
                r -> mapper.insert(r, login),
                r -> {
                    if (mapper.update(r, login) == 0) throw new BizException(ResultCode.NOT_FOUND, "사용자를 찾을 수 없습니다: " + r.userId());
                },
                r -> mapper.delete(r.userId()));
    }
}
