import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarDays, Folder, Inbox, Mic, Plus } from 'lucide-react-native';
import { AppState, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Task } from '@mindwtr/core';
import { AppPressable } from '../components/app-pressable';
import { useLanguage } from '../contexts/language-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useThemeTokens } from '../hooks/use-theme-tokens';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { GlassSurface, glassCapabilities } from './glass/GlassSurface';
import { useMoePreferences } from './preferences';
import { moeHaptic } from './haptics';
import { MOE_TABS, moeTabLabel } from './navigation';
import { MOE_VISUAL } from './visual-system';
import { clampLensCenter, lensSlotAt, lensSlotCenter } from './tab-lens';

type Props = BottomTabBarProps & {
  tabBarBottomInset: number;
  openQuickCapture: (options?: { initialProps?: Partial<Task>; autoRecord?: boolean }) => void;
  closeMoreSheet: () => void;
  defaultAutoRecord: boolean;
  captureVisible?: boolean;
};
const BAR = MOE_VISUAL.bar;
const SPRING = MOE_VISUAL.motion.lensSpring;
const TAB_COUNT = MOE_TABS.length;

export function MoeTabBar({ state, navigation, tabBarBottomInset, openQuickCapture, closeMoreSheet, defaultAutoRecord, captureVisible = false }: Props) {
  const tc = useThemeColors();
  const safeArea = useSafeAreaInsets();
  const { isDark } = useThemeTokens();
  const { language } = useLanguage();
  const chinese = language.startsWith('zh');
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const materialLens = preferences.glass === 'liquid' && !reduced && glassCapabilities().liquid;
  const longPress = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [measuredWidth, setMeasuredWidth] = useState(1);
  const selectedIndex = Math.max(0, MOE_TABS.findIndex((name) => name === state.routes[state.index]?.name));
  const width = useSharedValue(1);
  const center = useSharedValue(lensSlotCenter(selectedIndex, 1, TAB_COUNT, BAR.inset));
  const lensWidth = useSharedValue(1 / TAB_COUNT);
  const press = useSharedValue(0);
  const velocity = useSharedValue(0);
  const selected = useSharedValue(selectedIndex);
  const dragging = useSharedValue(false);
  const suppressTap = useSharedValue(false);
  const hidden = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    const app = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => { show.remove(); hide.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    width.value = measuredWidth;
    lensWidth.value = Math.max(1, (measuredWidth - 2 * BAR.inset) / TAB_COUNT - 2) / Math.max(1, measuredWidth);
    selected.value = selectedIndex;
    dragging.value = false;
    velocity.value = 0;
    const destination = lensSlotCenter(selectedIndex, measuredWidth, TAB_COUNT, BAR.inset);
    center.value = reduced ? destination : withSpring(destination, SPRING);
  }, [center, dragging, lensWidth, measuredWidth, reduced, selected, selectedIndex, velocity, width]);

  useEffect(() => {
    const unavailable = keyboardVisible || captureVisible || !appActive;
    dragging.value = false;
    press.value = 0;
    velocity.value = 0;
    const destination = lensSlotCenter(selected.value, width.value, TAB_COUNT, BAR.inset);
    center.value = reduced || unavailable ? destination : withSpring(destination, SPRING);
    hidden.value = reduced ? Number(unavailable) : withTiming(Number(unavailable), { duration: MOE_VISUAL.motion.keyboardMs });
  }, [appActive, captureVisible, center, dragging, hidden, keyboardVisible, press, reduced, selected, velocity, width]);

  const selectTab = useCallback((index: number) => {
    const name = MOE_TABS[index];
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) {
      const destination = lensSlotCenter(selectedIndex, measuredWidth, TAB_COUNT, BAR.inset);
      center.value = reduced ? destination : withSpring(destination, SPRING);
      return;
    }
    closeMoreSheet();
    if (state.routes[state.index]?.key === route.key) return;
    moeHaptic();
    navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
  }, [center, closeMoreSheet, measuredWidth, navigation, reduced, selectedIndex, state]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(appActive && !keyboardVisible && !captureVisible && measuredWidth > 1)
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onStart(() => {
      dragging.value = true;
      suppressTap.value = true;
      press.value = reduced ? 0 : withTiming(1, { duration: MOE_VISUAL.motion.pressMs });
    })
    .onUpdate((event) => {
      if (!dragging.value) return;
      center.value = clampLensCenter(event.x, width.value, TAB_COUNT, BAR.inset);
      velocity.value = reduced ? 0 : Math.max(-3, Math.min(3, event.velocityX / width.value));
    })
    .onEnd((event) => {
      if (!dragging.value) return;
      const index = lensSlotAt(event.x, width.value, TAB_COUNT, BAR.inset);
      const destination = lensSlotCenter(index, width.value, TAB_COUNT, BAR.inset);
      center.value = reduced ? destination : withSpring(destination, SPRING);
      runOnJS(selectTab)(index);
    })
    .onFinalize((_event, succeeded) => {
      if (!succeeded) {
        const destination = lensSlotCenter(selected.value, width.value, TAB_COUNT, BAR.inset);
        center.value = reduced ? destination : withSpring(destination, SPRING);
      }
      dragging.value = false;
      press.value = reduced ? 0 : withTiming(0, { duration: MOE_VISUAL.motion.settleMs });
      velocity.value = reduced ? 0 : withSpring(0, SPRING);
    }), [appActive, captureVisible, center, dragging, keyboardVisible, measuredWidth, press, reduced, selectTab, selected, suppressTap, velocity, width]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * (BAR.height + tabBarBottomInset + 24) }],
  }));
  const lensStyle = useAnimatedStyle(() => ({
    width: lensWidth.value * width.value,
    transform: [
      { translateX: center.value * width.value - lensWidth.value * width.value / 2 },
      { scaleX: reduced ? 1 : 1 + Math.min(0.10, Math.abs(velocity.value) * 0.025) + (materialLens ? 0 : press.value * 0.025) },
      { scaleY: reduced || materialLens ? 1 : 1 - Math.min(0.045, Math.abs(velocity.value) * 0.012) + press.value * 0.015 },
    ],
  }));
  const lens = useMemo(() => ({ center, width: lensWidth, press, velocity, height: (BAR.height - BAR.inset * 2) / BAR.height }), [center, lensWidth, press, velocity]);
  const unavailable = keyboardVisible || captureVisible || !appActive;
  const capture = (audio: boolean) => { closeMoreSheet(); moeHaptic(); openQuickCapture({ autoRecord: audio }); };

  return (
    <View pointerEvents="box-none" style={[styles.container, {
      paddingBottom: Math.max(8, tabBarBottomInset), paddingLeft: Math.max(16, safeArea.left), paddingRight: Math.max(16, safeArea.right),
    }]}>
      <Animated.View style={[styles.shell, shellStyle]} pointerEvents={unavailable ? 'none' : 'auto'}
        accessibilityElementsHidden={unavailable} importantForAccessibility={unavailable ? 'no-hide-descendants' : 'auto'}>
        <GestureDetector gesture={pan}>
          <View style={styles.barFrame} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)} collapsable={false}>
            <GlassSurface mode={preferences.glass} dark={isDark} reducedMotion={reduced} samplingEnabled={!unavailable}
              cornerRadius={BAR.height / 2} lens={lens} style={styles.glass}>
              <Animated.View pointerEvents="none" style={[styles.lens, lensStyle, {
                backgroundColor: materialLens ? 'transparent' : (isDark ? '#FFFFFF18' : '#515CC714'),
                borderColor: materialLens ? 'transparent' : isDark ? '#FFFFFF1C' : '#FFFFFF80',
              }]} />
              <View style={styles.tabs}>
                {MOE_TABS.map((name, index) => {
                  const route = state.routes.find((item) => item.name === name);
                  if (!route) return null;
                  const focused = state.routes[state.index]?.key === route.key;
                  const Icon = name === 'focus' ? CalendarDays : name === 'projects' ? Folder : Inbox;
                  return (
                    <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={moeTabLabel(name, chinese)}
                      testID={`moe-tab-${name}`} style={styles.tab}
                      onPressIn={() => { suppressTap.value = false; press.value = reduced ? 0 : withTiming(1, { duration: MOE_VISUAL.motion.pressMs }); }}
                      onPressOut={() => { if (!dragging.value) press.value = withTiming(0, { duration: MOE_VISUAL.motion.settleMs }); }}
                      onPress={() => { if (!suppressTap.value) selectTab(index); }}
                      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
                      <Icon size={22} strokeWidth={1.9} color={focused ? tc.tint : tc.secondaryText} />
                      <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={[styles.label, { color: focused ? tc.tint : tc.secondaryText }]}>{moeTabLabel(name, chinese)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassSurface>
          </View>
        </GestureDetector>
        <AppPressable accessibilityRole="button" accessibilityLabel={chinese ? '新增任务；长按语音记录' : 'Add task; hold for voice capture'}
          testID="moe-capture" style={[styles.capture, { backgroundColor: tc.tint, shadowColor: tc.tint }]}
          onPressIn={() => { longPress.current = false; }}
          onPress={() => { if (!longPress.current) capture(defaultAutoRecord); }}
          onLongPress={() => { longPress.current = true; capture(!defaultAutoRecord); }}>
          {defaultAutoRecord ? <Mic size={25} strokeWidth={1.9} color={tc.onTint} /> : <Plus size={29} strokeWidth={1.9} color={tc.onTint} />}
        </AppPressable>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 8, alignItems: 'center' },
  shell: { width: '100%', maxWidth: BAR.maxWidth, flexDirection: 'row', gap: BAR.gap, alignItems: 'center' },
  barFrame: { flex: 1, height: BAR.height },
  glass: { flex: 1, height: BAR.height, borderRadius: BAR.height / 2, overflow: 'hidden' },
  tabs: { flex: 1, flexDirection: 'row', padding: BAR.inset },
  lens: { position: 'absolute', left: 0, top: BAR.inset, height: BAR.height - BAR.inset * 2, borderRadius: BAR.height / 2, borderWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  label: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  capture: { height: BAR.captureSize, width: BAR.captureSize, borderRadius: BAR.captureSize / 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 3 },
});
