import { AppstoreOutlined, DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import type { MenuItem, PageRegistry } from '@common/ui';
import { CodePage } from './pages/CodePage';
import { DashboardPage } from './pages/DashboardPage';
import { LayoutPage } from './pages/LayoutPage';
import { UserPage } from './pages/UserPage';

/** 샘플 메뉴. 실제 프로젝트에서는 서버(메뉴 테이블)에서 받아와도 된다 */
export const sampleMenus: MenuItem[] = [
  { key: 'dashboard', label: '대시보드', icon: <DashboardOutlined /> },
  { key: 'layout', label: '좌석 배치도', icon: <AppstoreOutlined /> },
  {
    key: 'system',
    label: '시스템 관리',
    icon: <SettingOutlined />,
    children: [
      { key: 'user', label: '사용자 관리' },
      { key: 'code', label: '공통코드 관리' },
    ],
  },
];

export const samplePages: PageRegistry = {
  dashboard: DashboardPage,
  user: UserPage,
  code: CodePage,
  layout: LayoutPage,
};
