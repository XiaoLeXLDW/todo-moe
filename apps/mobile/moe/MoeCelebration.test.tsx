import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, AppState } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoeCelebration } from './MoeCelebration';
import { cancelMoeCompletion, publishListCompleted } from './completion';
import { setMoePreferences } from './preferences';
import { DEFAULT_MOE_PREFERENCES } from './preference-model';

const native = vi.hoisted(() => ({
  focused: true,
  reduced: false,
  appListeners: new Map<string, Set<(state?: string) => void>>(),
  motionListeners: new Set<(reduced: boolean) => void>(),
}));
vi.mock('@react-navigation/native', () => ({ useIsFocused: () => native.focused }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn().mockResolvedValue(undefined),
} }));
vi.mock('../contexts/language-context', () => ({ useLanguage: () => ({ language: 'zh' }) }));
vi.mock('../hooks/use-theme-colors', () => ({ useThemeColors: () => ({
  cardBg: '#fff', success: '#287', text: '#222', tint: '#867',
}) }));
vi.mock('react-native', async importOriginal => {
  const original = await importOriginal<typeof import('react-native')>();
  return { ...original,
    AppState: { currentState: 'active', addEventListener: (name: string, listener: (state?: string) => void) => {
      const listeners = native.appListeners.get(name) ?? new Set();
      native.appListeners.set(name, listeners);
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    } },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => native.reduced,
      addEventListener: (_: string, listener: (reduced: boolean) => void) => {
        native.motionListeners.add(listener);
        return { remove: () => native.motionListeners.delete(listener) };
      },
    },
  };
});

type AnimationRun = { finish?: (result: { finished: boolean }) => void; stop: () => void };
let tree: ReactTestRenderer | undefined;
let runs: AnimationRun[];
const mount = async () => { await act(async () => { tree = create(<MoeCelebration />); }); };
const complete = (operationId: number, title = '旅行准备') => act(() => {
  publishListCompleted({ operationId, projectId: `project-${operationId}`, title });
});
const visibleText = () => JSON.stringify(tree?.toJSON());
const renderedStyle = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));

beforeEach(async () => {
  native.focused = true;
  native.reduced = false;
  AppState.currentState = 'active';
  await setMoePreferences({ ...DEFAULT_MOE_PREFERENCES });
  vi.useFakeTimers();
  runs = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => {
    const run: AnimationRun = { stop: vi.fn() };
    runs.push(run);
    return { start: callback => { run.finish = callback; }, stop: run.stop, reset: vi.fn() };
  });
});
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  expect(vi.getTimerCount()).toBe(0);
  expect([...native.appListeners.values()].every(listeners => listeners.size === 0)).toBe(true);
  expect(native.motionListeners.size).toBe(0);
  native.appListeners.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Moe Moment completion feedback', () => {
  it.each(['system', 'simple'])('keeps only static text with %s reduced motion', async mode => {
    if (mode === 'system') native.reduced = true;
    else await setMoePreferences({ motion: 'simple' });
    await mount();
    complete(1);
    expect(visibleText()).toContain('✓ 清单已完成');
    expect(visibleText()).not.toContain('✦');
    expect(visibleText()).not.toContain('✧');
    const card = tree!.root.findAll(node => String(node.type) === 'Animated.View' && node.props.accessibilityLiveRegion === 'polite')[0];
    expect(renderedStyle(card.props.style).opacity).toBe(1);
    expect(renderedStyle(card.props.style).transform).toBeUndefined();
    expect(runs).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(tree?.toJSON()).toBeNull();
  });

  it('cancels visible motion when the system reduction preference changes without extending the message lifetime', async () => {
    await mount();
    complete(1);
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { native.motionListeners.forEach(listener => listener(true)); });
    expect(runs[0].stop).toHaveBeenCalled();
    expect(visibleText()).toContain('旅行准备');
    expect(visibleText()).not.toContain('✦');
    act(() => { vi.advanceTimersByTime(500); });
    expect(tree?.toJSON()).toBeNull();
  });

  it('discards navigation-blurred events instead of replaying them on return', async () => {
    await mount();
    complete(1);
    act(() => { native.focused = false; tree!.update(<MoeCelebration />); });
    expect(tree?.toJSON()).toBeNull();
    expect(runs[0].stop).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    complete(2);
    act(() => { native.focused = true; tree!.update(<MoeCelebration />); });
    expect(tree?.toJSON()).toBeNull();
  });

  it('clears synchronously on Undo and lets the next completion own its full lifetime', async () => {
    await mount();
    complete(1, '第一张清单');
    act(() => { vi.advanceTimersByTime(300); });
    act(() => {
      cancelMoeCompletion('completed-task');
      expect(runs[0].stop).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
    expect(tree?.toJSON()).toBeNull();
    complete(2, '第二张清单');
    act(() => { runs[0].finish?.({ finished: true }); vi.advanceTimersByTime(300); });
    expect(visibleText()).toContain('第二张清单');
    act(() => { vi.advanceTimersByTime(300); });
    expect(tree?.toJSON()).toBeNull();
  });

  it('replaces consecutive events and ignores their cancelled timers and animation callbacks', async () => {
    await mount();
    complete(1, '第一张清单');
    act(() => { vi.advanceTimersByTime(300); });
    complete(2, '第二张清单');
    expect(runs[0].stop).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    act(() => { runs[0].finish?.({ finished: true }); vi.advanceTimersByTime(300); });
    expect(visibleText()).not.toContain('第一张清单');
    expect(visibleText()).toContain('第二张清单');
    act(() => { vi.advanceTimersByTime(300); });
    expect(tree?.toJSON()).toBeNull();
    act(() => { tree!.unmount(); });
    tree = undefined;
    complete(3);
    expect(vi.getTimerCount()).toBe(0);
    expect(runs).toHaveLength(2);
  });

  it.each(['background', 'inactive', 'blur'])('immediately clears feedback on native %s and ignores events until active again', async state => {
    await mount();
    complete(1);
    act(() => {
      if (state !== 'blur') AppState.currentState = state as typeof AppState.currentState;
      native.appListeners.get(state === 'blur' ? 'blur' : 'change')?.forEach(listener => listener(state));
      expect(runs[0].stop).toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
    expect(tree?.toJSON()).toBeNull();
    complete(2);
    expect(tree?.toJSON()).toBeNull();
    act(() => {
      AppState.currentState = 'active';
      native.appListeners.get(state === 'blur' ? 'focus' : 'change')?.forEach(listener => listener('active'));
    });
    expect(tree?.toJSON()).toBeNull();
    complete(3, '恢复前台后的新清单');
    expect(visibleText()).toContain('恢复前台后的新清单');
  });

  it('fades its card in and out with three decorative particles moving away from the centre', async () => {
    await mount();
    complete(1);
    const cards = tree!.root.findAll(node => String(node.type) === 'Animated.View' && node.props.accessibilityLiveRegion === 'polite');
    expect(renderedStyle(cards[0].props.style).opacity.outputRange).toEqual([0, 1, 1, 0]);
    const particles = tree!.root.findAll(node => String(node.type) === 'Animated.View' && node.props.testID === 'moe-moment-particle');
    expect(particles).toHaveLength(3);
    expect(particles.map(particle => renderedStyle(particle.props.style).transform.map(
      (axis: Record<string, { outputRange: number[] }>) => Object.values(axis)[0].outputRange,
    ))).toEqual([[[0, -24], [0, -24]], [[0, 0], [0, 24]], [[0, 24], [0, -24]]]);
    expect(particles.every(particle => particle.props.accessibilityElementsHidden === true
      && particle.props.importantForAccessibility === 'no-hide-descendants')).toBe(true);
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 600, useNativeDriver: true }));
  });

  it('shows non-blocking feedback briefly and clears it after 600 ms', async () => {
    await mount();
    complete(1);
    expect(visibleText()).toContain('✓ 清单已完成');
    expect(tree?.toJSON()).toMatchObject({ props: { pointerEvents: 'none' } });
    act(() => { vi.advanceTimersByTime(599); });
    expect(visibleText()).toContain('旅行准备');
    act(() => { vi.advanceTimersByTime(1); });
    expect(tree?.toJSON()).toBeNull();
  });

  it('ignores completed-list events while celebration is off and only shows fresh events after re-enabling', async () => {
    await setMoePreferences({ celebration: false });
    await mount();
    complete(1);
    expect(tree?.toJSON()).toBeNull();
    expect(runs).toHaveLength(0);
    await act(async () => { await setMoePreferences({ celebration: true }); });
    expect(tree?.toJSON()).toBeNull();
    complete(2, '新的清单');
    expect(visibleText()).toContain('新的清单');
    await act(async () => { await setMoePreferences({ celebration: false }); });
    expect(tree?.toJSON()).toBeNull();
    expect(runs[0].stop).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
