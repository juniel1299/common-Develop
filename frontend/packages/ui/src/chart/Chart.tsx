import * as echarts from 'echarts';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

/** 기본 색. 차분한 톤으로, 시리즈 순서대로 쓴다 */
export const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#64748b'];

export interface ChartProps {
  /** ECharts option 그대로 */
  option: echarts.EChartsCoreOption;
  /** 기본 300 */
  height?: number | string;
  style?: CSSProperties;
  loading?: boolean;
  /** true 면 이전 option 과 합치지 않고 교체 (시리즈 수가 바뀔 때) */
  notMerge?: boolean;
  /** 클릭 등 이벤트. 예: `{ click: (p) => ... }` */
  onEvents?: Record<string, (params: unknown) => void>;
}

/** ECharts (Apache-2.0) 래퍼. 크기 자동 조절, 언마운트 시 정리 */
export function Chart({ option, height = 300, style, loading, notMerge, onEvents }: ChartProps) {
  const el = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);

  // 숨은 탭(display: none)에서는 크기가 0 이므로, 처음 크기가 생길 때 만든다
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let c: echarts.ECharts | null = null;
    const ro = new ResizeObserver(() => {
      if (node.clientWidth === 0 || node.clientHeight === 0) return;
      if (!c) {
        c = echarts.init(node, undefined, { renderer: 'canvas' });
        setChart(c);
      } else c.resize();
    });
    ro.observe(node);
    return () => {
      ro.disconnect();
      c?.dispose();
      setChart(null);
    };
  }, []);

  useEffect(() => {
    chart?.setOption({ color: chartColors, ...option }, { notMerge });
  }, [chart, option, notMerge]);

  useEffect(() => {
    if (!chart || !onEvents) return;
    for (const [name, fn] of Object.entries(onEvents)) chart.on(name, fn);
    return () => {
      for (const [name, fn] of Object.entries(onEvents)) chart.off(name, fn);
    };
  }, [chart, onEvents]);

  useEffect(() => {
    if (loading) chart?.showLoading({ text: '' });
    else chart?.hideLoading();
  }, [chart, loading]);

  return <div ref={el} style={{ width: '100%', height, ...style }} />;
}
