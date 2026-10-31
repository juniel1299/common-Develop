'use client';

import dynamic from 'next/dynamic';

// 업무 화면(탭, 그리드)은 브라우저에서만 그린다. 로그인처럼 SEO·초기 표시가 필요한 화면은 일반 page 로 만든다
const Shell = dynamic(() => import('@/Shell').then((m) => m.Shell), { ssr: false });

export default function Page() {
  return <Shell />;
}
