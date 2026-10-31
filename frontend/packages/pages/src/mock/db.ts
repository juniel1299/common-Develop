import type { CodeItem } from '@common/core';

export interface MockUser {
  userId: string;
  userNm: string;
  deptCd: string;
  email: string | null;
  joinDt: string | null;
  salary: number | null;
  useYn: 'Y' | 'N';
  remark: string | null;
  regDt: string;
}

export interface MockCodeGroup {
  groupCd: string;
  groupNm: string;
  useYn: 'Y' | 'N';
}

export interface MockCode extends CodeItem {
  groupCd: string;
  sortOrd: number;
  useYn: 'Y' | 'N';
}

/** 배치도(도면) */
export interface MockLayoutMap {
  mapId: string;
  mapNm: string;
  width: number;
  height: number;
  bgUrl: string | null;
  useYn: 'Y' | 'N';
}

/** 배치도 항목. 좌석이면 userId 로 사용자를 배정한다 (조회 때 userNm 을 붙여 준다) */
export interface MockLayoutItem {
  mapId: string;
  itemId: string;
  itemNm: string | null;
  itemType: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotate: number;
  shape: 'rect' | 'circle';
  userId: string | null;
}

/** 샘플 도면 2개. sql 폴더 02_data.sql 의 배치도 데이터와 같다 */
export function sampleLayout(): { maps: MockLayoutMap[]; items: MockLayoutItem[] } {
  const maps: MockLayoutMap[] = [
    { mapId: 'F3', mapNm: '본사 3층', width: 800, height: 500, bgUrl: null, useYn: 'Y' },
    { mapId: 'F4', mapNm: '본사 4층', width: 600, height: 400, bgUrl: null, useYn: 'Y' },
  ];
  const it = (mapId: string, itemId: string, itemNm: string, itemType: string, posX: number, posY: number, width: number, height: number, extra: Partial<MockLayoutItem> = {}): MockLayoutItem => ({
    mapId, itemId, itemNm, itemType, posX, posY, width, height, rotate: 0, shape: 'rect', userId: null, ...extra,
  });
  const items: MockLayoutItem[] = [
    it('F3', 'R001', '회의실 A', 'ROOM', 20, 20, 180, 120),
    it('F3', 'R002', '회의실 B', 'ROOM', 220, 20, 140, 120),
    it('F3', 'E001', '탕비실', 'ETC', 20, 360, 140, 120),
    it('F3', 'E002', '출입구', 'ETC', 660, 460, 100, 30),
  ];
  // 3층 좌석 16개: 2개 블록 × 2줄 × 4자리, 앞 12자리는 user001~user012 배정
  for (let n = 0; n < 16; n++) {
    const b = Math.floor(n / 8), r = Math.floor((n % 8) / 4), c = n % 4;
    const no = String(n + 1).padStart(3, '0');
    items.push(it('F3', `S${no}`, `${n + 1}번`, 'SEAT', 400 + c * 70, 40 + b * 200 + r * 50, 60, 40, { userId: n < 12 ? `user${no}` : null }));
  }
  items.push(it('F4', 'R001', '대회의실', 'ROOM', 20, 20, 260, 160), it('F4', 'E001', '라운지', 'ETC', 400, 40, 120, 120, { shape: 'circle' }));
  for (let n = 0; n < 8; n++) {
    items.push(it('F4', `S${String(n + 1).padStart(3, '0')}`, `${n + 1}번`, 'SEAT', 40 + (n % 4) * 70, 240 + Math.floor(n / 4) * 50, 60, 40));
  }
  return { maps, items };
}

const NAMES = ['김민수', '이영희', '박철수', '최지은', '정우성', '한지민', '오세훈', '윤아름', '강하늘', '조수빈', '임재현', '신예린'];

export function createDb() {
  const groups: MockCodeGroup[] = [
    { groupCd: 'USE_YN', groupNm: '사용여부', useYn: 'Y' },
    { groupCd: 'DEPT', groupNm: '부서', useYn: 'Y' },
    { groupCd: 'ROLE', groupNm: '권한', useYn: 'Y' },
    { groupCd: 'LAYOUT_TYPE', groupNm: '배치 항목 종류', useYn: 'Y' },
  ];
  const codes: MockCode[] = [
    { groupCd: 'USE_YN', code: 'Y', codeNm: '사용', sortOrd: 1, useYn: 'Y' },
    { groupCd: 'USE_YN', code: 'N', codeNm: '미사용', sortOrd: 2, useYn: 'Y' },
    { groupCd: 'DEPT', code: 'D01', codeNm: '개발팀', sortOrd: 1, useYn: 'Y' },
    { groupCd: 'DEPT', code: 'D02', codeNm: '영업팀', sortOrd: 2, useYn: 'Y' },
    { groupCd: 'DEPT', code: 'D03', codeNm: '인사팀', sortOrd: 3, useYn: 'Y' },
    { groupCd: 'DEPT', code: 'D04', codeNm: '재무팀', sortOrd: 4, useYn: 'Y' },
    { groupCd: 'ROLE', code: 'ADMIN', codeNm: '관리자', sortOrd: 1, useYn: 'Y' },
    { groupCd: 'ROLE', code: 'USER', codeNm: '사용자', sortOrd: 2, useYn: 'Y' },
    { groupCd: 'LAYOUT_TYPE', code: 'SEAT', codeNm: '좌석', sortOrd: 1, useYn: 'Y' },
    { groupCd: 'LAYOUT_TYPE', code: 'ROOM', codeNm: '회의실', sortOrd: 2, useYn: 'Y' },
    { groupCd: 'LAYOUT_TYPE', code: 'ETC', codeNm: '시설', sortOrd: 3, useYn: 'Y' },
  ];
  const users: MockUser[] = Array.from({ length: 57 }, (_, i) => ({
    userId: `user${String(i + 1).padStart(3, '0')}`,
    userNm: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? Math.floor(i / NAMES.length) : ''}`,
    deptCd: ['D01', 'D02', 'D03', 'D04'][i % 4]!,
    email: `user${i + 1}@example.com`,
    joinDt: `202${i % 6}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    salary: 3_000_000 + (i % 10) * 250_000,
    useYn: i % 7 === 0 ? 'N' : 'Y',
    remark: null,
    regDt: `2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T09:00:00`,
  }));
  const { maps, items } = sampleLayout();
  return { groups, codes, users, layoutMaps: maps, layoutItems: items };
}

export type MockDb = ReturnType<typeof createDb>;
