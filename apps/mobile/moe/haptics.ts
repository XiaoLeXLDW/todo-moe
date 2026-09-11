import * as Haptics from 'expo-haptics';
import { getMoePreferences } from './preferences';

export function moeHaptic() {
  void impactAsync();
}
export const ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' } as const;
export const NotificationFeedbackType = { Success: 'success', Warning: 'warning', Error: 'error' } as const;
export async function impactAsync(_style?: string) {
  if (getMoePreferences().haptics === 'off') return;
  try { await Haptics.impactAsync('light' as Haptics.ImpactFeedbackStyle); } catch { /* Hardware feedback is optional. */ }
}
export async function selectionAsync() {
  if (getMoePreferences().haptics === 'off') return;
  try { await Haptics.selectionAsync(); } catch { /* Optional hardware. */ }
}
export const notificationAsync = (_type?: string) => impactAsync();
