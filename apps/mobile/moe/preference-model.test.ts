import { describe, expect, it } from 'vitest';
import { DEFAULT_MOE_PREFERENCES, parseMoePreferences, resolveMoeMotion } from './preference-model';
import { resolveMoeTheme } from './themes';
import { MOE_TABS, moeTabLabel } from './navigation';

const luminance = (hex: string) => {
  const rgb = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255)
    .map((s) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a: string, b: string) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05); };

describe('device presentation contract', () => {
  it('keeps automatic next-action prompts opt-in while retaining the choice', () => {
    expect(parseMoePreferences({}).nextActionPrompt).toBe(false);
    expect(parseMoePreferences({ nextActionPrompt: true }).nextActionPrompt).toBe(true);
  });
  it('drops unknown keys and recovers corrupt enum/boolean values', () => {
    expect(parseMoePreferences({ theme: 'unknown', haptics: false, motion: 8, glass: '<script>', cloudPassword: 'secret' })).toEqual(DEFAULT_MOE_PREFERENCES);
    expect(parseMoePreferences(null)).toEqual(DEFAULT_MOE_PREFERENCES);
  });
  it('lets either the system or simple setting disable travel and press scaling', () => {
    for (const preference of ['simple', 'standard', 'lively'] as const) {
      expect(resolveMoeMotion(preference, true)).toMatchObject({ reduced: true, duration: 0, travel: 0, pressScale: 1 });
    }
    expect(resolveMoeMotion('simple', false).duration).toBe(0);
    expect(resolveMoeMotion('lively', false).duration).toBeGreaterThan(resolveMoeMotion('standard', false).duration);
    expect(resolveMoeMotion('maximal', false)).toMatchObject({ pressScale: 0.8, travel: 24 });
  });
  it('provides legible fixed text and selected controls for all three themes, day and night', () => {
    for (const theme of ['soft', 'ink', 'family'] as const) {
      for (const dark of [false, true]) {
        const { colors } = resolveMoeTheme({ theme, followSystem: true }, dark);
        expect(contrast(colors.text, colors.taskItemBg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.secondaryText, colors.cardBg)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.onTint, colors.tint)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(resolveMoeTheme({ theme: 'ink', followSystem: false }, false).isDark).toBe(true);
    expect(resolveMoeTheme({ theme: 'soft', followSystem: false }, true).isDark).toBe(false);
  });
  it('exposes only Today/Lists/Inbox as destinations; capture remains an independent action', () => {
    expect(MOE_TABS).toEqual(['focus', 'projects', 'inbox']);
    expect(moeTabLabel('projects', true)).toBe('清单');
    expect(moeTabLabel('focus', false)).toBe('Today');
  });
});
