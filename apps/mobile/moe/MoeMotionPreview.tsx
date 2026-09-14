import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useLanguage } from '../contexts/language-context';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';
import { MoeCheckButton } from './MoeCheckButton';
import { MoeCelebrationVisual } from './MoeCelebrationVisual';
import { MoeCelebrationLayer, MoeCelebrationStage } from './MoeCelebrationLayer';
import { AppPressable } from '../components/app-pressable';
import { styles as settingsStyles } from '../components/settings/settings.styles';

/** Settings-only fake content. No completion events, store or persisted task IDs. */
export function MoeMotionPreview() {
  const tc = useThemeColors();
  const { language } = useLanguage();
  const zh = language.startsWith('zh');
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
  const [done, setDone] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const celebration = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopCelebration = useCallback(() => {
    clearTimeout(timer.current);
    celebration.stopAnimation();
    celebration.setValue(1);
    setCelebrating(false);
  }, [celebration]);
  useEffect(() => {
    progress.stopAnimation();
    if (motion.reduced) { progress.setValue(done ? 1 : 0); return; }
    const animation = Animated.timing(progress, { toValue: done ? 1 : 0,
      duration: done ? motion.rowExitMs : motion.enterMs, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [done, motion.reduced, motion.rowExitMs, motion.enterMs, progress]);
  useEffect(() => {
    // Changing modes starts a fresh demonstration.
    setDone(false);
    stopCelebration();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      progress.stopAnimation(); progress.setValue(0); setDone(false); stopCelebration();
    });
    return () => { subscription.remove(); clearTimeout(timer.current); celebration.stopAnimation(); progress.stopAnimation(); };
  }, [preferences.motion, reduced, progress, celebration, stopCelebration]);
  const undo = () => { stopCelebration(); setDone(false); };
  const completeList = () => {
    stopCelebration();
    setDone(true);
    if (!preferences.celebration) return;
    setCelebrating(true);
    celebration.setValue(motion.reduced ? 1 : 0);
    if (!motion.reduced) Animated.timing(celebration, { toValue: 1, duration: motion.celebrationMs, easing: value => value, useNativeDriver: true }).start();
    timer.current = setTimeout(() => setCelebrating(false), motion.celebrationMs);
  };
  return <View style={[settingsStyles.settingCard, styles.card, { backgroundColor: tc.cardBg }]}>
    <Text style={{ color: tc.text, fontWeight: '700' }}>{zh ? '立即试试' : 'Try the motion'}</Text>
    <Text style={{ color: tc.secondaryText, marginTop: 4 }}>{zh ? '仅为演示，不会创建真实任务' : 'Preview only — no real tasks are created'}</Text>
    <Animated.View style={[styles.row, { opacity: progress.interpolate({ inputRange: [0, motion.confirmationHold, 1], outputRange: [1, 1, 0.5] }),
      transform: [{ translateX: progress.interpolate({ inputRange: [0, motion.confirmationHold, 1], outputRange: [0, 0, motion.travel] }) }] }]}>
      <MoeCheckButton checked={done} disabled={false} tc={tc} label={zh ? '演示任务完成' : 'Complete demo task'} onPress={() => { stopCelebration(); setDone(value => !value); }} />
      <Text style={{ color: tc.text, textDecorationLine: done ? 'line-through' : 'none' }}>{zh ? '给今天一个小小的完成' : 'A little win for today'}</Text>
    </Animated.View>
    <View style={styles.actions}>
      <AppPressable accessibilityRole="button" onPress={completeList} style={[settingsStyles.pickerOption, styles.button, { borderColor: tc.border, backgroundColor: tc.inputBg }]}><Text style={{ color: tc.tint }}>{zh ? '演示清单完成' : 'Complete demo list'}</Text></AppPressable>
      <AppPressable accessibilityRole="button" onPress={undo} style={[settingsStyles.pickerOption, styles.button, { borderColor: tc.border, backgroundColor: tc.inputBg }]}><Text style={{ color: tc.tint }}>{zh ? '撤销 / 重试' : 'Undo / retry'}</Text></AppPressable>
    </View>
    {celebrating ? <MoeCelebrationLayer><MoeCelebrationStage>
      <MoeCelebrationVisual progress={celebration} motion={motion} tc={tc} label={zh ? '✓ 演示清单已完成' : '✓ Demo list completed'} title={zh ? '我的演示清单' : 'My demo list'} />
    </MoeCelebrationStage></MoeCelebrationLayer> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 20, overflow: 'visible' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, overflow: 'visible' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { minHeight: 48, justifyContent: 'center', flexGrow: 1 },
});
