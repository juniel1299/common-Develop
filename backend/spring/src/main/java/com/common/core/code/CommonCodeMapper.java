package com.common.core.code;

import com.common.core.mybatis.CamelMap;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CommonCodeMapper {
    List<CamelMap> findCodes(@Param("groupCds") List<String> groupCds);
}
