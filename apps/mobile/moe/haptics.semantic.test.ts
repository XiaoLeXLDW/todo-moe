import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mode: 'crisp',
  appState: 'active',
  nativeResult: true,
  native: vi.fn(),
  android: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { get currentState() { return state.appState; } },
}));
vi.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => ({ performPatternAsync: state.native }),
}));
vi.mock('./preferences', () => ({ getMoePreferences: () => ({ haptics: state.mode }) }));
vi.mock('expo-haptics', () => ({
  AndroidHaptics: { Confirm: 'confirm', Gesture_End: 'gesture-end', Drag_Start: 'drag-start', Long_Press: 'long-press', Reject: 'reject', Segment_Tick: 'segment-tick' },
  ImpactFeedbackStyle: { Heavy: 'heavy', Rigid: 'rigid' },
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
  performAndroidHapticsAsync: state.android,
  impactAsync: vi.fn(), notificationAsync: vi.fn(), selectionAsync: vi.fn(),
}));

import { clearMoeHapticIdentitiesForTests, emitMoeHaptic } from './haptics';

beforeEach(() => {
  state.mode = 'crisp'; state.appState = 'active'; state.nativeResult = true;
  state.native.mockReset().mockImplementation(async () => state.nativeResult);
  state.android.mockReset().mockResolvedValue(undefined);
  clearMoeHapticIdentitiesForTests();
});

describe('semantic haptic ownership', () => {
  it('uses low-tier semantic patterns for checklist completion and reopening', async () => {
    state.nativeResult = false;
    await emitMoeHaptic({ event: 'checklistStepConfirmed', interactionId: 'step-on' });
    await emitMoeHaptic({ event: 'checklistStepReopened', interactionId: 'step-off' });
    expect(state.android.mock.calls).toEqual([['segment-tick'], ['gesture-end']]);
  });

  it('sends a completed list as one native pattern and deduplicates its operation', async () => {
    await emitMoeHaptic({ event: 'listCompleted', interactionId: 42 });
    await emitMoeHaptic({ event: 'listCompleted', interactionId: 42 });
    expect(state.native).toHaveBeenCalledTimes(1);
    expect(state.native).toHaveBeenCalledWith('listCompleted', 'crisp');
    expect(state.android).not.toHaveBeenCalled();
  });

  it('falls back to device semantic feedback and rejects stale, blurred, background, and disabled events', async () => {
    state.nativeResult = false;
    await emitMoeHaptic({ event: 'listCompleted', interactionId: 1 });
    expect(state.android).toHaveBeenCalledWith('confirm');
    await emitMoeHaptic({ event: 'taskConfirmed', interactionId: 2, occurredAt: Date.now() - 901 });
    await emitMoeHaptic({ event: 'taskConfirmed', interactionId: 3, ownerActive: false });
    state.appState = 'background';
    await emitMoeHaptic({ event: 'taskConfirmed', interactionId: 4 });
    state.appState = 'active'; state.mode = 'off';
    await emitMoeHaptic({ event: 'taskConfirmed', interactionId: 5 });
    expect(state.android).toHaveBeenCalledTimes(1);
  });

  it('routes every Android strength and the A/B/C audition through the native dispatcher', async () => {
    await emitMoeHaptic({ event: 'taskConfirmed', interactionId: 10 });
    await emitMoeHaptic({ event: 'auditionSingle', interactionId: 11 });
    await emitMoeHaptic({ event: 'auditionDouble', interactionId: 12 });
    state.mode = 'strong';
    await emitMoeHaptic({ event: 'auditionTriple', interactionId: 13 });
    state.mode = 'system';
    await emitMoeHaptic({ event: 'undoReleased', interactionId: 14 });
    expect(state.native.mock.calls).toEqual([
      ['taskConfirmed', 'crisp'],
      ['auditionSingle', 'crisp'],
      ['auditionDouble', 'crisp'],
      ['auditionTriple', 'strong'],
      ['undoReleased', 'system'],
    ]);
  });

  it('falls back to the system semantic event when the native adapter throws', async () => {
    state.native.mockRejectedValueOnce(new Error('native unavailable'));
    await expect(emitMoeHaptic({ event: 'taskConfirmed', interactionId: 20 })).resolves.toBeUndefined();
    expect(state.android).toHaveBeenCalledWith('confirm');
  });
});
