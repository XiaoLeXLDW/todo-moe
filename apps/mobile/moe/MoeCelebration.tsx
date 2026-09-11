import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../contexts/language-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { resolveMoeMotion } from './preference-model';
import { subscribeListCompleted, type ListCompletedEvent } from './completion';

export function MoeCelebration() {
  const [event, setEvent] = useState<ListCompletedEvent | null>(null);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const tc = useThemeColors();
  const { language } = useLanguage();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => subscribeListCompleted((next) => {
    if (!next) { setEvent(null); return; }
    if (AppState.currentState === 'active' && focused) setEvent(next);
  }), [focused]);
  useEffect(() => {
    if (!event) return;
    const motion = resolveMoeMotion(preferences.motion, reduced || !preferences.celebration);
    progress.setValue(motion.reduced ? 1 : 0);
    const animation = Animated.timing(progress, { toValue: 1, duration: motion.duration, useNativeDriver: true });
    animation.start();
    const timer = setTimeout(() => setEvent(null), 2200);
    return () => { clearTimeout(timer); animation.stop?.(); };
  }, [event, preferences.motion, preferences.celebration, progress, reduced]);
  useEffect(() => { if (!focused) setEvent(null); }, [focused]);
  if (!event) return null;
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.success, opacity: progress }]}>
        <Text style={{ color: tc.success, fontSize: 16, fontWeight: '700' }}>{language.startsWith('zh') ? '✓ 清单已完成' : '✓ List completed'}</Text>
        <Text style={{ color: tc.text, marginTop: 4 }} numberOfLines={2}>{event.title}</Text>
        {preferences.celebration && !reduced ? <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: tc.tint, marginTop: 6 }}>✦ · ✧ · ✦</Text> : null}
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({ host: { position: 'absolute', top: 96, left: 24, right: 24, alignItems: 'center' }, card: { borderRadius: 20, borderWidth: 1, padding: 18, maxWidth: 340 } });
