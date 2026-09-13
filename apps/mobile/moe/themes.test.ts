import { describe, expect, it } from 'vitest';
import { parseMoePreferences } from './preference-model';
import { colorContrast, customTheme, resolveMoeTheme } from './themes';

describe('appearance migration and semantic colors', () => {
  it('migrates old families without resetting interaction preferences', () => {
    for (const theme of ['soft', 'ink', 'family']) for (const followSystem of [false, true]) {
      const migrated = parseMoePreferences({ theme, followSystem, glass: 'off', motion: 'simple', haptics: 'off', celebration: false });
      expect(migrated.appearance).toBe(followSystem ? 'system' : theme === 'ink' ? 'dark' : 'light');
      expect(migrated.theme).not.toBe('family');
      expect(migrated).toMatchObject({ colorSource: 'dynamic', glass: 'off', motion: 'simple', haptics: 'off', celebration: false });
    }
  });
  it('uses the native palette while keeping explicit mode and color independent', () => {
    const light = customTheme('#A12345', false), dark = customTheme('#A12345', true);
    const preferences = parseMoePreferences({ appearance: 'system', colorSource: 'dynamic' });
    expect(resolveMoeTheme(preferences, false, { supported: true, light, dark }).colors).toBe(light);
    expect(resolveMoeTheme(preferences, true, { supported: true, light, dark }).colors).toBe(dark);
    expect(resolveMoeTheme({ ...preferences, appearance: 'light' }, true, { supported: true, light, dark }).colors).toBe(light);
    expect(resolveMoeTheme({ ...preferences, colorSource: 'custom', customColor: '#00FF00' }, false, { supported: true, light, dark }).colors).not.toBe(light);
  });
  it('keeps content and accent labels readable for extreme and saturated seeds', () => {
    for (const seed of ['#FFFFFF', '#000000', '#FFCC00', '#FF0000', '#FF00FF', '#00FF00', '#0000FF', '#6750A4']) for (const dark of [false, true]) {
      const colors = customTheme(seed, dark);
      expect(colorContrast(colors.text, colors.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(colorContrast(colors.secondaryText, colors.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(colorContrast(colors.tint, colors.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(colorContrast(colors.tint, colors.inputBg)).toBeGreaterThanOrEqual(4.5);
      expect(colorContrast(colors.tint, colors.bg)).toBeGreaterThanOrEqual(4.5);
      expect(colorContrast(colors.onTint, colors.tint)).toBeGreaterThanOrEqual(4.5);
      expect(colors.tabIconSelected).toBe(colors.tint);
    }
  });
});
