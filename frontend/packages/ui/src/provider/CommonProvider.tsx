import { createCodeStore, type CodeMap, type CodeStore, type Http } from '@common/core';
import { App, ConfigProvider, type ThemeConfig } from 'antd';
import koKR from 'antd/locale/ko_KR';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { commonTheme } from './theme';

dayjs.locale('ko');

interface CommonContextValue {
  http?: Http;
  codes?: CodeStore;
}

const CommonContext = createContext<CommonContextValue>({});

export interface CommonProviderProps {
  /** @common/core 의 createHttp() 결과 */
  http?: Http;
  /** 따로 만든 공통코드 저장소. 없으면 http 로 자동 생성 */
  codes?: CodeStore;
  /** commonTheme 위에 덮어쓸 테마 */
  theme?: ThemeConfig;
  children: ReactNode;
}

/** 앱 최상단에 한 번. antd 한국어·테마, 공통코드 저장소를 연결한다 */
export function CommonProvider({ http, codes, theme, children }: CommonProviderProps) {
  const value = useMemo(() => ({ http, codes: codes ?? (http ? createCodeStore(http) : undefined) }), [http, codes]);
  const mergedTheme = useMemo<ThemeConfig>(
    () => ({
      ...commonTheme,
      ...theme,
      token: { ...commonTheme.token, ...theme?.token },
      components: { ...commonTheme.components, ...theme?.components },
    }),
    [theme],
  );
  return (
    <ConfigProvider locale={koKR} theme={mergedTheme}>
      <App>
        <CommonContext.Provider value={value}>{children}</CommonContext.Provider>
      </App>
    </ConfigProvider>
  );
}

export function useCommon(): CommonContextValue {
  return useContext(CommonContext);
}

/** 공통코드 그룹들을 불러온다. 같은 그룹은 앱 전체에서 한 번만 조회 */
export function useCodes(groupCds: (string | undefined)[]): { codes: CodeMap; loading: boolean } {
  const { codes: store } = useCommon();
  const key = groupCds.filter(Boolean).join(',');
  const [state, setState] = useState<{ key: string; codes: CodeMap }>({ key: '', codes: {} });

  useEffect(() => {
    if (!store || !key) return;
    let alive = true;
    store
      .load(key.split(','))
      .then((codes) => alive && setState({ key, codes }))
      .catch(() => alive && setState({ key, codes: {} }));
    return () => {
      alive = false;
    };
  }, [store, key]);

  const loading = !!store && !!key && state.key !== key;
  return { codes: state.key === key ? state.codes : {}, loading };
}

/** CommonProvider 에 넘긴 http. 화면에서 API 를 부를 때 */
export function useHttp(): Http {
  const { http } = useCommon();
  if (!http) throw new Error('CommonProvider 에 http 를 넘겨주세요.');
  return http;
}
