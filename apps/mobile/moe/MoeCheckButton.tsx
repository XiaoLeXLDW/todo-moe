import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { useMoePreferences } from './preferences';
import { resolveMoeMotion } from './preference-model';

export function MoeCheckButton({ checked, disabled, label, onPress, tc }: {
  checked: boolean; disabled: boolean; label: string; onPress: () => void; tc: ThemeColors;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  useEffect(() => {
    const motion = resolveMoeMotion(preferences.motion, reduced);
    scale.setValue(checked && !motion.reduced ? 0.88 : 1);
    const animation = Animated.timing(scale, { toValue: 1, duration: motion.duration, useNativeDriver: true });
    animation.start();
    return () => animation.stop?.();
  }, [checked, preferences.motion, reduced, scale]);
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={label} disabled={disabled}
      onPress={(event) => { event.stopPropagation(); onPress(); }} style={styles.target}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.circle, { borderColor: checked ? tc.success : tc.secondaryText, backgroundColor: checked ? tc.success : 'transparent' }]}>
          {checked ? <Check size={16} color={tc.onTint} strokeWidth={3} /> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ target: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginRight: 2 }, circle: { width: 24, height: 24, borderRadius: 9, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' } });
