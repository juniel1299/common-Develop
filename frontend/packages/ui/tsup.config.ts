import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: [/^react/, /^antd/, /^@ant-design/, /^ag-grid/, /^@ag-grid-community/, /^echarts/, /^dayjs/, '@common/core'],
  // Next.js App Router 에서 바로 import 할 수 있도록 클라이언트 컴포넌트로 표시
  banner: { js: '"use client";' },
});
