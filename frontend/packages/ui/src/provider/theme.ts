import type { ThemeConfig } from 'antd';

/** 기본 테마. 효과를 줄이고 가독성 위주로. 프로젝트마다 colorPrimary 정도만 바꿔 쓴다 */
export const commonTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    borderRadius: 4,
    fontSize: 13,
    controlHeight: 30,
    fontFamily:
      "Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif",
    motionDurationMid: '0.1s',
    motionDurationSlow: '0.15s',
    boxShadow: 'none',
    boxShadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Form: { itemMarginBottom: 12, labelColor: 'rgba(0, 0, 0, 0.75)' },
    Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
    Tabs: { horizontalMargin: '0' },
  },
};
