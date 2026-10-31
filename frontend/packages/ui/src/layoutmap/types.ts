import type { RowStatus, SaveRow } from '@common/core';
import type { ReactNode } from 'react';

/**
 * 배치도에 놓이는 항목 하나. 좌표와 크기는 도면 기준 단위(도면 width·height 와 같은 단위).
 * 이 키 이름은 API 규약과 DB 컬럼(POS_X, POS_Y, WIDTH, HEIGHT, ROTATE)에 맞춰져 있다.
 */
export interface LayoutItem {
  /** 도면 안에서 유일한 키 */
  itemId: string;
  itemNm?: string | null;
  /** 항목 종류 (공통코드 등). 색·모양을 정할 때 쓴다 */
  itemType?: string | null;
  posX: number;
  posY: number;
  width: number;
  height: number;
  /** 회전 각도. 0, 90, 180, 270 */
  rotate?: number | null;
  /** 기본 rect */
  shape?: 'rect' | 'circle' | null;
}

/** 도면 정보 */
export interface LayoutMapInfo {
  width: number;
  height: number;
  /** 배경 도면 이미지 (평면도 스캔, CAD 내보내기 등). 없으면 빈 도면 */
  bgUrl?: string | null;
}

export interface LayoutItemStyle {
  fill?: string;
  stroke?: string;
  textColor?: string;
  /** 점선 테두리 등 */
  dashed?: boolean;
}

export interface LayoutLegend {
  label: ReactNode;
  color: string;
}

export type LayoutRow<T> = T & { __rowId: string; rowStatus?: RowStatus; __prevStatus?: RowStatus };

/** 배치도 API. useLayoutMap() 으로 만들고 <LayoutMap layout={layout}> 에 연결 */
export interface LayoutMapHandle<T extends LayoutItem = LayoutItem> {
  /** 항목을 넣는다. 상태(추가·수정·삭제)와 선택은 모두 초기화 */
  setItems(items: T[]): void;
  /** 삭제 표시된 항목을 뺀 현재 항목들 */
  getItems(): T[];
  getSelected(): T[];
  /** 항목을 선택한다. 빈 배열이면 선택 해제 */
  select(itemIds: string[]): void;
  /**
   * 새 항목(I)을 추가하고 선택한다. 위치를 안 주면 지금 보이는 화면 가운데에 놓는다.
   * itemId 는 직접 정하거나 layout.nextId('S') 로 만든다.
   */
  addItem(item: Partial<T> & { itemId: string }): void;
  /** 항목 값을 바꾼다 (이름, 종류, 크기 등). 기존 항목이면 U 표시 */
  updateItem(itemId: string, patch: Partial<T>): void;
  /** 선택 항목 삭제. 신규는 바로 빠지고, 기존은 D 표시 (다시 누르면 취소) */
  deleteSelected(): number;
  /** 선택 항목을 90도 돌린다 */
  rotateSelected(): void;
  /** 'S' → 'S001', 'S002' ... 지금 있는 항목과 겹치지 않는 다음 키 */
  nextId(prefix: string, digits?: number): string;
  /** 저장할 행들. D → U → I 순서. http.saveRows() 에 그대로 넘긴다 */
  getChanges(): SaveRow<T>[];
  hasChanges(): boolean;
  /** 저장 성공 후: D 항목을 지우고 상태 표시를 없앤다 (다시 조회하지 않을 때) */
  commit(): void;
  /** 도면 전체가 보이게 맞춘다 */
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
}
