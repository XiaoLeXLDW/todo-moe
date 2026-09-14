import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { resolveMoeCompletionMotion } from './completion-motion';

// Lightweight render hosts omit the native wrapper; Android always uses it.
const AnimatedPath = (typeof Animated.createAnimatedComponent === 'function'
  ? Animated.createAnimatedComponent(Path) : Path) as Animated.AnimatedComponent<typeof Path>;

/** One check, shared by the retained row and its departing snapshot. */
export function MoeCompletionCheck({ reveal, emphasis, motion, color, foreground, size = 24 }: {
  reveal: Animated.Value;
  emphasis: Animated.Value;
  motion: ReturnType<typeof resolveMoeCompletionMotion>;
  color: string;
  foreground: string;
  size?: number;
}) {
  return <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={[styles.check, { width: size, height: size,
      transform: [{ scale: emphasis.interpolate({ inputRange: [0, 0.38, 0.76, 1],
        outputRange: [motion.pressedScale, motion.completedScale, motion.reduced ? 1 : 0.97, 1] }) }],
    }]}>
    {/* Keep JS-driven SVG reveal separate from the native-driven spring scale. */}
    <Animated.View style={{ ...StyleSheet.absoluteFillObject, borderRadius: size * 0.375, backgroundColor: color,
      opacity: reveal.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }) }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath d="M 6.5 12.3 L 10.2 16 L 17.8 8.3" fill="none" stroke={foreground}
        strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="17 17"
        strokeDashoffset={reveal.interpolate({ inputRange: [0, 0.85, 1], outputRange: [17, 0, 0] })} />
    </Svg>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({ check: { position: 'absolute', left: 0, top: 0 } });
