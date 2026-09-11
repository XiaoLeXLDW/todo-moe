import type { ThemeColors } from '../hooks/use-theme-tokens';
import type { MoePreferences } from './preference-model';

const soft: ThemeColors = {
  bg: '#F4F6FB', cardBg: '#FFFFFF', taskItemBg: '#FFFFFF', text: '#192235', secondaryText: '#536177', icon: '#536177',
  border: '#CBD3E0', tint: '#405ECB', onTint: '#FFFFFF', tabIconDefault: '#536177', tabIconSelected: '#405ECB',
  inputBg: '#EBEFF8', filterBg: '#EBEFF8', danger: '#B4233A', success: '#17734C', warning: '#8B580B',
};
const ink: ThemeColors = {
  bg: '#10151F', cardBg: '#1B2331', taskItemBg: '#1B2331', text: '#F0F3FA', secondaryText: '#B3BFD1', icon: '#B3BFD1',
  border: '#425069', tint: '#AEC0FF', onTint: '#182654', tabIconDefault: '#B3BFD1', tabIconSelected: '#AEC0FF',
  inputBg: '#273247', filterBg: '#273247', danger: '#FFA4AE', success: '#82D9B1', warning: '#F4CA80',
};
const family = { ...soft, bg: '#F2F9F7', tint: '#166D68', tabIconSelected: '#166D68', inputBg: '#E5F3EF', filterBg: '#E5F3EF' };
const familyDark = { ...ink, bg: '#101B1C', tint: '#80DFD3', tabIconSelected: '#80DFD3', onTint: '#073D37', inputBg: '#213B39', filterBg: '#213B39' };

export function resolveMoeTheme(preferences: Pick<MoePreferences, 'theme' | 'followSystem'>, systemDark: boolean) {
  const isDark = preferences.followSystem ? systemDark : preferences.theme === 'ink';
  const colors = preferences.theme === 'family' ? (isDark ? familyDark : family) : isDark ? ink : soft;
  return { colors, isDark };
}
