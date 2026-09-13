import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({ language: 'en' }));

vi.mock('@/contexts/language-context', () => ({ useLanguage: () => ({ language: controls.language }) }));
vi.mock('@/contexts/toast-context', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/use-theme-colors', () => ({ useThemeColors: () => ({
    bg: '#fff', cardBg: '#fff', border: '#ddd', text: '#111', secondaryText: '#666',
}) }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '0.2.0', extra: { todoMoe: { versionCode: 40 } } } } }));
vi.mock('expo-application', () => ({ nativeApplicationVersion: '0.2.0', nativeBuildVersion: '40' }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { multiRemove: vi.fn(() => Promise.resolve()) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/lib/app-identity', () => ({
    getAppIdentity: () => ({ channel: 'development', packageName: 'io.github.xiaolexldw.todomoe.dev' }),
    TODO_MOE_RELEASES_URL: 'https://example.test/releases',
    TODO_MOE_ISSUES_URL: 'https://example.test/issues/new',
    TODO_MOE_REPOSITORY: 'https://example.test',
}));
vi.mock('./settings.hooks', () => ({ useSettingsScrollContent: () => ({}) }));
vi.mock('./settings.shell', () => ({ SettingsTopBar: ({ title }: { title: string }) => <>{title}</> }));
vi.mock('../../moe/brand/icon.png', () => ({ default: 1 }));

import { AboutSettingsScreen } from './about-settings-screen';

let tree: ReactTestRenderer | undefined;
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; });
const rendered = () => tree!.root.findAllByType('Text' as any)
    .flatMap(node => [node.props.children].flat(Infinity))
    .filter(value => typeof value === 'string' || typeof value === 'number')
    .join(' ');
const pressRow = (title: string) => {
    let node = tree!.root.findAllByType('Text' as any).find(item => item.props.children === title);
    if (!node) throw new Error(`No text found for ${title}`);
    while (node.parent && typeof node.props.onPress !== 'function') node = node.parent;
    if (typeof node.props.onPress !== 'function') throw new Error(`No pressable row found for ${title}`);
    node.props.onPress();
};

describe('Todo Moe about localization', () => {
    it('follows the selected English language instead of leaving the product UI in Chinese', () => {
        controls.language = 'en';
        act(() => { tree = create(<AboutSettingsScreen onUpdateBadgeChange={vi.fn()} />); });
        expect(rendered()).toContain('Download & updates');
        expect(rendered()).toContain('Report a problem');
        expect(rendered()).not.toContain('关于 Todo Moe');
        expect(rendered()).not.toContain('反馈问题');
        act(() => pressRow('Help'));
        expect(rendered()).toContain('Quick start');
        expect(rendered()).not.toContain('快速开始');
    });

    it('retains the Chinese product copy for a Chinese locale', () => {
        controls.language = 'zh-Hans';
        act(() => { tree = create(<AboutSettingsScreen onUpdateBadgeChange={vi.fn()} />); });
        expect(rendered()).toContain('下载与更新');
        expect(rendered()).toContain('反馈问题');
        act(() => pressRow('使用帮助'));
        expect(rendered()).toContain('快速开始');
    });
});
