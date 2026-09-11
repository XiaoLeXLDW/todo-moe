import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';

const CHECK_SIZE = 16;

export function MoeCheckButton({ checked, disabled, label, onPress, tc }: {
  checked: boolean; disabled: boolean; label: string; onPress: () => void; tc: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const previous = useRef(checked);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  useEffect(() => {
    const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
    scale.stopAnimation();
    mark.stopAnimation();
    const changed = previous.current !== checked;
    previous.current = checked;
    if (!changed || motion.reduced || AppState.currentState !== 'active') {
      scale.setValue(1);
      mark.setValue(checked ? 1 : 0);
      return;
    }
    const rebound = Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true });
    const animation = Animated.parallel([
      checked ? Animated.sequence([
        Animated.timing(scale, { toValue: motion.completedScale, duration: motion.pressMs, useNativeDriver: true }),
        rebound,
      ]) : rebound,
      Animated.timing(mark, { toValue: checked ? 1 : 0, duration: motion.checkMs, useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [checked, preferences.motion, reduced, scale, mark]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      scale.stopAnimation(); mark.stopAnimation();
      scale.setValue(1); mark.setValue(previous.current ? 1 : 0);
    });
    return () => { subscription.remove(); scale.stopAnimation(); mark.stopAnimation(); };
  }, [scale, mark]);
  const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
  const release = () => {
    scale.stopAnimation();
    if (motion.reduced) scale.setValue(1);
    else Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
  };
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={label} disabled={disabled}
      onPressIn={() => {
        if (disabled || motion.reduced) return;
        scale.stopAnimation();
        Animated.timing(scale, { toValue: motion.pressedScale, duration: motion.pressMs, useNativeDriver: true }).start();
      }}
      onPressOut={release}
      onPress={(event) => { event.stopPropagation(); if (!disabled) onPress(); }} style={styles.target}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View style={[styles.circle, { borderColor: checked ? tc.success : tc.secondaryText }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.fill, { backgroundColor: tc.success, opacity: mark }]} />
          <View pointerEvents="none" accessible={false} style={styles.markFrame}>
            <Animated.View style={{ width: mark.interpolate({ inputRange: [0, 1], outputRange: [0, CHECK_SIZE] }), overflow: 'hidden' }}>
              <Check size={CHECK_SIZE} color={tc.onTint} strokeWidth={3} />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ target: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 2 }, circle: { width: 24, height: 24, borderRadius: 9, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' }, fill: { borderRadius: 7 }, markFrame: { width: CHECK_SIZE, height: CHECK_SIZE } });
