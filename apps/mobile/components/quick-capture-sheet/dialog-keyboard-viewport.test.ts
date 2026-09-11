import { describe, expect, it } from 'vitest';
import type { DialogKeyboardFrame } from '../../modules/moe-keyboard-insets';
import { getDialogKeyboardOverlap } from './dialog-keyboard-viewport';

const deviceFrame: DialogKeyboardFrame = { imeVisible: true, imeBottomPx: 1009, keyboardTopPx: 1511,
  windowTopPx: 0, windowHeightPx: 2520, hostTopPx: 0, hostHeightPx: 2520, density: 440 / 160, source: 'dialog-insets-frame' };
describe('Quick Capture Dialog keyboard viewport', () => {
  it('clears the recorded MIX Fold 2 vc3 Save bounds using real occlusion, not a constant correction', () => {
    const overlapDp = getDialogKeyboardOverlap(deviceFrame);
    expect(overlapDp).toBeCloseTo(1009 / 2.75);
    expect(2487 - overlapDp * deviceFrame.density).toBeLessThanOrEqual(1511);
  });
  it('subtracts nothing when Android has already resized the host above the IME', () => {
    expect(getDialogKeyboardOverlap({ ...deviceFrame, hostHeightPx: 1511 })).toBe(0);
  });
  it('respects a positioned window and changes of size, density, and keyboard height', () => {
    expect(getDialogKeyboardOverlap({ ...deviceFrame, hostTopPx: 200, hostHeightPx: 900, keyboardTopPx: 850, density: 2 })).toBe(125);
    expect(getDialogKeyboardOverlap({ ...deviceFrame, hostHeightPx: 1080, keyboardTopPx: 710, density: 2.75 })).toBeCloseTo(370 / 2.75);
  });
  it('resets on hide and rejects invalid frames without an oversized layout', () => {
    expect(getDialogKeyboardOverlap({ ...deviceFrame, imeVisible: false })).toBe(0);
    expect(getDialogKeyboardOverlap({ ...deviceFrame, density: 0 })).toBe(0);
    expect(getDialogKeyboardOverlap({ ...deviceFrame, keyboardTopPx: Number.NaN })).toBe(0);
    expect(getDialogKeyboardOverlap(null)).toBe(0);
  });
});
