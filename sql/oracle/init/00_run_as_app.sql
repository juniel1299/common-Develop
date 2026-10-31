-- docker-compose 용: 컨테이너 첫 실행 때 SYS 로 실행되므로 APP 스키마에 만들도록 전환한다
ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = APP;
@/sql/01_schema.sql
@/sql/02_data.sql
