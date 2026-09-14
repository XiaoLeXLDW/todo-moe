import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';
import Reanimated, { type AnimatedRef } from 'react-native-reanimated';
import { MoeCompletionCheck } from './MoeCompletionCheck';

export function MoeCheckButton({ checked, disabled, label, onPress, tc, measurementRef }: {
  checked: boolean; disabled: boolean; label: string; onPress: () => void; tc: ThemeColors;
  measurementRef?: AnimatedRef<View>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const emphasis = useRef(new Animated.Value(1)).current;
  const previous = useRef(checked);
  const pressedValue = useRef<boolean | null>(null);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  useEffect(() => {
    const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
    scale.stopAnimation();
    mark.stopAnimation();
    emphasis.stopAnimation();
    emphasis.setValue(1);
    const changed = previous.current !== checked;
    previous.current = checked;
    if (!changed || motion.reduced || AppState.currentState !== 'active') {
      scale.setValue(1);
      mark.setValue(checked ? 1 : 0);
      return;
    }
    scale.setValue(1);
    if (checked) emphasis.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(mark, { toValue: checked ? 1 : 0, duration: motion.checkMs, easing: value => value, useNativeDriver: false }),
      Animated.timing(emphasis, { toValue: 1, duration: motion.checkMs, easing: value => value, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [checked, preferences.motion, reduced, scale, mark, emphasis]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      scale.stopAnimation(); mark.stopAnimation();
      emphasis.stopAnimation(); emphasis.setValue(1);
      scale.setValue(1); mark.setValue(previous.current ? 1 : 0);
    });
    return () => { subscription.remove(); scale.stopAnimation(); mark.stopAnimation(); emphasis.stopAnimation(); };
  }, [scale, mark, emphasis]);
  const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
  const release = () => {
    const completedDuringPress = pressedValue.current !== null && pressedValue.current !== previous.current;
    pressedValue.current = null;
    // Pressability may deliver onPressOut after React has started the completion
    // group. Releasing the original press must not interrupt that confirmation.
    if (completedDuringPress) return;
    scale.stopAnimation();
    if (motion.reduced) scale.setValue(1);
    else Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
  };
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={label} disabled={disabled}
      onPressIn={() => {
        pressedValue.current = checked;
        if (disabled || motion.reduced) return;
        scale.stopAnimation();
        Animated.timing(scale, { toValue: motion.pressedScale, duration: motion.pressMs, useNativeDriver: true }).start();
      }}
      onPressOut={release}
      onPress={(event) => { event.stopPropagation(); if (!disabled) onPress(); }} style={styles.target}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Reanimated.View ref={measurementRef} collapsable={false} style={styles.checkFrame}>
          <View pointerEvents="none" style={[styles.outline, { borderColor: checked ? tc.success : tc.secondaryText }]} />
          <MoeCompletionCheck reveal={mark} emphasis={emphasis} motion={motion} color={tc.success} foreground={tc.onTint} />
        </Reanimated.View>
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ target: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 2 }, checkFrame: { width: 24, height: 24 }, outline: { ...StyleSheet.absoluteFillObject, borderRadius: 9, borderWidth: 1.8 } });
