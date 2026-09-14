import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/use-theme-colors';
import { useTheme } from '../contexts/theme-context';
import { useLanguage } from '../contexts/language-context';
import { useMoePreferences, setMoePreferences, type MoePreferences } from './preferences';
import { useSystemPalette } from './system-palette';
import { glassCapabilities } from './glass/GlassSurface';
import { SettingsTopBar } from '../components/settings/settings.shell';
import { useSettingsScrollContent } from '../components/settings/settings.hooks';
import { styles as settingsStyles } from '../components/settings/settings.styles';
import { SettingToggleRow } from '../components/settings/setting-row';
import { MoeMotionPreview } from './MoeMotionPreview';
import { customTheme, mixColor } from './themes';
import { moeHaptic, type MoeHapticEvent } from './haptics';
import { AppPressable } from '../components/app-pressable';

function usePresentationEditor() {
  const preferences = useMoePreferences(); const tc = useThemeColors();
  const { language } = useLanguage(); const zh = language.startsWith('zh');
  const label = (cn: string, en: string) => zh ? cn : en;
  const [error, setError] = useState('');
  const save = (patch: Partial<MoePreferences>) => { setError(''); void setMoePreferences(patch).catch(() => setError(label('设置未保存，请重试。', 'Could not save the preference. Please retry.'))); };
  return { preferences, tc, label, save, error };
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const tc = useThemeColors();
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[settingsStyles.sectionTitle, { color: tc.secondaryText }]}>{title}</Text>
    <View style={[settingsStyles.settingCard, { backgroundColor: tc.cardBg }]}>{children}</View>
  </View>;
}
function Choices({ title, selected, choices, onSelect, description }: { title: string; selected: string; choices: [string, string][]; onSelect: (value: string) => void; description?: string }) {
  const tc = useThemeColors();
  return <Section title={title}><View style={settingsStyles.settingRowColumn}>
    {description ? <Text style={[settingsStyles.description, { color: tc.secondaryText }]}>{description}</Text> : null}
    <View accessibilityRole="radiogroup" accessibilityLabel={title} style={styles.choices}>
    {choices.map(([value, name]) => <AppPressable key={value} accessibilityRole="radio" accessibilityState={{ checked: value === selected }} onPress={() => { moeHaptic('selectionTick'); onSelect(value); }}
      style={[settingsStyles.pickerOption, styles.choice, { backgroundColor: selected === value ? tc.inputBg : tc.cardBg, borderColor: selected === value ? tc.tint : tc.border }]}>
      <Text style={[settingsStyles.pickerOptionText, styles.choiceText, { color: selected === value ? tc.tint : tc.text }]}>{name}</Text>
    </AppPressable>)}
  </View></View></Section>;
}
function Page({ title, children, error }: { title: string; children: React.ReactNode; error: string }) {
  const tc = useThemeColors();
  const scrollContentStyle = useSettingsScrollContent();
  return <SafeAreaView style={[settingsStyles.container, { backgroundColor: tc.bg }]} edges={['bottom']}><SettingsTopBar title={title} />
    <ScrollView style={settingsStyles.scrollView} keyboardShouldPersistTaps="handled" contentContainerStyle={scrollContentStyle}>{children}{error ? <Text accessibilityRole="alert" style={[settingsStyles.description, { color: tc.danger }]}>{error}</Text> : null}</ScrollView></SafeAreaView>;
}
const PRESETS = ['#6750A4', '#365DB5', '#166D68', '#A14669', '#AD542A', '#647337'];
function hueColor(hue: number) {
  const chroma = .62, x = chroma * (1 - Math.abs((hue / 60) % 2 - 1)), m = .18;
  const channels = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return '#' + channels.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function seedHue(seed: string) {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(seed.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b), delta = max - Math.min(r, g, b);
  if (!delta || !Number.isFinite(delta)) return 270;
  const hue = (max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  return Math.round((hue + 360) % 360);
}
export function MoeAppearanceSettings() {
  const { preferences, tc, label, save, error } = usePresentationEditor();
  const { isDark } = useTheme(); const system = useSystemPalette();
  const [input, setInput] = useState(preferences.customColor ?? '#6750A4');
  const [hue, setHue] = useState(seedHue(preferences.customColor ?? '#6750A4')); const [width, setWidth] = useState(1);
  useEffect(() => { const seed = preferences.customColor ?? '#6750A4'; setInput(seed); setHue(seedHue(seed)); }, [preferences.customColor]);
  const valid = /^#[a-f0-9]{6}$/i.test(input);
  const preview = customTheme(valid ? input : preferences.customColor ?? '#6750A4', isDark);
  const commit = (seed: string) => { setInput(seed); setHue(seedHue(seed)); save({ colorSource: 'custom', customColor: seed }); };
  const chooseHue = (next: number) => { setHue(next); setInput(hueColor(next)); };
  return <Page title={label('外观', 'Appearance')} error={error}>
    <Choices title={label('明暗模式', 'Appearance mode')} selected={preferences.appearance ?? 'system'} choices={[
      ['system', label('跟随系统', 'System')], ['light', label('浅色', 'Light')], ['dark', label('深色', 'Dark')],
    ]} onSelect={(value) => save({ appearance: value as MoePreferences['appearance'] })} />
    <Choices title={label('配色来源', 'Color source')} selected={preferences.colorSource ?? 'dynamic'} choices={[
      ['dynamic', label('系统动态色', 'System colors')], ['custom', label('自定义颜色', 'Custom color')],
    ]} onSelect={(value) => save({ colorSource: value as MoePreferences['colorSource'] })}
      description={preferences.colorSource === 'custom' ? label('点选色相或输入 HEX，预览后应用。', 'Choose a hue or enter HEX, then preview and apply.') : system.supported ? label('使用 Android 系统调色板，无需读取壁纸。页面和玻璃底栏使用同一配色。', 'Uses the Android palette without reading your wallpaper. Pages and the glass bar share these colors.') : label('此设备或运行环境未提供系统动态色，当前使用默认配色；也可自选颜色。', 'System colors are unavailable in this environment. A default palette is used, or choose a custom color.')} />
    {preferences.colorSource === 'custom' ? <Section title={label('选择主色', 'Choose an accent')}><View style={styles.custom}>
      <View style={styles.choices}>{PRESETS.map((color) => <Pressable key={color} hitSlop={2} accessibilityRole="button" accessibilityLabel={`${label('主色', 'Accent')} ${color}`} onPress={() => commit(color)} style={[styles.swatch, { backgroundColor: color, borderColor: input === color ? tc.text : 'transparent' }]} />)}</View>
      <Pressable accessibilityRole="adjustable" accessibilityLabel={label('色相', 'Hue')} accessibilityValue={{ min: 0, max: 359, now: hue }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => chooseHue((hue + (event.nativeEvent.actionName === 'increment' ? 15 : 345)) % 360)}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)} onPress={(event) => chooseHue(Math.min(359, Math.max(0, Math.round(event.nativeEvent.locationX / width * 359))))} style={styles.hue}>
        <View pointerEvents="none" style={styles.hueStrip}>{Array.from({ length: 24 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: hueColor(i * 15) }} />)}</View>
      </Pressable>
      <View style={styles.choices}>{[-.35, -.15, 0, .25, .5].map((amount) => { const color = mixColor(hueColor(hue), amount < 0 ? '#000000' : '#FFFFFF', Math.abs(amount)); return <Pressable key={amount} hitSlop={2} accessibilityRole="button" accessibilityLabel={`${label('色阶', 'Tone')} ${color}`} onPress={() => setInput(color)} style={[styles.swatch, { backgroundColor: color, borderColor: 'transparent' }]} />; })}</View>
      <TextInput accessibilityLabel={label('主色 HEX', 'Accent HEX')} value={input} onChangeText={setInput} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#6750A4" placeholderTextColor={tc.secondaryText} style={[styles.hexInput, { backgroundColor: tc.inputBg, color: tc.text, borderColor: valid ? tc.border : tc.danger }]} onSubmitEditing={() => { if (valid) commit(input.toUpperCase()); }} />
      {!valid ? <Text style={{ color: tc.danger }}>{label('请输入 #RRGGBB 格式的颜色。', 'Enter a color in #RRGGBB format.')}</Text> : null}
      <View pointerEvents="none" style={[styles.preview, { backgroundColor: preview.bg }]}><Text style={{ color: preview.text, fontWeight: '700' }}>{label('配色预览', 'Color preview')}</Text><Text style={{ color: preview.secondaryText }}>{label('清晰的内容，轻盈的色彩。', 'Clear content, a touch of color.')}</Text><View style={[styles.previewButton, { backgroundColor: preview.tint }]}><Text style={{ color: preview.onTint }}>{label('完成', 'Done')}</Text></View></View>
      <AppPressable accessibilityRole="button" accessibilityState={{ disabled: !valid }} disabled={!valid} onPress={() => commit(input.toUpperCase())} style={[settingsStyles.pickerOption, styles.action, { backgroundColor: tc.tint, borderColor: tc.tint, opacity: valid ? 1 : .4 }]}><Text style={[settingsStyles.pickerOptionText, styles.choiceText, { color: tc.onTint }]}>{label('应用颜色', 'Apply color')}</Text></AppPressable>
    </View></Section> : null}
    <Choices title={label('玻璃效果', 'Glass')} selected={preferences.glass} choices={[
      ['off', label('关闭', 'Off')], ['soft', label('柔和', 'Soft')], ['liquid', label('晶体', 'Crystal')],
    ]} onSelect={(value) => save({ glass: value as MoePreferences['glass'] })}
      description={label('不支持液态效果的设备自动使用兼容材质。', 'Devices without liquid effects use a compatible surface.') + (!glassCapabilities().liquid ? ` ${label('当前使用兼容效果。', 'Compatibility mode is active.')}` : '')} />
  </Page>;
}
export function MoeMotionSettings() {
  const { preferences, tc, label, save, error } = usePresentationEditor();
  return <Page title={label('动画与触感', 'Motion & haptics')} error={error}>
    <Choices title={label('动画强度', 'Motion')} selected={preferences.motion} choices={[
      ['simple', label('简洁', 'Reduced')], ['standard', label('标准', 'Standard')], ['lively', label('增强', 'Enhanced')], ['maximal', label('夸张', 'Maximal')],
    ]} onSelect={(value) => save({ motion: value as MoePreferences['motion'] })}
      description={label('系统减少动画始终优先；任务保存和撤销立即执行。', 'System Reduce Motion is always respected. Saving and Undo are immediate.')} />
    <Choices title={label('触感反馈', 'Haptics')} selected={preferences.haptics} choices={[
      ['off', label('关闭', 'Off')], ['system', label('跟随系统', 'System')], ['crisp', label('清脆', 'Crisp')], ['strong', label('清脆·强', 'Crisp strong')],
    ]} onSelect={(value) => save({ haptics: value as MoePreferences['haptics'] })} />
    <Section title={label('触感试听', 'Haptic audition')}>
      <View style={[settingsStyles.settingRowColumn, styles.choices]}>{([
        ['auditionSingle', label('A · 单击', 'A · Single')],
        ['auditionDouble', label('B · 紧双击', 'B · Tight double')],
        ['auditionTriple', label('C · 清单三连', 'C · List triple')],
      ] as [MoeHapticEvent, string][]).map(([event, name]) => <AppPressable key={event} accessibilityRole="button" onPress={() => moeHaptic(event)}
        style={[settingsStyles.pickerOption, styles.choice, { backgroundColor: tc.cardBg, borderColor: tc.border }]}><Text style={[settingsStyles.pickerOptionText, styles.choiceText, { color: tc.text }]}>{name}</Text></AppPressable>)}</View>
    </Section>
    <Section title={label('清单完成', 'List completion')}>
      <SettingToggleRow label={label('清单完成庆祝', 'Celebrate completed lists')} value={preferences.celebration} onChange={(celebration) => save({ celebration })} trackColor={{ false: tc.secondaryText, true: tc.tint }} />
      <SettingToggleRow divider label={label('清单下一步提示', 'Suggest the next action')} value={preferences.nextActionPrompt} onChange={(nextActionPrompt) => save({ nextActionPrompt })} trackColor={{ false: tc.secondaryText, true: tc.tint }} />
    </Section>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[settingsStyles.sectionTitle, { color: tc.secondaryText }]}>{label('动画演示', 'Motion preview')}</Text>
      <MoeMotionPreview />
    </View>
  </Page>;
}
const styles = StyleSheet.create({
  section: { marginBottom: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, flexBasis: '40%', flexGrow: 1, flexShrink: 1 },
  choiceText: { textAlign: 'center' }, action: { minHeight: 44 },
  custom: { padding: 16, gap: 16 }, swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  hue: { height: 48, borderRadius: 16, overflow: 'hidden' }, hueStrip: { flex: 1, flexDirection: 'row' }, hexInput: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 17 },
  preview: { padding: 20, borderRadius: 20, gap: 14 }, previewButton: { minHeight: 44, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
});
