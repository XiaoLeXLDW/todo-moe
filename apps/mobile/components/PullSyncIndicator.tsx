import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type PullSyncIndicatorState = 'idle' | 'syncing' | 'success' | 'error';

type PullSyncIndicatorProps = {
  state: PullSyncIndicatorState;
};

export function PullSyncIndicator({ state }: PullSyncIndicatorProps) {
  const tc = useThemeColors();
  const reduced = useReducedMotion();
  const phase = useRef(new Animated.Value(state === 'idle' ? 0 : 1)).current;

  useEffect(() => {
    phase.stopAnimation();
    if (state === 'idle' || reduced) {
      phase.setValue(state === 'idle' ? 0 : 1);
      return;
    }
    phase.setValue(0);
    const animation = state === 'success'
      ? Animated.spring(phase, { toValue: 1, damping: 9, stiffness: 250, mass: 0.55, useNativeDriver: true })
      : Animated.timing(phase, { toValue: 1, duration: state === 'error' ? 340 : 520, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [phase, reduced, state]);

  if (state === 'idle') return null;

  const color = state === 'error'
    ? tc.danger
    : state === 'success'
      ? tc.success
      : tc.tint;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View testID="pull-sync-motion-bar" style={[styles.bar, { backgroundColor: color,
        opacity: phase.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
        transform: [
          { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
          { translateX: state === 'error'
            ? phase.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -7, 6, -3, 0] })
            : 0 },
          { scaleX: phase.interpolate({ inputRange: [0, 1], outputRange: state === 'success' ? [0.82, 1] : [0.35, 1] }) },
        ],
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'center',
    paddingTop: 0,
  },
  bar: {
    width: 112,
    height: 4,
    borderRadius: 999,
  },
});
