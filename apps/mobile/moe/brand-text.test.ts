import { describe, expect, it, vi } from 'vitest';
import { brandMobileText, brandMobileTranslations, getMobileAppName, resolveMobileAppName } from './brand-text';
import brand from './brand/config.json';

vi.mock('expo-constants', () => ({ default: { expoConfig: { name: 'Todo Moe Dev', android: { package: 'io.github.xiaolexldw.todomoe.dev' } } } }));

describe('mobile application name boundary', () => {
  it('uses the installed Dev name and a configurable stable fallback', () => {
    expect(getMobileAppName()).toBe(`${brand.name} Dev`);
    expect(resolveMobileAppName(null)).toBe(brand.name);
    expect(resolveMobileAppName({ name: 'Mindwtr', android: { package: 'io.github.xiaolexldw.todomoe.dev' } })).toBe(`${brand.name} Dev`);
  });
  it('brands onboarding and application-lock text in the original language', () => {
    expect(brandMobileText('onboarding.title', '欢迎使用 Mindwtr')).toBe('欢迎使用 Todo Moe Dev');
    expect(brandMobileText('onboarding.startFreshTitle', 'Start using Mindwtr')).toBe('Start using Todo Moe Dev');
    expect(brandMobileText('appLock.prompt', '解锁 Mindwtr')).toBe('解锁 Todo Moe Dev');
  });
  it('preserves backup formats, cloud providers, attribution, links and arbitrary task content', () => {
    const pairs = [
      ['onboarding.importDescMobile', 'Import a Mindwtr backup.'],
      ['settings.syncBackendGroupAdvancedDesc', 'Use your own Mindwtr Cloud endpoint.'],
      ['settings.officialWebsite', 'Mindwtr'],
      ['about.source', 'https://github.com/dongdongbh/Mindwtr'],
      ['task.title', 'Review Mindwtr source code'],
    ];
    for (const [key, text] of pairs) expect(brandMobileText(key, text)).toBe(text);
  });
  it('brands reminder dictionaries without mutating the shared core translations', () => {
    const input = Object.freeze({ 'digest.morningBody': 'Open Mindwtr to plan your day.', 'settings.cloudTokenHint': 'Mindwtr Cloud', 'task.title': 'Mindwtr research' });
    const output = brandMobileTranslations(input, 'Todo Moe');
    expect(output['digest.morningBody']).toBe('Open Todo Moe to plan your day.');
    expect(output['settings.cloudTokenHint']).toBe('Mindwtr Cloud');
    expect(output['task.title']).toBe('Mindwtr research');
    expect(input['digest.morningBody']).toBe('Open Mindwtr to plan your day.');
  });
});
