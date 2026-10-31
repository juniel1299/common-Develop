import { MenuFoldOutlined, MenuUnfoldOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Dropdown, Empty, Layout, Menu, Result, Spin, Tabs, theme, Typography, type MenuProps } from 'antd';
import { Component, createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { closeTabs, emptyTabs, openTab, reloadTab, type TabState } from './tabState';
import type { AppNav, LayoutMode, MenuItem, PageRegistry } from './types';

const NavContext = createContext<AppNav | null>(null);

/** 화면 안에서 다른 화면 열기·닫기 */
export function useAppNav(): AppNav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useAppNav 는 AppLayout 안에서만 쓸 수 있습니다.');
  return nav;
}

export interface AppLayoutProps {
  /** 헤더 왼쪽 시스템 이름 */
  title: ReactNode;
  logo?: ReactNode;
  menus: MenuItem[];
  pages: PageRegistry;
  /** 'tabs': 메뉴마다 탭이 쌓임 (기본). 'single': 본문만 바뀜 */
  mode?: LayoutMode;
  /** 처음 열 화면. 탭 모드에서는 닫을 수 없는 고정 탭 */
  home?: string;
  /** 탭 최대 개수. 넘으면 오래된 탭부터 닫힘. 기본 10 */
  maxTabs?: number;
  /** 헤더 오른쪽 (사용자 이름, 로그아웃 등) */
  headerRight?: ReactNode;
  /** 새로고침해도 열린 탭 유지 (sessionStorage). 기본 true */
  persist?: boolean;
  /** 주소창에 ?menu=키 를 반영해서 링크로 화면을 바로 열 수 있게. 기본 true */
  syncUrl?: boolean;
  /** 좌측 메뉴 폭. 기본 220 */
  siderWidth?: number;
}

const STORAGE_KEY = 'common.layout.tabs';

function flatten(items: MenuItem[], out: Map<string, MenuItem> = new Map(), parents: string[] = [], parentMap: Map<string, string[]> = new Map()) {
  for (const m of items) {
    out.set(m.key, m);
    parentMap.set(m.key, parents);
    if (m.children) flatten(m.children, out, [...parents, m.key], parentMap);
  }
  return { byKey: out, parents: parentMap };
}

function toAntMenu(items: MenuItem[]): MenuProps['items'] {
  return items.map((m) => (m.children ? { key: m.key, label: m.label, icon: m.icon, children: toAntMenu(m.children) } : { key: m.key, label: m.label, icon: m.icon }));
}

function readUrlMenu(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('menu');
}

function readStored(): TabState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyTabs, ...(JSON.parse(raw) as Partial<TabState>), versions: {} } : null;
  } catch {
    return null;
  }
}

class PageBoundary extends Component<{ children: ReactNode; onReload: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Result
        status="error"
        title="화면을 표시하지 못했습니다."
        subTitle={this.state.error.message}
        extra={<Button onClick={this.props.onReload}>다시 열기</Button>}
      />
    );
  }
}

/**
 * 공통 레이아웃: 헤더 + 좌측 메뉴 + (탭) + 본문.
 * 라우터에 의존하지 않으므로 React(Vite)·Next 어디서나 같은 코드로 동작한다.
 */
export function AppLayout({
  title,
  logo,
  menus,
  pages,
  mode = 'tabs',
  home,
  maxTabs = 10,
  headerRight,
  persist = true,
  syncUrl = true,
  siderWidth = 220,
}: AppLayoutProps) {
  const { token } = theme.useToken();
  const { byKey, parents } = useMemo(() => flatten(menus), [menus]);
  const [collapsed, setCollapsed] = useState(false);
  const [state, setState] = useState<TabState>(emptyTabs);
  // 첫 화면을 정하기 전에는 저장하지 않는다 (StrictMode 에서 빈 탭이 저장되어 복원이 깨지는 것 방지)
  const [initialized, setInitialized] = useState(false);
  const pinned = mode === 'tabs' ? home : undefined;
  const limit = mode === 'tabs' ? maxTabs : 1;

  // 첫 화면: 주소창 → 저장된 탭 → home 순서
  useEffect(() => {
    const valid = (k: string | null | undefined): k is string => !!k && !!pages[k];
    let s: TabState = emptyTabs;
    const stored = persist && mode === 'tabs' ? readStored() : null;
    if (stored) s = { ...stored, keys: stored.keys.filter(valid), active: valid(stored.active) ? stored.active : null };
    if (valid(home)) s = { ...openTab(s, home, limit, pinned), active: s.active ?? home };
    const fromUrl = syncUrl ? readUrlMenu() : null;
    if (valid(fromUrl)) s = openTab(s, fromUrl, limit, pinned);
    if (mode === 'single' && s.active) s = { ...s, keys: [s.active] };
    setState(s);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (persist && mode === 'tabs') {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ keys: state.keys, active: state.active }));
      } catch {
        /* 저장 불가 환경은 무시 */
      }
    }
    if (syncUrl && state.active) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('menu') !== state.active) {
        url.searchParams.set('menu', state.active);
        window.history.replaceState(window.history.state, '', url);
      }
    }
  }, [initialized, state.keys, state.active, persist, syncUrl, mode]);

  const open = useCallback(
    (key: string) => {
      if (!pages[key]) {
        console.warn(`등록되지 않은 화면: ${key}`);
        return;
      }
      setState((s) => (mode === 'single' ? { ...s, keys: [key], active: key } : openTab(s, key, limit, pinned)));
    },
    [pages, mode, limit, pinned],
  );
  const close = useCallback((key: string) => setState((s) => closeTabs(s, [key], pinned)), [pinned]);
  const reload = useCallback((key?: string) => setState((s) => (key ?? s.active ? reloadTab(s, (key ?? s.active)!) : s)), []);
  const nav = useMemo<AppNav>(() => ({ activeKey: state.active, openKeys: state.keys, open, close, reload }), [state.active, state.keys, open, close, reload]);

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  useEffect(() => {
    if (state.active) setOpenGroups((g) => Array.from(new Set([...g, ...(parents.get(state.active!) ?? [])])));
  }, [state.active, parents]);

  const tabMenu = (key: string): MenuProps => ({
    items: [
      { key: 'reload', label: '새로고침', icon: <ReloadOutlined /> },
      { key: 'close', label: '닫기', disabled: key === pinned },
      { key: 'others', label: '다른 탭 닫기' },
      { key: 'all', label: '모두 닫기' },
    ],
    onClick: ({ key: action }) => {
      if (action === 'reload') reload(key);
      if (action === 'close') close(key);
      if (action === 'others') setState((s) => ({ ...closeTabs(s, s.keys.filter((k) => k !== key), pinned), active: key }));
      if (action === 'all') setState((s) => closeTabs(s, s.keys, pinned));
    },
  });

  const renderPage = (key: string) => {
    const Page = pages[key];
    if (!Page) return null;
    return (
      <PageBoundary key={`${key}:${state.versions[key] ?? 0}`} onReload={() => reload(key)}>
        <Suspense fallback={<Spin style={{ display: 'block', margin: '80px auto' }} />}>
          <Page />
        </Suspense>
      </PageBoundary>
    );
  };

  const headerH = 48;

  return (
    <NavContext.Provider value={nav}>
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Layout.Header
          style={{
            height: headerH,
            lineHeight: `${headerH}px`,
            padding: '0 16px 0 8px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Button type="text" aria-label="메뉴 접기" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed((v) => !v)} />
          {logo}
          <Typography.Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
            {title}
          </Typography.Text>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{headerRight}</div>
        </Layout.Header>
        <Layout>
          <Layout.Sider
            width={siderWidth}
            collapsedWidth={56}
            collapsed={collapsed}
            breakpoint="lg"
            onBreakpoint={(broken) => setCollapsed(broken)}
            trigger={null}
            style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}`, overflow: 'auto' }}
          >
            <Menu
              mode="inline"
              items={toAntMenu(menus)}
              selectedKeys={state.active ? [state.active] : []}
              openKeys={collapsed ? undefined : openGroups}
              onOpenChange={(keys) => setOpenGroups(keys as string[])}
              onClick={({ key }) => open(key)}
              style={{ borderInlineEnd: 'none', paddingTop: 4 }}
            />
          </Layout.Sider>
          <Layout.Content style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: token.colorBgLayout }}>
            {mode === 'tabs' && state.keys.length > 0 && (
              <Tabs
                type="editable-card"
                hideAdd
                size="small"
                activeKey={state.active ?? undefined}
                onChange={(k) => setState((s) => ({ ...s, active: k }))}
                onEdit={(k, action) => action === 'remove' && typeof k === 'string' && close(k)}
                items={state.keys.map((k) => ({
                  key: k,
                  closable: k !== pinned,
                  label: (
                    <Dropdown menu={tabMenu(k)} trigger={['contextMenu']}>
                      <span>{byKey.get(k)?.label ?? k}</span>
                    </Dropdown>
                  ),
                }))}
                tabBarStyle={{ margin: 0, padding: '6px 12px 0', background: token.colorBgContainer }}
              />
            )}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {state.keys.length === 0 && <Empty style={{ marginTop: 120 }} description="왼쪽 메뉴에서 화면을 선택하세요." />}
              {state.keys.map((k) => (
                <div key={k} style={{ display: k === state.active ? 'flex' : 'none', flexDirection: 'column', gap: 12, minHeight: '100%' }}>
                  {renderPage(k)}
                </div>
              ))}
            </div>
          </Layout.Content>
        </Layout>
      </Layout>
    </NavContext.Provider>
  );
}
