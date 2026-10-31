import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // antd·AG Grid·ECharts 를 합치면 1MB 를 넘는 것이 정상이라 경고 기준만 올린다
    build: { chunkSizeWarningLimit: 3000 },
    server: {
      port: 5173,
      // 개발 중 /api 요청을 백엔드로 넘긴다 (CORS 설정 없이 개발)
      proxy: { '/api': { target: env.BACKEND_URL ?? 'http://localhost:8080', changeOrigin: true } },
    },
  };
});
