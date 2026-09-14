import React, { useEffect, useRef } from 'react';
import { Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';
import Reanimated, { type AnimatedRef } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const CHECK_SIZE = 16;

/** Pure decoration shared by retained checkboxes, departing paint and preview. */
export function MoeCompletionBurst({ progress, motion, color }: {
  progress: Animated.Value; motion: ReturnType<typeof resolveMoeCompletionMotion>; color: string;
}) {
  if (motion.reduced) return null;
  const size = motion.burstSize;
  const center = size / 2;
  const inner = size * 0.18;
  const outer = size * 0.46;
  const rays = Array.from({ length: motion.burstParticles }, (_, index) => {
    const angle = index * Math.PI * 2 / motion.burstParticles;
    return `M ${center + Math.cos(angle) * inner} ${center + Math.sin(angle) * inner} L ${center + Math.cos(angle) * outer} ${center + Math.sin(angle) * outer}`;
  }).join(' ');
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ position: 'absolute', width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2 }}>
    <Animated.View style={{ ...StyleSheet.absoluteFillObject,
      opacity: progress.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.65, 0.3, 0] }),
      transform: [
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 1] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '5deg'] }) },
      ] }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={size * 0.36} fill="none" stroke={color} strokeWidth={1.5} />
        <Path d={rays} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  </View>;
}

export function MoeCheckButton({ checked, disabled, label, onPress, tc, measurementRef }: {
  checked: boolean; disabled: boolean; label: string; onPress: () => void; tc: ThemeColors;
  measurementRef?: AnimatedRef<View>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const previous = useRef(checked);
  const pressedValue = useRef<boolean | null>(null);
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  useEffect(() => {
    const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
    scale.stopAnimation();
    mark.stopAnimation();
    burst.stopAnimation();
    burst.setValue(1);
    const changed = previous.current !== checked;
    previous.current = checked;
    if (!changed || motion.reduced || AppState.currentState !== 'active') {
      scale.setValue(1);
      mark.setValue(checked ? 1 : 0);
      return;
    }
    const rebound = Animated.spring(scale, { toValue: 1, ...motion.spring, useNativeDriver: true });
    if (checked) burst.setValue(0);
    const animation = Animated.parallel([
      checked ? Animated.sequence([
        Animated.timing(scale, { toValue: motion.completedScale, duration: motion.pressMs, useNativeDriver: true }),
        rebound,
      ]) : rebound,
      Animated.timing(mark, { toValue: checked ? 1 : 0, duration: motion.checkMs, useNativeDriver: false }),
      Animated.timing(burst, { toValue: 1, duration: motion.exitMs, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [checked, preferences.motion, reduced, scale, mark, burst]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      scale.stopAnimation(); mark.stopAnimation();
      burst.stopAnimation(); burst.setValue(1);
      scale.setValue(1); mark.setValue(previous.current ? 1 : 0);
    });
    return () => { subscription.remove(); scale.stopAnimation(); mark.stopAnimation(); burst.stopAnimation(); };
  }, [scale, mark, burst]);
  const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
  const release = () => {
    const completedDuringPress = pressedValue.current !== null && pressedValue.current !== previous.current;
    pressedValue.current = null;
    // Pressability may deliver onPressOut after React has started the completion
    // group. Stopping scale there also cancels mark/burst via Animated.parallel.
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
      <MoeCompletionBurst progress={burst} motion={motion} color={tc.success} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Reanimated.View ref={measurementRef} collapsable={false}>
        <Animated.View style={[styles.circle, { borderColor: checked ? tc.success : tc.secondaryText }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.fill, { backgroundColor: tc.success, opacity: mark }]} />
          <View pointerEvents="none" accessible={false} style={styles.markFrame}>
            <Animated.View style={{ width: mark.interpolate({ inputRange: [0, 1], outputRange: [0, CHECK_SIZE] }), overflow: 'hidden' }}>
              <Check size={CHECK_SIZE} color={tc.onTint} strokeWidth={3} />
            </Animated.View>
          </View>
        </Animated.View>
        </Reanimated.View>
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ target: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 2 }, circle: { width: 24, height: 24, borderRadius: 9, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' }, fill: { borderRadius: 7 }, markFrame: { width: CHECK_SIZE, height: CHECK_SIZE } });
