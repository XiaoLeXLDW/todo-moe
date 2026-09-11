import React, { useEffect, useRef, useState } from 'react';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarDays, Folder, Inbox, Mic, Plus } from 'lucide-react-native';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Task } from '@mindwtr/core';
import { AppPressable } from '../components/app-pressable';
import { useLanguage } from '../contexts/language-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useThemeTokens } from '../hooks/use-theme-tokens';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { GlassSurface } from './glass/GlassSurface';
import { useMoePreferences } from './preferences';
import { moeHaptic } from './haptics';
import { MOE_TABS, moeTabLabel } from './navigation';

type Props = BottomTabBarProps & {
  tabBarBottomInset: number;
  openQuickCapture: (options?: { initialProps?: Partial<Task>; autoRecord?: boolean }) => void;
  closeMoreSheet: () => void;
  defaultAutoRecord: boolean;
};
export function MoeTabBar({ state, navigation, tabBarBottomInset, openQuickCapture, closeMoreSheet, defaultAutoRecord }: Props) {
  const tc = useThemeColors();
  const safeArea = useSafeAreaInsets();
  const { isDark } = useThemeTokens();
  const { language } = useLanguage();
  const chinese = language.startsWith('zh');
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const longPress = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  const capture = (audio: boolean) => { closeMoreSheet(); moeHaptic(); openQuickCapture({ autoRecord: audio }); };
  return (
    <View pointerEvents="box-none" style={[styles.container, { paddingBottom: Math.max(8, tabBarBottomInset), paddingLeft: Math.max(12, safeArea.left), paddingRight: Math.max(12, safeArea.right) }]}>
      <GlassSurface mode={preferences.glass} dark={isDark} reducedMotion={reduced} style={styles.glass}>
        <View style={styles.tabs}>
          {MOE_TABS.map((name) => {
            const route = state.routes.find((item) => item.name === name);
            if (!route) return null;
            const focused = state.routes[state.index]?.key === route.key;
            const Icon = name === 'focus' ? CalendarDays : name === 'projects' ? Folder : Inbox;
            return (
              <AppPressable key={name} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={moeTabLabel(name, chinese)}
                testID={`moe-tab-${name}`} style={[styles.tab, focused && { backgroundColor: isDark ? '#FFFFFF14' : '#405ECB12' }]}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (event.defaultPrevented) return;
                  closeMoreSheet();
                  if (focused) return;
                  moeHaptic();
                  navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
                }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
                <Icon size={23} strokeWidth={focused ? 2.5 : 1.8} color={focused ? tc.tint : tc.secondaryText} />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.35} style={[styles.label, { color: focused ? tc.tint : tc.secondaryText, fontWeight: focused ? '700' : '500' }]}>{moeTabLabel(name, chinese)}</Text>
              </AppPressable>
            );
          })}
        </View>
      </GlassSurface>
      <AppPressable accessibilityRole="button" accessibilityLabel={chinese ? '新增任务；长按语音记录' : 'Add task; hold for voice capture'}
        testID="moe-capture" style={[styles.capture, { backgroundColor: tc.tint }]}
        onPressIn={() => { longPress.current = false; }}
        onPress={() => { if (!longPress.current) capture(defaultAutoRecord); }}
        onLongPress={() => { longPress.current = true; capture(!defaultAutoRecord); }}>
        {defaultAutoRecord ? <Mic size={26} color={tc.onTint} /> : <Plus size={30} color={tc.onTint} />}
      </AppPressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 6, paddingHorizontal: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  glass: { flex: 1, height: 64, borderRadius: 26, overflow: 'hidden' }, tabs: { flex: 1, flexDirection: 'row', padding: 4, gap: 2 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 22, minWidth: 0 },
  label: { fontSize: 11, marginTop: 3 }, capture: { height: 56, width: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
