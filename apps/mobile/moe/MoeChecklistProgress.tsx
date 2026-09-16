import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ListChecks } from 'lucide-react-native';

import type { ThemeColors } from '../hooks/use-theme-colors';
import { useReducedMotion } from '../hooks/use-reduced-motion';

type Progress = { completed: number; percent: number; total: number };

export function MoeChecklistProgress({ disabled = false, expanded, label, onPress, progress, tc }: {
  disabled?: boolean;
  expanded: boolean;
  label: string;
  onPress: () => void;
  progress: Progress;
  tc: ThemeColors;
}) {
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(progress.percent)).current;
  const countScale = useRef(new Animated.Value(1)).current;
  const chevron = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    fill.stopAnimation();
    countScale.stopAnimation();
    if (reduced) {
      fill.setValue(progress.percent);
      countScale.setValue(1);
      return;
    }
    countScale.setValue(0.82);
    Animated.parallel([
      Animated.spring(fill, {
        toValue: progress.percent,
        damping: 18,
        stiffness: 210,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(countScale, {
        toValue: 1,
        damping: 13,
        stiffness: 260,
        mass: 0.55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [countScale, fill, progress.completed, progress.percent, reduced]);

  useEffect(() => {
    chevron.stopAnimation();
    if (reduced) chevron.setValue(expanded ? 1 : 0);
    else Animated.spring(chevron, {
      toValue: expanded ? 1 : 0,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [chevron, expanded, reduced]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      hitSlop={4}
      onPress={(event) => {
        event?.stopPropagation?.();
        if (!disabled) onPress();
      }}
      style={({ pressed }) => [styles.root, pressed ? styles.pressed : null]}
    >
      <ListChecks size={15} color={tc.tint} strokeWidth={2.2} />
      <View style={[styles.track, { backgroundColor: tc.border }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: progress.completed === progress.total ? tc.success : tc.tint,
              transform: [{ scaleX: fill }],
            },
          ]}
        />
      </View>
      <Animated.View style={{ transform: [{ scale: countScale }] }}>
        <Text style={[styles.count, { color: tc.secondaryText }]}>
          {progress.completed}/{progress.total}
        </Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ rotate: chevron.interpolate({
        inputRange: [0, 1], outputRange: ['0deg', '180deg'], extrapolate: 'clamp',
      }) }] }}>
        <ChevronDown size={15} color={tc.secondaryText} strokeWidth={2.2} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 3,
    paddingHorizontal: 5,
    marginLeft: -5,
    borderRadius: 10,
  },
  pressed: { opacity: 0.72 },
  track: { width: 46, height: 4, borderRadius: 999, overflow: 'hidden' },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    transformOrigin: 'left center',
  },
  count: { minWidth: 27, fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
