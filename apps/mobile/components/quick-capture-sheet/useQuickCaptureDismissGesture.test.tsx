import React from 'react';
import { Animated, AppState, PanResponder, type AppStateStatus, type GestureResponderEvent, type PanResponderCallbacks, type PanResponderGestureState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useQuickCaptureDismissGesture } from './useQuickCaptureDismissGesture';

let callbacks: PanResponderCallbacks;
let tree: ReactTestRenderer;
let handle: ReturnType<typeof useQuickCaptureDismissGesture>;
const listeners = new Set<(state: AppStateStatus) => void>();
const event = {} as GestureResponderEvent;
const gesture = (dy: number, dx = 0, vy = 0): PanResponderGestureState => ({ stateID: 1, _accountsForMovesUpTo: 0, moveX: 0, moveY: 0, x0: 0, y0: 0, dx, dy, vx: 0, vy, numberActiveTouches: 1 });
function Harness({ enabled = true, reduced = false, presented = true, dismiss }: { enabled?: boolean; reduced?: boolean; presented?: boolean; dismiss: () => void }) {
  handle = useQuickCaptureDismissGesture({ enabled, reduced, presented, onDismiss: dismiss });
  return null;
}
beforeEach(() => {
  AppState.currentState = 'active';
  vi.spyOn(PanResponder, 'create').mockImplementation((configuration) => { callbacks = configuration; return { panHandlers: {} }; });
  vi.spyOn(AppState, 'addEventListener').mockImplementation(((_, callback) => {
    listeners.add(callback); return { remove: () => listeners.delete(callback) };
  }) as typeof AppState.addEventListener);
});
afterEach(() => { act(() => tree?.unmount()); expect(listeners.size).toBe(0); vi.restoreAllMocks(); });

it('claims the non-interactive header on DOWN and closes only over the downward threshold', () => {
  const dismiss = vi.fn();
  vi.spyOn(Animated, 'spring').mockReturnValue({ start: vi.fn(), stop: vi.fn(), reset: vi.fn() });
  act(() => { tree = create(<Harness dismiss={dismiss} />); });
  expect(callbacks.onStartShouldSetPanResponder?.(event, gesture(0))).toBe(true);
  expect(callbacks.onStartShouldSetPanResponderCapture?.(event, gesture(0))).toBe(true);
  act(() => callbacks.onPanResponderRelease?.(event, gesture(0)));
  expect(dismiss).not.toHaveBeenCalled();
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(4))).toBe(false);
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(8, 20))).toBe(false);
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(12, 2))).toBe(true);
  act(() => callbacks.onPanResponderRelease?.(event, gesture(80)));
  expect(dismiss).toHaveBeenCalledOnce();
});

it('cancelled or insufficient drags return without closing or waiting on business callbacks', () => {
  const dismiss = vi.fn(); const spring = vi.spyOn(Animated, 'spring');
  act(() => { tree = create(<Harness dismiss={dismiss} />); });
  act(() => callbacks.onPanResponderRelease?.(event, gesture(40)));
  act(() => callbacks.onPanResponderTerminate?.(event, gesture(120)));
  act(() => callbacks.onPanResponderRelease?.(event, gesture(100, 200)));
  expect(spring).toHaveBeenCalledTimes(3); expect(dismiss).not.toHaveBeenCalled();
});

it('disabled, hidden and background states cannot dismiss; reduced motion settles without springs', () => {
  const dismiss = vi.fn(); const spring = vi.spyOn(Animated, 'spring');
  act(() => { tree = create(<Harness enabled={false} reduced dismiss={dismiss} />); });
  expect(callbacks.onStartShouldSetPanResponder?.(event, gesture(0))).toBe(false);
  expect(callbacks.onStartShouldSetPanResponderCapture?.(event, gesture(0))).toBe(false);
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(100))).toBe(false);
  act(() => callbacks.onPanResponderRelease?.(event, gesture(100)));
  expect(dismiss).not.toHaveBeenCalled(); expect(spring).not.toHaveBeenCalled();
  act(() => tree.update(<Harness reduced dismiss={dismiss} />));
  act(() => callbacks.onPanResponderMove?.(event, gesture(50)));
  const setValue = vi.spyOn(handle.offset, 'setValue');
  act(() => listeners.forEach((listener) => listener('background')));
  expect(setValue).toHaveBeenLastCalledWith(0);
  expect(callbacks.onStartShouldSetPanResponderCapture?.(event, gesture(0))).toBe(false);
  act(() => callbacks.onPanResponderRelease?.(event, gesture(100)));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => tree.update(<Harness enabled={false} presented={false} reduced dismiss={dismiss} />));
  expect(setValue).toHaveBeenLastCalledWith(0);
});
