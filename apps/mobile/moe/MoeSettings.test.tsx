import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoeAppearanceSettings, MoeMotionSettings } from './MoeSettings';
import { getMoePreferences, setMoePreferences } from './preferences';
const mocks = vi.hoisted(() => ({ setItem: vi.fn(), getItem: vi.fn().mockResolvedValue(null) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => React.createElement('SafeAreaView', props, props.children) }));
vi.mock('../contexts/language-context', () => ({ useLanguage: () => ({ language: 'zh' }) }));
vi.mock('../contexts/theme-context', () => ({ useTheme: () => ({ isDark: false }) }));
vi.mock('../hooks/use-theme-colors', () => ({ useThemeColors: () => ({ bg: '#fff', cardBg: '#fff', text: '#111', secondaryText: '#444', tint: '#234', onTint: '#fff', inputBg: '#eee', border: '#aaa', danger: '#b22' }) }));
vi.mock('./system-palette', () => ({ useSystemPalette: () => ({ supported: false }) }));
vi.mock('./glass/GlassSurface', () => ({ glassCapabilities: () => ({ liquid: false }) }));
vi.mock('../components/settings/settings.shell', () => ({ SettingsTopBar: (props: any) => React.createElement('Text', null, props.title) }));
vi.mock('./MoeMotionPreview', () => ({ MoeMotionPreview: () => React.createElement('Preview') }));
let tree: ReactTestRenderer;
const buttons = () => tree.root.findAll((node) => String(node.type) === 'Pressable');
const textOf = (node: any): string => typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('');
beforeEach(async () => { mocks.setItem.mockReset().mockResolvedValue(undefined); await setMoePreferences({ appearance: 'system', colorSource: 'dynamic', customColor: '#6750A4', glass: 'liquid', motion: 'lively' }); });
afterEach(() => { if (tree) act(() => tree.unmount()); });
describe('single appearance and motion pages', () => {
  it('changes mode independently from custom color and removes family choices', async () => {
    await act(async () => { tree = create(<MoeAppearanceSettings />); });
    await act(async () => { buttons().find((node) => textOf(node) === '深色')!.props.onPress(); });
    expect(getMoePreferences()).toMatchObject({ appearance: 'dark', followSystem: false, colorSource: 'dynamic' });
    expect(JSON.stringify(tree.toJSON())).not.toContain('家族色');
    await act(async () => { buttons().find((node) => textOf(node) === '自定义颜色')!.props.onPress(); });
    const input = tree.root.findAll((node) => String(node.type) === 'TextInput')[0];
    act(() => input.props.onChangeText('#invalid'));
    expect(buttons().find((node) => textOf(node) === '应用颜色')!.props.disabled).toBe(true);
    act(() => input.props.onChangeText('#FFCC00'));
    await act(async () => { buttons().find((node) => textOf(node) === '应用颜色')!.props.onPress(); });
    expect(getMoePreferences()).toMatchObject({ appearance: 'dark', customColor: '#FFCC00', colorSource: 'custom' });
  });
  it('rolls back a failed write and exposes an actionable error', async () => {
    await act(async () => { tree = create(<MoeAppearanceSettings />); });
    mocks.setItem.mockRejectedValueOnce(new Error('disk full'));
    await act(async () => { buttons().find((node) => textOf(node) === '深色')!.props.onPress(); });
    expect(getMoePreferences().appearance).toBe('system');
    expect(tree.root.findAll((node) => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  });
  it('keeps preview on the dedicated motion page and persists reduced motion', async () => {
    await act(async () => { tree = create(<MoeMotionSettings />); });
    expect(tree.root.findAll((node) => String(node.type) === 'Preview')).toHaveLength(1);
    await act(async () => { buttons().find((node) => textOf(node) === '简洁')!.props.onPress(); });
    expect(getMoePreferences().motion).toBe('simple');
    expect(JSON.stringify(tree.toJSON())).not.toContain('配色来源');
  });
});
