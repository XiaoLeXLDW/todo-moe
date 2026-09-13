import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { MOE_COMPLETION_MOTION, resolveMoeCompletionMotion } from './completion-motion';
import { MoeCompletionBurst } from './MoeCheckButton';
import { colorContrast } from './themes';

/** The real event and settings demo render precisely the same visual. No timers or events. */
export function MoeCelebrationVisual({ progress, motion, tc, label, title }: {
  progress: Animated.Value; motion: ReturnType<typeof resolveMoeCompletionMotion>;
  tc: ThemeColors; label: string; title: string;
}) {
  const size = motion.celebrationSize;
  const checkColor = colorContrast(tc.success, '#FFFFFF') >= colorContrast(tc.success, '#000000') ? '#FFFFFF' : '#000000';
  const opacity = motion.reduced ? 1 : progress.interpolate({
    inputRange: [0, MOE_COMPLETION_MOTION.celebrationFadeInAt, MOE_COMPLETION_MOTION.celebrationFadeOutAt, 1],
    outputRange: [0, 1, 1, 0],
  });
  return <View pointerEvents="none" style={styles.host}>
    <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.success, opacity }]}>
      {!motion.reduced ? <View pointerEvents="none" testID="moe-celebration-emblem" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
        <MoeCompletionBurst progress={progress} motion={{ ...motion, burstSize: size, burstParticles: motion.celebrationParticles }} color={tc.success} />
        <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tc.success, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: progress.interpolate({ inputRange: [0, .18, .32, 1], outputRange: [.5, motion.completedScale, 1, 1] }) }] }}>
          <Check size={32} strokeWidth={3} color={checkColor} />
        </Animated.View>
      </View> : null}
      <Text style={{ color: tc.success, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      <Text style={{ color: tc.text, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>{title}</Text>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ host: { alignItems: 'center', overflow: 'visible' }, card: {
  borderRadius: 24, borderWidth: 1, padding: 8, maxWidth: 340, alignItems: 'center', overflow: 'visible',
} });
