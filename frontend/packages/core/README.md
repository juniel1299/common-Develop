# @common/core

React·Next 공용 기반 모듈. 화면 컴포넌트는 없고, 모든 컴포넌트가 쓰는 타입과 API 호출만 담는다.
규칙은 [docs/api-convention.md](../../../docs/api-convention.md) 를 따른다.

## 사용법

```ts
import { createHttp, createCodeStore, isApiError } from '@common/core';

export const http = createHttp({
  baseURL: '/api',
  getToken: () => localStorage.getItem('token'),
  onUnauthorized: () => (location.href = '/login'),
  onError: (e) => message.error(e.message), // antd message 등
});
export const codes = createCodeStore(http);

// 목록 (빈 조회조건은 자동으로 빠짐)
const page = await http.getPage<User>('/users', { page: 1, userNm: '', useYn: 'Y' });

// 그리드 일괄 저장 → POST /api/users/save
await http.saveRows('/users', [{ rowStatus: 'U', userId: 'a', userNm: '홍길동' }]);

// 입력값 오류를 폼에 표시
try {
  await http.post('/users', form, { silent: true });
} catch (e) {
  if (isApiError(e) && e.code === 'VALIDATION_ERROR') e.fieldErrors; // [{ field, message }]
}

// 공통코드
await codes.load(['USE_YN', 'GENDER']);
codes.name('USE_YN', 'Y'); // '사용'
```

## 들어있는 것

| 파일 | 내용 |
|---|---|
| `types.ts` | `ApiResponse`, `PageResult`, `SaveRow`, `CodeItem` 등 규약 타입 |
| `case.ts` | `toCamelKey`, `toSnakeKey`, `camelizeKeys`, `snakeKeys` (`CODE_NM ↔ codeNm`) |
| `http.ts` | axios 공통 호출. 응답 봉투 해제, 토큰, 에러 공통 처리 |
| `error.ts` | `ApiError` (code, status, fieldErrors) |
| `codes.ts` | 공통코드 조회·캐시 |

## 명령

```bash
npm install        # frontend/ 에서
npm test           # 테스트
npm run build      # dist/ 생성
```
