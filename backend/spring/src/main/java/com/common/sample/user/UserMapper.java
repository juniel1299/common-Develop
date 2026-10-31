package com.common.sample.user;

import com.common.core.mybatis.CamelMap;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    long count(Map<String, Object> params);

    List<CamelMap> list(Map<String, Object> params);

    CamelMap find(@Param("userId") String userId);

    int insert(@Param("u") UserDto user, @Param("loginId") String loginId);

    int update(@Param("u") UserDto user, @Param("loginId") String loginId);

    int delete(@Param("userId") String userId);
}
