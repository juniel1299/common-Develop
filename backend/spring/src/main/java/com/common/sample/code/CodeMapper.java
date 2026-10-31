package com.common.sample.code;

import com.common.core.mybatis.CamelMap;
import com.common.core.save.MapRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CodeMapper {
    List<CamelMap> groups();

    List<CamelMap> codes(@Param("groupCd") String groupCd);

    int countCodes(@Param("groupCd") String groupCd);

    int insertGroup(@Param("r") MapRow row, @Param("loginId") String loginId);

    int updateGroup(@Param("r") MapRow row, @Param("loginId") String loginId);

    int deleteGroup(@Param("r") MapRow row);

    int insertCode(@Param("r") MapRow row, @Param("loginId") String loginId);

    int updateCode(@Param("r") MapRow row, @Param("loginId") String loginId);

    int deleteCode(@Param("r") MapRow row);
}
