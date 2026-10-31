import { describe, expect, it } from 'vitest';
import { closeTabs, emptyTabs, openTab, reloadTab } from '../src/layout/tabState';

describe('탭 상태', () => {
  it('이미 열린 탭은 이동만, 최대 개수를 넘으면 고정 탭을 뺀 가장 오래된 탭을 닫는다', () => {
    let s = openTab(emptyTabs, 'home', 3, 'home');
    s = openTab(s, 'a', 3, 'home');
    s = openTab(s, 'b', 3, 'home');
    s = openTab(s, 'a', 3, 'home');
    expect(s).toMatchObject({ keys: ['home', 'a', 'b'], active: 'a' });
    s = openTab(s, 'c', 3, 'home');
    expect(s).toMatchObject({ keys: ['home', 'b', 'c'], active: 'c' });
  });

  it('활성 탭을 닫으면 오른쪽, 없으면 왼쪽 탭으로. 고정 탭은 닫히지 않는다', () => {
    const s = { ...emptyTabs, keys: ['home', 'a', 'b'], active: 'a' };
    expect(closeTabs(s, ['a'], 'home')).toMatchObject({ keys: ['home', 'b'], active: 'b' });
    expect(closeTabs({ ...s, active: 'b' }, ['b'], 'home')).toMatchObject({ keys: ['home', 'a'], active: 'a' });
    expect(closeTabs(s, ['home', 'a', 'b'], 'home')).toMatchObject({ keys: ['home'], active: 'home' });
  });

  it('새로고침은 버전을 올린다', () => {
    expect(reloadTab(reloadTab(emptyTabs, 'a'), 'a').versions.a).toBe(2);
  });
});
