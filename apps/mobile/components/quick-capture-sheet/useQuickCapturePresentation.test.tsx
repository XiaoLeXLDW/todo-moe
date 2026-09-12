import React from 'react';
import { Animated, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useQuickCapturePresentation } from './useQuickCapturePresentation';

const listeners = new Set<(state: AppStateStatus) => void>();
const runs: { toValue: number; finish?: (result: { finished: boolean }) => void; stop: ReturnType<typeof vi.fn> }[] = [];
let current: ReturnType<typeof useQuickCapturePresentation>;
let tree: ReactTestRenderer;
function Harness({ visible, reduced = false, hidden }: { visible: boolean; reduced?: boolean; hidden: () => void }) {
  current = useQuickCapturePresentation(visible, reduced, hidden);
  return null;
}
beforeEach(() => {
  runs.length = 0; AppState.currentState = 'active';
  vi.spyOn(AppState, 'addEventListener').mockImplementation(((_, callback) => {
    listeners.add(callback); return { remove: () => listeners.delete(callback) };
  }) as typeof AppState.addEventListener);
  vi.spyOn(Animated, 'timing').mockImplementation(((_value, options) => {
    const run = { toValue: options.toValue as number, finish: undefined as ((result: { finished: boolean }) => void) | undefined, stop: vi.fn() };
    runs.push(run);
    return { start: (finish: typeof run.finish) => { run.finish = finish; }, stop: run.stop, reset: vi.fn() };
  }) as typeof Animated.timing);
});
afterEach(() => { act(() => tree?.unmount()); expect(listeners.size).toBe(0); vi.restoreAllMocks(); });

it('retains the same modal until visual exit finishes and only then clears its draft', () => {
  const hidden = vi.fn();
  act(() => { tree = create(<Harness visible hidden={hidden} />); });
  expect(current.presented).toBe(true); expect(current.samplingEnabled).toBe(true);
  act(() => tree.update(<Harness visible={false} hidden={hidden} />));
  expect(current.presented).toBe(true); expect(current.samplingEnabled).toBe(false); expect(hidden).not.toHaveBeenCalled();
  act(() => runs.at(-1)?.finish?.({ finished: true }));
  expect(current.presented).toBe(false); expect(hidden).toHaveBeenCalledOnce();
});

it('a stopped old exit cannot hide or clear a rapidly reopened draft', () => {
  const hidden = vi.fn();
  act(() => { tree = create(<Harness visible hidden={hidden} />); });
  act(() => tree.update(<Harness visible={false} hidden={hidden} />));
  const oldExit = runs.at(-1)!;
  act(() => tree.update(<Harness visible hidden={hidden} />));
  act(() => oldExit.finish?.({ finished: true }));
  expect(oldExit.stop).toHaveBeenCalled(); expect(current.presented).toBe(true); expect(hidden).not.toHaveBeenCalled();
});

it('reduced motion and background settle presentation without pending cleanup callbacks', () => {
  const hidden = vi.fn();
  act(() => { tree = create(<Harness visible reduced hidden={hidden} />); });
  expect(runs).toHaveLength(0);
  act(() => tree.update(<Harness visible={false} reduced hidden={hidden} />));
  expect(current.presented).toBe(false); expect(hidden).toHaveBeenCalledOnce();
  act(() => tree.update(<Harness visible hidden={hidden} />));
  act(() => listeners.forEach((listener) => listener('background')));
  expect(current.samplingEnabled).toBe(false);
  act(() => tree.update(<Harness visible={false} hidden={hidden} />));
  expect(current.presented).toBe(false); expect(hidden).toHaveBeenCalledTimes(2);
});
