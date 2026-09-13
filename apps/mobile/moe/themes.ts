import type { ThemeColors } from '../hooks/use-theme-tokens';
import type { MoePreferences } from './preference-model';

export type SystemPalette = { supported: boolean; light?: ThemeColors; dark?: ThemeColors };
export const DEFAULT_SEED = '#6750A4';
const rgb = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
const hex = (channels: number[]) => '#' + channels.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
export function mixColor(a: string, b: string, weight: number): string {
  const aa = rgb(a), bb = rgb(b);
  return hex(aa.map((v, i) => v * (1 - weight) + bb[i] * weight));
}
export function colorContrast(a: string, b: string): number {
  const luminance = (color: string) => rgb(color).map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
export function readableAccent(seed: string, background: string | string[], dark: boolean): string {
  const surfaces = Array.isArray(background) ? background : [background];
  for (let step = 0; step <= 20; step++) {
    const candidate = mixColor(seed, dark ? '#FFFFFF' : '#000000', step / 20);
    if (surfaces.every((surface) => colorContrast(candidate, surface) >= 4.5)) return candidate;
  }
  return dark ? '#FFFFFF' : '#000000';
}
const generated = new Map<string, ThemeColors>();
export function customTheme(seed: string, dark: boolean): ThemeColors {
  const safe = /^#[a-f0-9]{6}$/i.test(seed) ? seed.toUpperCase() : DEFAULT_SEED;
  const key = `${safe}:${dark}`;
  const cached = generated.get(key); if (cached) return cached;
  const neutral = (lightWeight: number, darkWeight: number) => mixColor(safe, dark ? '#000000' : '#FFFFFF', dark ? darkWeight : lightWeight);
  const bg = neutral(.965, .94), cardBg = neutral(.99, .86), inputBg = neutral(.91, .78);
  const tint = readableAccent(safe, [bg, cardBg, inputBg], dark);
  const onTint = colorContrast(tint, '#FFFFFF') >= colorContrast(tint, '#000000') ? '#FFFFFF' : '#000000';
  const text = dark ? '#F4F1F5' : '#211E25';
  const secondaryText = dark ? '#C8C1CC' : '#625C68';
  const result = { bg, cardBg, taskItemBg: cardBg, text, secondaryText, icon: secondaryText,
    border: neutral(.77, .52), tint, onTint, tabIconDefault: secondaryText, tabIconSelected: tint,
    inputBg, filterBg: inputBg, danger: dark ? '#FFB4AB' : '#BA1A1A', success: dark ? '#8CD6AB' : '#166D42', warning: dark ? '#F3CD83' : '#805600' };
  if (generated.size >= 64) generated.clear();
  generated.set(key, result); return result;
}
export function moeIsDark(preferences: Pick<MoePreferences, 'theme' | 'followSystem' | 'appearance'>, systemDark: boolean): boolean {
  const mode = preferences.appearance ?? (preferences.followSystem ? 'system' : preferences.theme === 'ink' ? 'dark' : 'light');
  return mode === 'system' ? systemDark : mode === 'dark';
}
export function resolveMoeTheme(preferences: Pick<MoePreferences, 'theme' | 'followSystem' | 'appearance' | 'colorSource' | 'customColor'>, systemDark: boolean, palette?: SystemPalette) {
  const isDark = moeIsDark(preferences, systemDark);
  const dynamic = preferences.colorSource !== 'custom' && palette?.supported ? (isDark ? palette.dark : palette.light) : undefined;
  return { colors: dynamic ?? customTheme(preferences.colorSource === 'custom' ? preferences.customColor ?? DEFAULT_SEED : DEFAULT_SEED, isDark), isDark };
}
