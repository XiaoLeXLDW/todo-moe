import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../contexts/language-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { subscribeListCompleted, type ListCompletedEvent } from './completion';
import { MOE_COMPLETION_MOTION, resolveMoeCompletionMotion } from './completion-motion';

const PARTICLES = [
  { symbol: '✦', x: -1, y: -1 },
  { symbol: '✧', x: 0, y: 1 },
  { symbol: '✦', x: 1, y: -1 },
] as const;

export function MoeCelebration() {
  const [event, setEvent] = useState<ListCompletedEvent | null>(null);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
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
    disposeCurrent.current();
    if (next && AppState.currentState === 'active' && appWindowFocused.current && focused && preferences.celebration) {
      expiresAt.current = Date.now() + MOE_COMPLETION_MOTION.celebrationMs;
      setEvent({ ...next });
    } else setEvent(null);
  }), [focused, preferences.celebration]);
  useEffect(() => {
    if (!event || !preferences.celebration || !focused) return;
    const remainingMs = Math.max(0, expiresAt.current - Date.now());
    progress.setValue(motion.reduced ? 1 : 1 - remainingMs / MOE_COMPLETION_MOTION.celebrationMs);
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
  }, [event, focused, motion.reduced, preferences.celebration, progress]);
  useEffect(() => {
    if (!focused || !preferences.celebration) clearCurrent();
  }, [focused, preferences.celebration, clearCurrent]);
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
  if (!event || !preferences.celebration || !focused) return null;
  const opacity = motion.reduced ? 1 : progress.interpolate({
    inputRange: [0, MOE_COMPLETION_MOTION.celebrationFadeInAt, MOE_COMPLETION_MOTION.celebrationFadeOutAt, 1],
    outputRange: [0, 1, 1, 0],
  });
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.success, opacity }]}>
        <Text style={{ color: tc.success, fontSize: 16, fontWeight: '700' }}>{language.startsWith('zh') ? '✓ 清单已完成' : '✓ List completed'}</Text>
        <Text style={{ color: tc.text, marginTop: 4 }} numberOfLines={2}>{event.title}</Text>
        {!motion.reduced ? (
          <View style={styles.particleOrigin}>
            {PARTICLES.map((particle, index) => (
              <Animated.View key={index} testID="moe-moment-particle" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[styles.particle, { transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x * MOE_COMPLETION_MOTION.celebrationParticleDistance] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y * MOE_COMPLETION_MOTION.celebrationParticleDistance] }) },
                ] }]}>
                <Text style={{ color: tc.tint }}>{particle.symbol}</Text>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  host: { position: 'absolute', top: 96, left: 24, right: 24, alignItems: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, maxWidth: 340 },
  particleOrigin: { height: 16, marginTop: 6 },
  particle: { position: 'absolute', left: '50%' },
});
