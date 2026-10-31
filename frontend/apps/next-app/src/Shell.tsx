'use client';

import { UserOutlined } from '@ant-design/icons';
import { sampleMenus, samplePages } from '@common/pages';
import { AppLayout, CommonProvider, type LayoutMode, type MenuItem, type PageRegistry } from '@common/ui';
import { Space, Typography } from 'antd';
import { http } from './api';

// 프로젝트 화면은 여기에 추가한다. 큰 화면은 lazy 로 처음 열 때 불러온다:
//   const OrderPage = lazy(() => import('./pages/OrderPage'));
//   menus: [..., { key: 'order', label: '주문 관리' }]   pages: { ..., order: OrderPage }
const menus: MenuItem[] = [...sampleMenus];
const pages: PageRegistry = { ...samplePages };

export function Shell() {
  return (
    <CommonProvider http={http}>
      <AppLayout
        title="업무 시스템"
        menus={menus}
        pages={pages}
        home="dashboard"
        mode={(process.env.NEXT_PUBLIC_LAYOUT_MODE as LayoutMode | undefined) ?? 'tabs'}
        headerRight={
          <Space size={6}>
            <UserOutlined />
            <Typography.Text>관리자</Typography.Text>
          </Space>
        }
      />
    </CommonProvider>
  );
}
