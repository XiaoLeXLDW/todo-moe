import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getMoePreferences } from './preferences';

export const ImpactFeedbackStyle = {
  Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid',
} as const;
export const NotificationFeedbackType = {
  Success: 'success', Warning: 'warning', Error: 'error',
} as const;

export type MoeHapticEvent =
  | 'selectionTick'
  | 'taskConfirmed'
  | 'undoReleased'
  | 'listCompleted'
  | 'dragStarted'
  | 'deleteConfirmed'
  | 'errorRejected'
  | 'captureSaved'
  | 'tabSelected'
  | 'auditionSingle'
  | 'auditionDouble'
  | 'auditionTriple';

export type MoeHapticRequest = {
  event: MoeHapticEvent;
  /** Stable operation identity prevents one logical action from vibrating twice. */
  interactionId?: string | number;
  occurredAt?: number;
  /** Screen owners pass false after blur; background/stale events are ignored. */
  ownerActive?: boolean;
};

type NativeMoeHaptics = {
  performPatternAsync(pattern: MoeHapticEvent, strength: 'system' | 'crisp' | 'strong'): Promise<boolean>;
};

let nativeHaptics: NativeMoeHaptics | null = null;
if (Platform.OS === 'android') {
  try { nativeHaptics = requireOptionalNativeModule<NativeMoeHaptics>('MoeHaptics'); } catch { /* Expo Go fallback below. */ }
}

const identities = new Map<string, number>();
const EVENT_TTL_MS = 900;

function enabled() {
  return getMoePreferences().haptics !== 'off';
}

function accept(request: MoeHapticRequest) {
  const now = Date.now();
  const occurredAt = request.occurredAt ?? now;
  if (!enabled() || request.ownerActive === false || (AppState.currentState && AppState.currentState !== 'active')) return false;
  if (!Number.isFinite(occurredAt) || now - occurredAt > EVENT_TTL_MS || occurredAt - now > 250) return false;
  if (request.interactionId === undefined) return true;
  const key = `${request.event}:${request.interactionId}`;
  if (identities.has(key)) return false;
  identities.set(key, now);
  for (const [identity, at] of identities) if (now - at > 5000) identities.delete(identity);
  while (identities.size > 64) identities.delete(identities.keys().next().value!);
  return true;
}

const androidEvent = (event: MoeHapticEvent): Haptics.AndroidHaptics => {
  switch (event) {
    case 'taskConfirmed': case 'captureSaved': case 'listCompleted':
    case 'auditionSingle': case 'auditionTriple': return Haptics.AndroidHaptics.Confirm;
    case 'undoReleased': case 'auditionDouble': return Haptics.AndroidHaptics.Gesture_End;
    case 'dragStarted': return Haptics.AndroidHaptics.Drag_Start;
    case 'deleteConfirmed': return Haptics.AndroidHaptics.Long_Press;
    case 'errorRejected': return Haptics.AndroidHaptics.Reject;
    case 'selectionTick': case 'tabSelected': return Haptics.AndroidHaptics.Segment_Tick;
  }
};

async function platformEvent(event: MoeHapticEvent) {
  const strength = getMoePreferences().haptics;
  try {
    if (Platform.OS === 'android') {
      if (nativeHaptics && strength !== 'off') {
        try {
          if (await nativeHaptics.performPatternAsync(event, strength)) return;
        } catch { /* Fall through to the system semantic API. */ }
      }
      await Haptics.performAndroidHapticsAsync(androidEvent(event));
      return;
    }
    if (event === 'errorRejected') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (event === 'listCompleted' || event === 'auditionTriple') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (event === 'selectionTick' || event === 'tabSelected') await Haptics.selectionAsync();
    else await Haptics.impactAsync(strength === 'strong' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Rigid);
  } catch { /* Hardware feedback is optional and never blocks the action. */ }
}

export async function emitMoeHaptic(request: MoeHapticRequest) {
  if (!accept(request)) return;
  await platformEvent(request.event);
}

/** Compatibility entry point. New code should name the semantic event. */
export function moeHaptic(event: MoeHapticEvent = 'selectionTick', interactionId?: string | number) {
  void emitMoeHaptic({ event, interactionId });
}

/** Compatibility wrappers preserve the caller's requested style/type exactly. */
export async function impactAsync(style: string = ImpactFeedbackStyle.Light) {
  if (!enabled()) return;
  const supported = Object.values(ImpactFeedbackStyle).includes(style as never) ? style : ImpactFeedbackStyle.Light;
  try { await Haptics.impactAsync(supported as Haptics.ImpactFeedbackStyle); } catch { /* Optional hardware. */ }
}

export async function selectionAsync() {
  if (!enabled()) return;
  try { await Haptics.selectionAsync(); } catch { /* Optional hardware. */ }
}

export async function notificationAsync(type: string = NotificationFeedbackType.Success) {
  if (!enabled()) return;
  const supported = Object.values(NotificationFeedbackType).includes(type as never) ? type : NotificationFeedbackType.Success;
  try { await Haptics.notificationAsync(supported as Haptics.NotificationFeedbackType); } catch { /* Optional hardware. */ }
}

export function clearMoeHapticIdentitiesForTests() { identities.clear(); }
