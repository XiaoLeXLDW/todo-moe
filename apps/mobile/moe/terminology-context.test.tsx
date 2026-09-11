import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zhHans } from '../../../packages/core/src/i18n/locales/zh-Hans';
import { en } from '../../../packages/core/src/i18n/locales/en';
import { LanguageProvider, useLanguage } from '../contexts/language-context';

vi.mock('@mindwtr/core', () => ({
  // The core catalog's runtime key is zh; zh-Hans is its source filename.
  getSystemDefaultLanguage: () => 'zh',
  loadStoredLanguage: async () => 'zh',
  saveStoredLanguage: async () => {},
  loadTranslations: async (language: string) => language === 'zh' ? zhHans : en,
}));
vi.mock('../lib/workspace-session-storage', () => ({ workspaceSessionStorage: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { name: 'Todo Moe Dev' } } }));
vi.mock('../lib/app-log', () => ({ logError: vi.fn() }));
vi.mock('../lib/startup-profiler', () => ({
  markStartupPhase: vi.fn(),
  measureStartupPhase: async (_name: string, action: () => Promise<unknown>) => action(),
}));

let tree: ReactTestRenderer | undefined;
afterEach(() => { if (tree) act(() => tree?.unmount()); tree = undefined; });

describe('mobile language provider entity labels', () => {
  it('resolves the device-reported labels before interpolating user text, while English stays upstream', async () => {
    let language!: ReturnType<typeof useLanguage>;
    function Probe() { language = useLanguage(); return null; }
    await act(async () => { tree = create(<LanguageProvider><Probe /></LanguageProvider>); });
    expect(language.isReady).toBe(true);
    expect(language.t('projects.addPlaceholder')).toBe('添加新清单...');
    expect(language.t('projects.empty')).toBe('还没有清单');
    expect(language.t('projects.areaFilter')).toBe('文件夹筛选');
    expect(language.t('projects.allAreas')).toBe('所有文件夹');
    expect(language.t('taskEdit.sectionLabel')).toBe('分组');

    const userTitle = '项目预算、领域研究与分区方案';
    expect(language.t('task.aria.openProject').replace('{{name}}', userTitle)).toBe(`打开清单${userTitle}`);
    expect(language.t(userTitle)).toBe(userTitle);
    expect(language.t('settings.syncBackendGroupAdvancedDesc')).toBe(zhHans['settings.syncBackendGroupAdvancedDesc']);
    expect(zhHans['projects.addPlaceholder']).toBe('添加新项目...');

    await act(async () => { await language.setLanguage('en'); });
    expect(language.language).toBe('en');
    expect(language.t('projects.addPlaceholder')).toBe(en['projects.addPlaceholder']);
    expect(language.t('taskEdit.sectionLabel')).toBe(en['taskEdit.sectionLabel']);
    expect(language.t(userTitle)).toBe(userTitle);
  });
});
