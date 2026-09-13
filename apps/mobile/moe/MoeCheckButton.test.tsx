import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Animated } from 'react-native';
import { MoeCheckButton } from './MoeCheckButton';
import type { ThemeColors } from '../hooks/use-theme-colors';

const controls = vi.hoisted(() => ({ reduced: false, motion: 'standard', listeners: new Set<(state: string) => void>() }));
vi.mock('./preferences', () => ({ useMoePreferences: () => ({ motion: controls.motion }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => controls.reduced }));
vi.mock('react-native', async importOriginal => {
  const original = await importOriginal<typeof import('react-native')>();
  return { ...original, AppState: { currentState: 'active', addEventListener: (_: string, listener: (state: string) => void) => {
    controls.listeners.add(listener); return { remove: () => controls.listeners.delete(listener) };
  } } };
});
const tc = { success: '#287', secondaryText: '#555', onTint: '#fff' } as ThemeColors;
let tree: ReactTestRenderer;
beforeEach(() => { controls.reduced = false; controls.motion = 'standard'; });
afterEach(() => { if (tree) act(() => tree.unmount()); vi.restoreAllMocks(); expect(controls.listeners.size).toBe(0); });
const button = () => tree.root.findByType('Pressable' as any);

describe('completion checkbox interaction', () => {
  it('dispatches once immediately without waiting for either press or mark animation', () => {
    vi.spyOn(Animated, 'timing').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    vi.spyOn(Animated, 'spring').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    const write = vi.fn(), stopPropagation = vi.fn();
    act(() => { tree = create(<MoeCheckButton checked={false} disabled={false} label="Complete" onPress={write} tc={tc} />); });
    act(() => { button().props.onPressIn(); button().props.onPress({ stopPropagation }); });
    expect(write).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce();
    expect(button().props.accessibilityState.checked).toBe(false);
  });
  it('cancels a superseded check animation when undo or failure returns the checked prop to false', () => {
    const stop = vi.fn();
    vi.spyOn(Animated, 'parallel').mockReturnValue({ start: vi.fn(), stop } as any);
    const props = { disabled: false, label: 'Complete', onPress: vi.fn(), tc };
    act(() => { tree = create(<MoeCheckButton {...props} checked={false} />); });
    act(() => { tree.update(<MoeCheckButton {...props} checked />); });
    act(() => { tree.update(<MoeCheckButton {...props} checked={false} />); });
    expect(stop).toHaveBeenCalled(); expect(button().props.accessibilityState.checked).toBe(false);
  });
  it('lets two tasks complete independently while the first visual animation is still running', () => {
    const timing = vi.spyOn(Animated, 'timing').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    const first = vi.fn(), second = vi.fn();
    act(() => { tree = create(<>
      <MoeCheckButton checked={false} disabled={false} label="First" onPress={first} tc={tc} />
      <MoeCheckButton checked={false} disabled={false} label="Second" onPress={second} tc={tc} />
    </>); });
    const buttons = tree.root.findAllByType('Pressable' as any);
    act(() => { buttons.forEach(node => { node.props.onPressIn(); node.props.onPress({ stopPropagation() {} }); }); });
    expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce();
    expect(timing.mock.calls[0][0]).not.toBe(timing.mock.calls[1][0]);
  });
  it('keeps reduced-motion and disabled controls functional without animated feedback', () => {
    controls.reduced = true;
    const timing = vi.spyOn(Animated, 'timing'), spring = vi.spyOn(Animated, 'spring'), write = vi.fn();
    const props = { label: 'Complete', onPress: write, tc };
    act(() => { tree = create(<MoeCheckButton {...props} checked={false} disabled />); });
    act(() => { button().props.onPressIn(); button().props.onPress({ stopPropagation() {} }); });
    expect(write).not.toHaveBeenCalled();
    act(() => { tree.update(<MoeCheckButton {...props} checked disabled={false} />); button().props.onPressOut(); });
    expect(timing).not.toHaveBeenCalled(); expect(spring).not.toHaveBeenCalled();
    expect(button().props.accessibilityState.checked).toBe(true);
  });
  it('settles visuals on background and removes its listener when unmounted', () => {
    const stop = vi.spyOn(Animated.Value.prototype, 'stopAnimation');
    act(() => { tree = create(<MoeCheckButton checked disabled={false} label="Undo" onPress={vi.fn()} tc={tc} />); });
    stop.mockClear();
    act(() => { controls.listeners.forEach(listener => listener('background')); });
    expect(stop).toHaveBeenCalledTimes(3);
  });
});
