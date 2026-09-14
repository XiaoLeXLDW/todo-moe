import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { MOE_COMPLETION_MOTION, resolveMoeCompletionMotion } from './completion-motion';
import { colorContrast } from './themes';

/** The real event and settings demo render precisely the same visual. No timers or events. */
export function MoeCelebrationVisual({ progress, motion, tc, label, title }: {
  progress: Animated.Value; motion: ReturnType<typeof resolveMoeCompletionMotion>;
  tc: ThemeColors; label: string; title: string;
}) {
  const checkColor = colorContrast(tc.success, '#FFFFFF') >= colorContrast(tc.success, '#000000') ? '#FFFFFF' : '#000000';
  const opacity = motion.reduced ? 1 : progress.interpolate({
    inputRange: [0, MOE_COMPLETION_MOTION.celebrationFadeInAt, MOE_COMPLETION_MOTION.celebrationFadeOutAt, 1],
    outputRange: [0, 1, 1, 0],
  });
  return <View pointerEvents="none" style={styles.host}>
    <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.border, opacity },
      !motion.reduced && { transform: [
        { translateY: progress.interpolate({ inputRange: [0, .2, .72, 1], outputRange: [12, 0, 0, -6] }) },
        { scale: progress.interpolate({ inputRange: [0, .2, .34, 1], outputRange: [.94, 1.02, 1, 1] }) },
      ] }]}>
      {!motion.reduced ? <View pointerEvents="none" testID="moe-celebration-emblem" accessible={false}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.emblem, { backgroundColor: tc.success }]}>
        <Check size={25} strokeWidth={2.7} color={checkColor} />
      </View> : null}
      <View style={styles.copy}>
        <Text style={{ color: tc.text, fontSize: 16, fontWeight: '700' }}>{motion.reduced ? label : label.replace(/^✓\s*/, '')}</Text>
        <Text style={{ color: tc.secondaryText, marginTop: 3 }} numberOfLines={2}>{title}</Text>
      </View>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ host: { alignItems: 'center' }, card: {
  borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingVertical: 16,
  maxWidth: 340, flexDirection: 'row', alignItems: 'center', gap: 12,
}, emblem: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
copy: { flexShrink: 1 } });
