import type { Http } from './http';
import type { CodeGroup, CodeItem } from './types';

export type CodeMap = Record<string, CodeItem[]>;

export interface CodeStore {
  /** 그룹코드들을 조회해서 `{ USE_YN: [...] }` 형태로 돌려준다. 한 번 받은 그룹은 캐시 */
  load(groupCds: string[]): Promise<CodeMap>;
  /** 캐시에 있는 그룹 하나. 없으면 빈 배열 */
  get(groupCd: string): CodeItem[];
  /** 코드값 → 코드명. 없으면 코드값 그대로 */
  name(groupCd: string, code: string | null | undefined): string;
  clear(groupCd?: string): void;
}

/** 공통코드 캐시. docs/api-convention.md 6장 */
export function createCodeStore(http: Http, url = '/common/codes'): CodeStore {
  const cache = new Map<string, CodeItem[]>();
  const pending = new Map<string, Promise<void>>();

  async function fetchGroups(groupCds: string[]): Promise<void> {
    const groups = await http.get<CodeGroup[]>(url, { groupCd: groupCds.join(',') });
    for (const g of groups) cache.set(g.groupCd, g.codes);
    for (const cd of groupCds) if (!cache.has(cd)) cache.set(cd, []);
  }

  return {
    async load(groupCds) {
      const missing = groupCds.filter((cd) => !cache.has(cd) && !pending.has(cd));
      if (missing.length > 0) {
        const p = fetchGroups(missing).finally(() => missing.forEach((cd) => pending.delete(cd)));
        missing.forEach((cd) => pending.set(cd, p));
      }
      await Promise.all(groupCds.map((cd) => pending.get(cd)).filter(Boolean));
      return Object.fromEntries(groupCds.map((cd) => [cd, cache.get(cd) ?? []]));
    },
    get: (groupCd) => cache.get(groupCd) ?? [],
    name(groupCd, code) {
      if (code == null) return '';
      return cache.get(groupCd)?.find((c) => c.code === code)?.codeNm ?? code;
    },
    clear(groupCd) {
      if (groupCd) cache.delete(groupCd);
      else cache.clear();
    },
  };
}
