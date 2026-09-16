import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThemeColors } from '../hooks/use-theme-colors';
import { MoeChecklistItem } from './MoeChecklistItem';

const controls = vi.hoisted(() => ({ reduced: false }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => controls.reduced }));
vi.mock('./MoeCompletionParticles', () => ({
  MoeCompletionParticles: (props: any) => React.createElement('MoeCompletionParticles', props),
}));

const tc = {
  border: '#333', onTint: '#fff', secondaryText: '#777', success: '#16a34a', text: '#111', tint: '#2563eb',
} as ThemeColors;
let tree: ReactTestRenderer | undefined;

beforeEach(() => { controls.reduced = false; });
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  vi.restoreAllMocks();
});

describe('checklist item feedback', () => {
  it('animates completion and reopening in opposite directions', () => {
    const timing = vi.spyOn(Animated, 'timing').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    vi.spyOn(Animated, 'spring').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    vi.spyOn(Animated, 'parallel').mockReturnValue({ start: vi.fn(), stop: vi.fn() } as any);
    const props = { disabled: false, label: 'Upload', onPress: vi.fn(), tc };

    act(() => { tree = create(<MoeChecklistItem {...props} checked={false} />); });
    act(() => { tree!.update(<MoeChecklistItem {...props} checked />); });
    expect(timing.mock.calls.some(([, config]) => config.toValue === 1)).toBe(true);

    timing.mockClear();
    act(() => { tree!.update(<MoeChecklistItem {...props} checked={false} />); });
    expect(timing.mock.calls.filter(([, config]) => config.toValue === 0).length).toBeGreaterThanOrEqual(2);
    expect(tree!.root.findByType('Pressable' as any).props.accessibilityState.checked).toBe(false);
  });

  it('snaps under reduced motion and never dispatches a disabled item', () => {
    controls.reduced = true;
    const timing = vi.spyOn(Animated, 'timing');
    const write = vi.fn();
    act(() => { tree = create(<MoeChecklistItem checked={false} disabled label="Upload" onPress={write} tc={tc} />); });
    expect(tree!.root.findByType('Pressable' as any).props.onPress).toBeUndefined();
    act(() => { tree!.update(<MoeChecklistItem checked disabled label="Upload" onPress={write} tc={tc} />); });
    expect(timing).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
