import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoeSettings } from './MoeSettings';
import { getMoePreferences, setMoePreferences } from './preferences';
const mocks = vi.hoisted(() => ({ push: vi.fn(), setItem: vi.fn(), getItem: vi.fn().mockResolvedValue(null) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: mocks }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: (props: any) => React.createElement('SafeAreaView', props, props.children) }));
vi.mock('../lib/app-identity', () => ({ getAppIdentity: () => ({ channel: 'development' }) }));
vi.mock('../contexts/language-context', () => ({ useLanguage: () => ({ language: 'zh' }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('../hooks/use-theme-colors', () => ({ useThemeColors: () => ({ bg: '#fff', cardBg: '#fff', text: '#111', secondaryText: '#444', tint: '#234', onTint: '#fff', inputBg: '#eee', border: '#aaa', danger: '#b22' }) }));
vi.mock('./glass/GlassSurface', () => ({ glassCapabilities: () => ({ soft: false, liquid: false, reason: '当前平台使用清晰实底' }) }));

let tree: ReactTestRenderer;
const buttons = () => tree.root.findAll((node) => String(node.type) === 'Pressable');
const textOf = (node: any): string => typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('');
beforeEach(async () => { mocks.push.mockClear(); mocks.setItem.mockReset().mockResolvedValue(undefined); await setMoePreferences({ theme: 'soft', followSystem: true, glass: 'soft' }); });
afterEach(() => { if (tree) act(() => tree.unmount()); });
describe('Moe presentation settings', () => {
  it('persists the selected theme locally and makes that explicit choice override system appearance', async () => {
    await act(async () => { tree = create(<MoeSettings visible onClose={vi.fn()} />); });
    const ink = buttons().find((node) => textOf(node) === '墨色')!;
    await act(async () => { ink.props.onPress(); });
    expect(getMoePreferences()).toMatchObject({ theme: 'ink', followSystem: false });
    expect(buttons().find((node) => textOf(node) === '墨色')!.props.accessibilityState.checked).toBe(true);
  });
  it('reports save failures without claiming a new preference was saved', async () => {
    await act(async () => { tree = create(<MoeSettings visible onClose={vi.fn()} />); });
    mocks.setItem.mockRejectedValueOnce(new Error('unavailable'));
    await act(async () => { buttons().find((node) => textOf(node) === '墨色')!.props.onPress(); });
    expect(getMoePreferences().theme).toBe('soft');
    expect(tree.root.findAll((node) => node.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
  });
  it('discloses native fallback, exposes Dev isolation and uses the existing About route', async () => {
    const close = vi.fn();
    await act(async () => { tree = create(<MoeSettings visible onClose={close} />); });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('当前平台使用清晰实底');
    expect(text).toContain('云端空间不会自动隔离');
    act(() => { buttons().find((node) => textOf(node).startsWith('关于、版本与来源'))!.props.onPress(); });
    expect(close).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith({ pathname: '/settings', params: { settingsScreen: 'about' } });
  });
});
