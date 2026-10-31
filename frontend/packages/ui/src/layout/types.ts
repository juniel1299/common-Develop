import type { ComponentType, ReactNode } from 'react';

export interface MenuItem {
  /** 화면 키. pages 의 키와 같아야 한다. 하위 메뉴가 있는 그룹은 아무 고유값 */
  key: string;
  label: string;
  icon?: ReactNode;
  children?: MenuItem[];
}

/** 화면 키 → 컴포넌트. React.lazy(() => import(...)) 를 넣으면 처음 열 때 불러온다 */
export type PageRegistry = Record<string, ComponentType>;

export type LayoutMode = 'tabs' | 'single';

export interface AppNav {
  /** 현재 화면 키 */
  activeKey: string | null;
  /** 열린 탭 (single 모드에서는 현재 화면 하나) */
  openKeys: string[];
  /** 화면 열기. 탭 모드에서 이미 열려 있으면 그 탭으로 이동 */
  open(key: string): void;
  close(key: string): void;
  /** 화면을 처음 상태로 다시 그린다 */
  reload(key?: string): void;
}
