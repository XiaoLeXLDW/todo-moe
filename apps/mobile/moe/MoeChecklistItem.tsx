import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import type { ThemeColors } from '../hooks/use-theme-colors';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { MoeCompletionParticles } from './MoeCompletionParticles';

export function MoeChecklistItem({ checked, disabled, label, onPress, tc }: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  tc: ThemeColors;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const mark = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const strike = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(checked ? 0.55 : 1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const previous = useRef(checked);
  const [bursting, setBursting] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    const changed = previous.current !== checked;
    previous.current = checked;
    scale.stopAnimation();
    mark.stopAnimation();
    strike.stopAnimation();
    textOpacity.stopAnimation();
    burst.stopAnimation();
    if (!changed || reduced || AppState.currentState !== 'active') {
      scale.setValue(1);
      mark.setValue(checked ? 1 : 0);
      strike.setValue(0);
      textOpacity.setValue(checked ? 0.55 : 1);
      burst.setValue(1);
      setBursting(false);
      setSweeping(false);
      return;
    }
    if (checked) {
      burst.setValue(0);
      setBursting(true);
      strike.setValue(0);
      setSweeping(true);
    } else {
      setBursting(false);
      strike.setValue(1);
      setSweeping(true);
      burst.setValue(1);
    }
    scale.setValue(checked ? 0.74 : 1.12);
    const animation = Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: checked ? 11 : 16,
        stiffness: checked ? 310 : 230,
        mass: 0.55,
        useNativeDriver: true,
      }),
      Animated.timing(mark, {
        toValue: checked ? 1 : 0,
        duration: checked ? 190 : 150,
        useNativeDriver: true,
      }),
      Animated.timing(strike, {
        toValue: checked ? 1 : 0,
        duration: checked ? 220 : 170,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: checked ? 0.55 : 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(burst, {
        toValue: 1,
        duration: checked ? 430 : 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start((result) => {
      if (result?.finished !== false) {
        setBursting(false);
        setSweeping(false);
      }
    });
    return () => animation.stop();
  }, [burst, checked, mark, reduced, scale, strike, textOpacity]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      scale.stopAnimation(); mark.stopAnimation(); strike.stopAnimation(); textOpacity.stopAnimation(); burst.stopAnimation();
      scale.setValue(1); mark.setValue(previous.current ? 1 : 0); strike.setValue(0);
      textOpacity.setValue(previous.current ? 0.55 : 1); burst.setValue(1); setBursting(false); setSweeping(false);
    });
    return () => subscription.remove();
  }, [burst, mark, scale, strike, textOpacity]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : (event) => {
        event?.stopPropagation?.();
        onPress();
      }}
      style={styles.row}
    >
      <View style={styles.target}>
        {bursting ? <View pointerEvents="none" style={styles.particleOrigin}>
          <MoeCompletionParticles progress={burst} color={tc.success} secondaryColor={tc.tint} variant="checklist" />
        </View> : null}
        <Animated.View style={[
          styles.circle,
          {
            backgroundColor: checked ? tc.success : 'transparent',
            borderColor: checked ? tc.success : tc.secondaryText,
            transform: [{ scale }],
          },
        ]}>
          <Animated.View style={{ opacity: mark, transform: [{ scale: mark }] }}>
            <Check size={15} color={tc.onTint} strokeWidth={3} />
          </Animated.View>
        </Animated.View>
      </View>
      <View style={styles.labelWrap}>
        <Animated.Text numberOfLines={2} style={[
          styles.label,
          {
            color: tc.text,
            opacity: textOpacity,
            textDecorationColor: tc.secondaryText,
            textDecorationLine: checked ? 'line-through' : 'none',
          },
        ]}>
          {label}
        </Animated.Text>
        {sweeping ? <Animated.View pointerEvents="none" style={[
          styles.strike,
          { backgroundColor: tc.secondaryText, transform: [{ scaleX: strike }] },
        ]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 42, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  target: { width: 42, minHeight: 42, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.7, alignItems: 'center', justifyContent: 'center' },
  particleOrigin: { position: 'absolute', left: 21, top: 21, overflow: 'visible' },
  labelWrap: { flex: 1, minWidth: 0, justifyContent: 'center', marginRight: 4 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  strike: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    transformOrigin: 'left center',
  },
});
