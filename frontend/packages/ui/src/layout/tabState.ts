export interface TabState {
  keys: string[];
  active: string | null;
  /** 새로고침용. 값이 바뀌면 그 화면을 다시 마운트 */
  versions: Record<string, number>;
}

export const emptyTabs: TabState = { keys: [], active: null, versions: {} };

/** 탭 열기. 최대 개수를 넘으면 고정 탭을 뺀 가장 오래된 탭을 닫는다 */
export function openTab(s: TabState, key: string, maxTabs: number, pinned?: string): TabState {
  if (s.keys.includes(key)) return { ...s, active: key };
  let keys = [...s.keys, key];
  while (keys.length > maxTabs) {
    const victim = keys.find((k) => k !== pinned && k !== key);
    if (!victim) break;
    keys = keys.filter((k) => k !== victim);
  }
  return { ...s, keys, active: key };
}

/** 탭 닫기. 활성 탭을 닫으면 오른쪽(없으면 왼쪽) 탭으로 이동 */
export function closeTabs(s: TabState, close: string[], pinned?: string): TabState {
  const removing = close.filter((k) => k !== pinned);
  const keys = s.keys.filter((k) => !removing.includes(k));
  let active = s.active;
  if (active && removing.includes(active)) {
    const idx = s.keys.indexOf(active);
    active = s.keys.slice(idx + 1).find((k) => keys.includes(k)) ?? [...s.keys.slice(0, idx)].reverse().find((k) => keys.includes(k)) ?? null;
  }
  return { ...s, keys, active };
}

export function reloadTab(s: TabState, key: string): TabState {
  return { ...s, versions: { ...s.versions, [key]: (s.versions[key] ?? 0) + 1 } };
}
