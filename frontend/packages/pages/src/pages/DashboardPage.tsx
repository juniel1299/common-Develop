import type { PageResult } from '@common/core';
import { Chart, chartColors, useCodes, useHttp } from '@common/ui';
import { Card, Statistic } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { MockUser } from '../mock/db';

/** 샘플: 통계 카드 + 차트 */
export function DashboardPage() {
  const http = useHttp();
  const { codes } = useCodes(['DEPT']);
  const [users, setUsers] = useState<MockUser[]>([]);

  useEffect(() => {
    void http.getPage<MockUser>('/users', { size: 1000 }).then((r: PageResult<MockUser>) => setUsers(r.list));
  }, [http]);

  const depts = codes.DEPT ?? [];
  const byDept = useMemo(() => depts.map((d) => users.filter((u) => u.deptCd === d.code).length), [depts, users]);
  const active = users.filter((u) => u.useYn === 'Y').length;
  const avgSalary = users.length ? Math.round(users.reduce((s, u) => s + (u.salary ?? 0), 0) / users.length) : 0;
  const byYear = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users) if (u.joinDt) m.set(u.joinDt.slice(0, 4), (m.get(u.joinDt.slice(0, 4)) ?? 0) + 1);
    return [...m.entries()].sort();
  }, [users]);

  const stats = [
    { title: '전체 사용자', value: users.length, suffix: '명' },
    { title: '사용 중', value: active, suffix: '명' },
    { title: '부서', value: depts.length, suffix: '개' },
    { title: '평균 급여', value: avgSalary, suffix: '원' },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {stats.map((s) => (
          <Card key={s.title} size="small">
            <Statistic title={s.title} value={s.value} suffix={s.suffix} />
          </Card>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 12 }}>
        <Card size="small" title="부서별 인원">
          <Chart
            height={280}
            option={{
              tooltip: { trigger: 'axis' },
              grid: { left: 36, right: 12, top: 16, bottom: 28 },
              xAxis: { type: 'category', data: depts.map((d) => d.codeNm) },
              yAxis: { type: 'value', minInterval: 1 },
              series: [{ type: 'bar', data: byDept, barMaxWidth: 36 }],
            }}
          />
        </Card>
        <Card size="small" title="입사 연도별 인원">
          <Chart
            height={280}
            option={{
              tooltip: { trigger: 'axis' },
              grid: { left: 36, right: 12, top: 16, bottom: 28 },
              xAxis: { type: 'category', data: byYear.map(([y]) => y) },
              yAxis: { type: 'value', minInterval: 1 },
              series: [{ type: 'line', data: byYear.map(([, n]) => n), smooth: false, symbolSize: 6, lineStyle: { color: chartColors[1] }, itemStyle: { color: chartColors[1] } }],
            }}
          />
        </Card>
      </div>
    </>
  );
}
