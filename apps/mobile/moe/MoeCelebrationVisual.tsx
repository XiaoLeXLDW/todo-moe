import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ThemeColors } from '../hooks/use-theme-colors';
import { MOE_COMPLETION_MOTION, resolveMoeCompletionMotion } from './completion-motion';
import { colorContrast } from './themes';
import { MoeCompletionParticles } from './MoeCompletionParticles';

/** The real event and settings demo render precisely the same visual. No timers or events. */
export function MoeCelebrationVisual({ progress, motion, tc, label, title }: {
  progress: Animated.Value; motion: ReturnType<typeof resolveMoeCompletionMotion>;
  tc: ThemeColors; label: string; title: string;
}) {
  const checkColor = colorContrast(tc.success, '#FFFFFF') >= colorContrast(tc.success, '#000000') ? '#FFFFFF' : '#000000';
  const maximal = motion.particles && motion.particleProfile === 'maximal';
  const emblemSize = maximal ? 112 : 80;
  const emblemCheckSize = maximal ? 72 : 48;
  const opacity = motion.reduced ? 1 : progress.interpolate({
    inputRange: [0, MOE_COMPLETION_MOTION.celebrationFadeInAt, MOE_COMPLETION_MOTION.celebrationFadeOutAt, 1],
    outputRange: [0, 1, 1, 0],
  });
  return <View pointerEvents="none" style={styles.host}>
    {!motion.reduced ? <View style={[styles.blast, { height: maximal ? 230 : 150 }]} pointerEvents="none">
      {motion.particles ? <View style={styles.origin} pointerEvents="none">
        <MoeCompletionParticles progress={progress} color={tc.success} secondaryColor={tc.tint} variant="list" profile={motion.particleProfile} />
      </View> : null}
      <Animated.View testID="moe-celebration-emblem" pointerEvents="none" accessible={false}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.emblem, { width: emblemSize, height: emblemSize, borderRadius: maximal ? 36 : 26, backgroundColor: tc.success,
          opacity: progress.interpolate(maximal
            ? { inputRange: [0, .025, .84, 1], outputRange: [0, 1, 1, 0] }
            : { inputRange: [0, .06, .78, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { scale: progress.interpolate(maximal
              ? { inputRange: [0, .07, .16, .32, .62, 1], outputRange: [.25, 1.55, .92, 1.18, 1, 1] }
              : { inputRange: [0, .09, .19, .3, 1], outputRange: [.45, 1.3, .94, 1, 1] }) },
            { rotate: progress.interpolate(maximal
              ? { inputRange: [0, .1, .24, .42, 1], outputRange: ['-22deg', '9deg', '-3deg', '0deg', '0deg'] }
              : { inputRange: [0, .12, .3, 1], outputRange: ['-12deg', '5deg', '0deg', '0deg'] }) },
          ],
        }]}>
        <Check size={emblemCheckSize} strokeWidth={maximal ? 3.2 : 2.8} color={checkColor} />
      </Animated.View>
    </View> : null}
    <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: tc.cardBg, borderColor: tc.border, opacity },
      !motion.reduced && { transform: [
        { translateY: progress.interpolate(maximal
          ? { inputRange: [0, .16, .76, 1], outputRange: [28, 0, 0, -12] }
          : { inputRange: [0, .2, .72, 1], outputRange: [12, 0, 0, -6] }) },
        { scale: progress.interpolate(maximal
          ? { inputRange: [0, .14, .28, .48, 1], outputRange: [.82, 1.08, .98, 1, 1] }
          : { inputRange: [0, .2, .34, 1], outputRange: [.94, 1.02, 1, 1] }) },
      ] }]}>
      <View style={styles.copy}>
        <Text style={{ color: tc.text, fontSize: 19, fontWeight: '800', textAlign: 'center' }}>{motion.reduced ? label : label.replace(/^✓\s*/, '')}</Text>
        <Text style={{ color: tc.secondaryText, marginTop: 5, textAlign: 'center' }} numberOfLines={2}>{title}</Text>
      </View>
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({ host: { alignItems: 'center', maxWidth: 340, width: '100%', overflow: 'visible' }, card: {
  borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingVertical: 16,
  maxWidth: 340, alignItems: 'center',
}, blast: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
origin: { position: 'absolute', left: '50%', top: '50%', overflow: 'visible' },
emblem: { alignItems: 'center', justifyContent: 'center' },
copy: { flexShrink: 1 } });
