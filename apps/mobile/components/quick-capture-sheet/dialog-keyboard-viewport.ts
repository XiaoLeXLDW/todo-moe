import type { DialogKeyboardFrame } from '../../modules/moe-keyboard-insets';

/** All geometry is from the same native Dialog; convert pixels to dp once. */
export function getDialogKeyboardOverlap(frame: DialogKeyboardFrame | null): number {
  if (!frame?.imeVisible) return 0;
  const { keyboardTopPx, hostTopPx, hostHeightPx, density } = frame;
  if (![keyboardTopPx, hostTopPx, hostHeightPx, density].every(Number.isFinite) || density <= 0 || hostHeightPx <= 0) return 0;
  const overlap = Math.max(0, Math.min(hostHeightPx, hostTopPx + hostHeightPx - keyboardTopPx));
  return overlap / density;
}
