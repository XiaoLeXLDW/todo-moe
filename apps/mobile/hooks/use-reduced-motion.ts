import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMoePreferences } from '../moe/preferences';

// Task rows share one native observer, including during large-list scrolling.
let systemReduced = false;
let revision = 0;
let subscription: { remove: () => void } | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => systemReduced;
function receive(enabled: boolean) {
  revision += 1;
  systemReduced = enabled;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const initialRevision = revision;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', receive);
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (listeners.size > 0 && revision === initialRevision) receive(enabled);
    }).catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      revision += 1;
      subscription?.remove();
      subscription = undefined;
    }
  };
}

/** Either the operating system or TodoMoe's Simple preference can reduce motion. */
export function useReducedMotion(): boolean {
  const preferences = useMoePreferences();
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return reduced || preferences.motion === 'simple';
}
