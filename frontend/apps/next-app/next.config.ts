import type { NextConfig } from 'next';

const backend = process.env.BACKEND_URL ?? 'http://localhost:8080';

const nextConfig: NextConfig = {
  // /api 요청을 백엔드로 넘긴다 (브라우저는 같은 주소만 보므로 CORS 설정이 필요 없음)
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
