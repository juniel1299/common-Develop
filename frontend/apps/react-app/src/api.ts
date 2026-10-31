import { createHttp } from '@common/core';
import { createMockAdapter } from '@common/pages';

export const http = createHttp({
  baseURL: '/api',
  getToken: () => localStorage.getItem('token'),
  onUnauthorized: () => {
    // 로그인 화면이 생기면 이동: window.location.href = '/login';
  },
});

if (import.meta.env.VITE_USE_MOCK === 'true') http.client.defaults.adapter = createMockAdapter();
