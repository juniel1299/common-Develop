# SQL

| 폴더 | 내용 |
|---|---|
| `postgresql/` | `00_drop.sql`(다시 만들 때), `01_schema.sql`, `02_data.sql` |
| `oracle/` | 같은 구성. Oracle 12c 이상 (`OFFSET ... FETCH` 사용) |
| `oracle/init/` | docker compose 가 첫 실행 때 쓰는 스크립트 |

## 테이블

| 테이블 | 용도 |
|---|---|
| `TB_COMM_CODE_GROUP` | 공통코드 그룹 (`GROUP_CD`, `GROUP_NM`, `USE_YN`) |
| `TB_COMM_CODE` | 공통코드 (`GROUP_CD`, `CODE`, `CODE_NM`, `SORT_ORD`, `USE_YN`) |
| `TB_USER` | 샘플 업무 테이블. 프로젝트에서는 지우고 업무 테이블을 만든다 |
| `TB_LAYOUT_MAP` | 배치도 도면 (`MAP_ID`, `MAP_NM`, `WIDTH`, `HEIGHT`, `BG_URL` 배경 이미지) |
| `TB_LAYOUT_ITEM` | 배치도 항목 (`MAP_ID`+`ITEM_ID`, `ITEM_TYPE`, `POS_X`, `POS_Y`, `WIDTH`, `HEIGHT`, `ROTATE`, `SHAPE`, `USER_ID`). 좌석이 아니라 설비·진열대면 `USER_ID` 대신 업무 키 컬럼을 둔다 |

모든 테이블에 공통 컬럼 `REG_ID`, `REG_DT`, `MOD_ID`, `MOD_DT` 를 둡니다.
기본 데이터: 공통코드 `USE_YN`, `DEPT`, `ROLE`, `LAYOUT_TYPE` 과 샘플 사용자 57명, 배치도 도면 2개(좌석 24석).

이미 만든 DB 에 배치도만 추가하려면 `01_schema.sql` 과 `02_data.sql` 의 `배치도` 부분만 실행합니다.

## 직접 넣을 때

```bash
# PostgreSQL
psql -h localhost -U app -d appdb -f postgresql/01_schema.sql -f postgresql/02_data.sql
# Oracle
sqlplus app/app@localhost/FREEPDB1 @oracle/01_schema.sql
sqlplus app/app@localhost/FREEPDB1 @oracle/02_data.sql
```

PostgreSQL DB 는 `--locale=C.UTF-8` (또는 `LC_COLLATE 'C'`) 로 만드는 것을 권장합니다. 정렬이 Oracle 기본(BINARY)과 같아져서 한글은 가나다순, 같은 화면이 두 DB 에서 같은 순서로 나옵니다.
