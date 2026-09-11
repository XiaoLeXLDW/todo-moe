import { beforeEach, describe, expect, it, vi } from 'vitest';
import { impactAsync, notificationAsync, selectionAsync } from './haptics';
const state = vi.hoisted(() => ({ mode: 'light', impactAsync: vi.fn(), selectionAsync: vi.fn() }));
vi.mock('expo-haptics', () => ({ impactAsync: state.impactAsync, selectionAsync: state.selectionAsync }));
vi.mock('./preferences', () => ({ getMoePreferences: () => ({ haptics: state.mode }) }));
beforeEach(() => { state.mode = 'light'; state.impactAsync.mockReset().mockResolvedValue(undefined); state.selectionAsync.mockReset().mockResolvedValue(undefined); });

describe('device haptic setting', () => {
  it('silences every shared feedback entry point when disabled', async () => {
    state.mode = 'off';
    await Promise.all([impactAsync('medium'), notificationAsync('success'), selectionAsync()]);
    expect(state.impactAsync).not.toHaveBeenCalled();
    expect(state.selectionAsync).not.toHaveBeenCalled();
  });
  it('uses a light impact and tolerates unavailable hardware', async () => {
    state.impactAsync.mockRejectedValue(new Error('No vibrator'));
    await expect(notificationAsync('warning')).resolves.toBeUndefined();
    expect(state.impactAsync).toHaveBeenCalledWith('light');
  });
});
