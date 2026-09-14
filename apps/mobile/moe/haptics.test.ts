import { beforeEach, describe, expect, it, vi } from 'vitest';
import { impactAsync, notificationAsync, selectionAsync } from './haptics';
const state = vi.hoisted(() => ({ mode: 'crisp', impactAsync: vi.fn(), notificationAsync: vi.fn(), selectionAsync: vi.fn() }));
vi.mock('expo-haptics', () => ({ impactAsync: state.impactAsync, notificationAsync: state.notificationAsync, selectionAsync: state.selectionAsync }));
vi.mock('./preferences', () => ({ getMoePreferences: () => ({ haptics: state.mode }) }));
beforeEach(() => { state.mode = 'crisp'; state.impactAsync.mockReset().mockResolvedValue(undefined); state.notificationAsync.mockReset().mockResolvedValue(undefined); state.selectionAsync.mockReset().mockResolvedValue(undefined); });

describe('device haptic setting', () => {
  it('silences every shared feedback entry point when disabled', async () => {
    state.mode = 'off';
    await Promise.all([impactAsync('medium'), notificationAsync('success'), selectionAsync()]);
    expect(state.impactAsync).not.toHaveBeenCalled();
    expect(state.selectionAsync).not.toHaveBeenCalled();
  });
  it('preserves requested impact and notification semantics and tolerates unavailable hardware', async () => {
    state.notificationAsync.mockRejectedValue(new Error('No vibrator'));
    await impactAsync('heavy');
    await expect(notificationAsync('warning')).resolves.toBeUndefined();
    expect(state.impactAsync).toHaveBeenCalledWith('heavy');
    expect(state.notificationAsync).toHaveBeenCalledWith('warning');
  });
});
