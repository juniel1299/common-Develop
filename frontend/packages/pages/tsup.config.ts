import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: [/^react/, /^antd/, /^@ant-design/, /^@common/, /^axios/],
  banner: { js: '"use client";' },
});
