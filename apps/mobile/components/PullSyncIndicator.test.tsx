import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { PullSyncIndicator } from './PullSyncIndicator';

vi.mock('@/hooks/use-theme-colors', () => ({
  useThemeColors: () => ({ danger: '#D00', success: '#0A0', tint: '#00D' }),
}));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }));

describe('PullSyncIndicator', () => {
  it('stays absent while idle and animates the real state color when work starts', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PullSyncIndicator state="idle" />); });
    expect(tree.toJSON()).toBeNull();
    act(() => { tree.update(<PullSyncIndicator state="syncing" />); });
    const bar = tree.root.findByProps({ testID: 'pull-sync-motion-bar' });
    expect(bar.props.style[1].backgroundColor).toBe('#00D');
    expect(bar.props.style[1].transform).toHaveLength(3);
  });

  it('uses distinct success and error colors without changing sync state', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PullSyncIndicator state="success" />); });
    expect(tree.root.findByProps({ testID: 'pull-sync-motion-bar' }).props.style[1].backgroundColor).toBe('#0A0');
    act(() => { tree.update(<PullSyncIndicator state="error" />); });
    expect(tree.root.findByProps({ testID: 'pull-sync-motion-bar' }).props.style[1].backgroundColor).toBe('#D00');
  });
});
