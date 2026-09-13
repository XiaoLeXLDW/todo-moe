import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../contexts/language-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { subscribeListCompleted, type ListCompletedEvent } from './completion';
import { resolveMoeCompletionMotion } from './completion-motion';

import { MoeCelebrationVisual } from './MoeCelebrationVisual';

export function MoeCelebration({ active, projectId }: { active?: boolean; projectId?: string } = {}) {
  const [event, setEvent] = useState<ListCompletedEvent | null>(null);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  // A native Modal owns its presentation lifecycle; Activity blur describes
  // the window behind it. The tab instance keeps the original Activity gate.
  const hostActive = active ?? focused;
  const ownsModalLifecycle = active !== undefined;
  const tc = useThemeColors();
  const { language } = useLanguage();
  const progress = useRef(new Animated.Value(1)).current;
  const disposeCurrent = useRef<() => void>(() => {});
  const expiresAt = useRef(0);
  const appWindowFocused = useRef(AppState.currentState === 'active');
  const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
  const clearCurrent = useCallback(() => {
    disposeCurrent.current();
    setEvent(null);
  }, []);
  useEffect(() => subscribeListCompleted((next) => {
    if (next && projectId !== undefined && next.projectId !== projectId) return;
    disposeCurrent.current();
    if (next && AppState.currentState === 'active' && (ownsModalLifecycle || appWindowFocused.current) && hostActive && preferences.celebration) {
      expiresAt.current = Date.now() + motion.celebrationMs;
      setEvent({ ...next });
    } else setEvent(null);
  }), [hostActive, ownsModalLifecycle, preferences.celebration, projectId, motion.celebrationMs]);
  useEffect(() => {
    if (!event || !preferences.celebration || !hostActive || (projectId !== undefined && event.projectId !== projectId)) return;
    const remainingMs = Math.max(0, expiresAt.current - Date.now());
    progress.setValue(motion.reduced ? 1 : 1 - remainingMs / motion.celebrationMs);
    const animation = motion.reduced ? null : Animated.timing(progress, {
      toValue: 1, duration: remainingMs, useNativeDriver: true,
    });
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setEvent(current => current === event ? null : current);
    }, remainingMs);
    const dispose = () => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timer);
      animation?.stop();
      progress.stopAnimation();
    };
    disposeCurrent.current = dispose;
    // Visibility belongs to this event's timer; native animation callbacks can
    // arrive after stop and must never dismiss a newer completion.
    animation?.start();
    return dispose;
  }, [event, hostActive, motion.reduced, motion.celebrationMs, preferences.celebration, progress, projectId]);
  useEffect(() => {
    if (!hostActive || !preferences.celebration) clearCurrent();
  }, [hostActive, preferences.celebration, clearCurrent]);
  useEffect(() => { clearCurrent(); }, [projectId, clearCurrent]);
  useEffect(() => {
    const change = AppState.addEventListener('change', state => {
      appWindowFocused.current = state === 'active';
      if (state !== 'active') clearCurrent();
    });
    const blur = AppState.addEventListener('blur', () => {
      appWindowFocused.current = false;
      clearCurrent();
    });
    const focus = AppState.addEventListener('focus', () => { appWindowFocused.current = true; });
    return () => { change.remove(); blur.remove(); focus.remove(); };
  }, [clearCurrent]);
  if (!event || !preferences.celebration || !hostActive || (projectId !== undefined && event.projectId !== projectId)) return null;
  return <View pointerEvents="none" style={styles.host}>
    <MoeCelebrationVisual progress={progress} motion={motion} tc={tc}
      label={language.startsWith('zh') ? '✓ 清单已完成' : '✓ List completed'} title={event.title} />
  </View>;
}
const styles = StyleSheet.create({
  host: { position: 'absolute', top: 96, left: 24, right: 24, alignItems: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, maxWidth: 340 },
  particleOrigin: { position: 'absolute', left: 0, right: 0, top: '50%', overflow: 'visible' },
  particle: { position: 'absolute', left: '50%' },
});
