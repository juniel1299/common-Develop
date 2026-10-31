package com.common.sample.layout;

import com.common.core.mybatis.CamelMap;
import com.common.core.save.MapRow;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LayoutMapper {
    List<CamelMap> maps();

    List<CamelMap> items(@Param("mapId") String mapId);

    int insertItem(@Param("r") MapRow row, @Param("loginId") String loginId);

    int updateItem(@Param("r") MapRow row, @Param("loginId") String loginId);

    int deleteItem(@Param("r") MapRow row);
}
