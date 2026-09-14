import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Animated } from 'react-native';
import { MoeMotionPreview } from './MoeMotionPreview';
import { MoeCheckButton } from './MoeCheckButton';
import { MoeCelebrationVisual } from './MoeCelebrationVisual';

const state = vi.hoisted(() => ({ motion: 'lively', reduced: false, listeners: new Set<(state: string) => void>() }));
vi.mock('./preferences', () => ({ useMoePreferences: () => ({ motion: state.motion, celebration: true }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => state.reduced }));
vi.mock('../hooks/use-theme-colors', () => ({ useThemeColors: () => ({ text: '#111', secondaryText: '#555', success: '#187', tint: '#178', cardBg: '#fff', border: '#ccc' }) }));
vi.mock('../contexts/language-context', () => ({ useLanguage: () => ({ language: 'zh' }) }));
vi.mock('react-native', async original => ({ ...await original() as object, AppState: {
  currentState: 'active', addEventListener: (_: string, listener: (state: string) => void) => {
    state.listeners.add(listener); return { remove: () => state.listeners.delete(listener) };
  },
} }));
let tree: ReactTestRenderer;
const buttons = () => tree.root.findAll(node => String(node.type) === 'Pressable' && node.props.accessibilityRole === 'button');
beforeEach(() => {
  state.motion = 'lively'; state.reduced = false;
  vi.useFakeTimers();
  vi.spyOn(Animated, 'timing').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
  act(() => { tree = create(<MoeMotionPreview />); });
});
afterEach(() => {
  act(() => tree.unmount());
  expect(vi.getTimerCount()).toBe(0);
  expect(state.listeners.size).toBe(0);
  vi.useRealTimers(); vi.restoreAllMocks();
});
it('supports immediate completion and Undo without waiting for native animation callbacks', () => {
  act(() => tree.root.findByType(MoeCheckButton).props.onPress());
  expect(tree.root.findByType(MoeCheckButton).props.checked).toBe(true);
  act(() => buttons()[1].props.onPress());
  expect(tree.root.findByType(MoeCheckButton).props.checked).toBe(false);
});
it('repeated list completion then Undo removes the decoration and pending expiry', () => {
  for (let n = 0; n < 8; n++) act(() => buttons()[0].props.onPress());
  expect(vi.getTimerCount()).toBe(1);
  expect(JSON.stringify(tree.toJSON())).toContain('演示清单已完成');
  expect(tree.root.findByType(MoeCelebrationVisual).props.motion).toMatchObject({ celebrationMs: 1000 });
  act(() => buttons()[1].props.onPress());
  expect(vi.getTimerCount()).toBe(0);
  expect(JSON.stringify(tree.toJSON())).not.toContain('演示清单已完成');
  expect(tree.root.findByType(MoeCheckButton).props.checked).toBe(false);
});
it('background and changing motion cancel the current preview', () => {
  act(() => buttons()[0].props.onPress());
  act(() => state.listeners.forEach(listener => listener('background')));
  expect(vi.getTimerCount()).toBe(0);
  expect(tree.root.findByType(MoeCheckButton).props.checked).toBe(false);
  act(() => buttons()[0].props.onPress());
  state.motion = 'simple';
  act(() => tree.update(<MoeMotionPreview />));
  expect(vi.getTimerCount()).toBe(0);
  expect(tree.root.findByType(MoeCheckButton).props.checked).toBe(false);
});
