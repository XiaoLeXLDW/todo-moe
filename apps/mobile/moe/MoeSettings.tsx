import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAppIdentity } from '../lib/app-identity';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useLanguage } from '../contexts/language-context';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences, setMoePreferences, type MoePreferences } from './preferences';
import { glassCapabilities } from './glass/GlassSurface';
import { getMobileAppName } from './brand-text';
import { MOE_VISUAL } from './visual-system';

export function MoeSettings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tc = useThemeColors();
  const { language } = useLanguage();
  const zh = language.startsWith('zh');
  const label = (cn: string, en: string) => zh ? cn : en;
  const preferences = useMoePreferences();
  const reduced = useReducedMotion();
  const router = useRouter();
  const [error, setError] = useState('');
  const capabilities = glassCapabilities();
  const save = (patch: Partial<MoePreferences>) => {
    setError('');
    void setMoePreferences(patch).catch(() => setError(label('设置未保存，请重试。', 'Could not save the preference. Please retry.')));
  };
  const select = <K extends 'theme' | 'glass' | 'motion' | 'haptics'>(key: K, title: string, choices: [MoePreferences[K], string][]) => (
    <View style={[styles.section, { borderColor: tc.border }]}>
      <Text style={[styles.title, { color: tc.text }]} accessibilityRole="header">{title}</Text>
      <View style={styles.choices}>
        {choices.map(([value, text]) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: preferences[key] === value }}
            onPress={() => save({ [key]: value, ...(key === 'theme' ? { followSystem: false } : {}) })}
            style={({ pressed }) => [styles.choice, { backgroundColor: preferences[key] === value ? tc.tint : tc.inputBg, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: preferences[key] === value ? tc.onTint : tc.text }}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  const toggle = (key: 'followSystem' | 'celebration' | 'nextActionPrompt', text: string) => (
    <View style={[styles.toggle, { borderColor: tc.border }]}>
      <Text style={[styles.toggleText, { color: tc.text }]}>{text}</Text>
      <Switch accessibilityLabel={text} value={preferences[key]} onValueChange={(value) => save({ [key]: value })} />
    </View>
  );
  const navigate = (about: boolean) => { onClose(); router.push(about ? { pathname: '/settings', params: { settingsScreen: 'about' } } : '/settings'); };
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType={reduced ? 'none' : 'slide'} presentationStyle="pageSheet">
      <SafeAreaView style={[styles.root, { backgroundColor: tc.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.heading, { color: tc.text }]} accessibilityRole="header">{label(`${getMobileAppName()} 设置`, `${getMobileAppName()} settings`)}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={{ color: tc.tint }}>{label('完成', 'Done')}</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {select('theme', label('主题', 'Theme'), [['soft', label('柔白', 'Soft white')], ['ink', label('墨色', 'Ink')], ['family', label('家族色', 'Family')]])}
          {toggle('followSystem', label('跟随系统明暗', 'Follow system appearance'))}
          {select('glass', label('玻璃效果', 'Glass'), [['off', label('关闭', 'Off')], ['soft', label('柔和', 'Soft')], ['liquid', label('液态', 'Liquid')]])}
          <Text style={[styles.note, { color: tc.secondaryText }]}>
            {label('液态为实验效果；设备不支持时自动使用柔和或实底。动态色暂用固定主题色。', 'Liquid is experimental; unsupported devices use soft glass or an opaque surface. Dynamic color currently uses fixed theme colors.')}
            {!capabilities.liquid ? ` ${String(capabilities.reason ?? '')}` : ''}
          </Text>
          {select('motion', label('动画强度', 'Motion'), [['simple', label('简洁', 'Simple')], ['standard', label('标准', 'Standard')], ['lively', label('活泼', 'Lively')]])}
          <Text style={[styles.note, { color: tc.secondaryText }]}>{label('同时尊重系统减少动画；保存和撤销无需等待动画。', 'System Reduce Motion is respected. Saving and Undo never wait for animation.')}</Text>
          {select('haptics', label('触感反馈', 'Haptics'), [['off', label('关闭', 'Off')], ['light', label('轻', 'Light')]])}
          {toggle('celebration', label('清单完成庆祝', 'Celebrate completed lists'))}
          {toggle('nextActionPrompt', label('清单下一步提示', 'Suggest the next action after completion'))}
          {error ? <Text accessibilityRole="alert" style={{ color: tc.danger }}>{error}</Text> : null}
          {getAppIdentity().channel === 'development' ? (
            <Text style={[styles.note, { color: tc.warning }]}>{label('Dev 数据保存在独立应用中；云端空间不会自动隔离，请仅连接测试目标。', 'Dev uses separate app data. Cloud storage is not automatically isolated; connect only a test target.')}</Text>
          ) : null}
          <Pressable style={[styles.link, { backgroundColor: tc.cardBg }]} onPress={() => navigate(false)} accessibilityRole="button">
            <Text style={{ color: tc.tint }}>{label('同步、数据与高级设置 →', 'Sync, data and advanced settings →')}</Text>
          </Pressable>
          <Pressable style={[styles.link, { backgroundColor: tc.cardBg }]} onPress={() => navigate(true)} accessibilityRole="button">
            <Text style={{ color: tc.tint }}>{label('关于、版本与来源 →', 'About, version and sources →')}</Text>
          </Pressable>
          <Text style={[styles.note, { color: tc.secondaryText }]}>{label('这些外观偏好仅保存在本机，不参与任务同步。', 'Presentation preferences stay on this device and do not sync with tasks.')}</Text>
          {getAppIdentity().channel === 'development' ? <Pressable style={[styles.link, { backgroundColor: tc.cardBg }]} onPress={() => { onClose(); router.push('/moe-glass-lab' as never); }} accessibilityRole="button"><Text style={{ color: tc.tint }}>{label('Dev：玻璃与滚动验证页 →', 'Dev: glass and scrolling lab →')}</Text></Pressable> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 }, header: { width: '100%', maxWidth: MOE_VISUAL.contentMaxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: MOE_VISUAL.pageGutter }, heading: { flex: 1, fontSize: 22, fontWeight: '700' },
  close: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center' }, body: { width: '100%', maxWidth: MOE_VISUAL.contentMaxWidth, alignSelf: 'center', padding: MOE_VISUAL.pageGutter, paddingBottom: 48, gap: 12 },
  section: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth }, title: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 48, minWidth: 80, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  toggle: { flexDirection: 'row', minHeight: 56, alignItems: 'center', gap: 12 }, toggleText: { flex: 1, fontSize: 16 },
  note: { fontSize: 13, lineHeight: 20 }, link: { minHeight: 56, padding: 16, justifyContent: 'center', borderRadius: 16 },
});
