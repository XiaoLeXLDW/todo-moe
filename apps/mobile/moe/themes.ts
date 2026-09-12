import type { ThemeColors } from '../hooks/use-theme-tokens';
import type { MoePreferences } from './preference-model';

const soft: ThemeColors = {
  bg: '#F1F3FA', cardBg: '#FFFFFF', taskItemBg: '#FFFFFF', text: '#202438', secondaryText: '#626A80', icon: '#626A80',
  border: '#DDE2EF', tint: '#515CC7', onTint: '#FFFFFF', tabIconDefault: '#626A80', tabIconSelected: '#515CC7',
  inputBg: '#E9EDF7', filterBg: '#E9EDF7', danger: '#B4233A', success: '#17734C', warning: '#8B580B',
};
const ink: ThemeColors = {
  bg: '#10131D', cardBg: '#1B2130', taskItemBg: '#1B2130', text: '#F0F2FC', secondaryText: '#ABB5CB', icon: '#ABB5CB',
  border: '#323B50', tint: '#B9BEFF', onTint: '#242A64', tabIconDefault: '#ABB5CB', tabIconSelected: '#B9BEFF',
  inputBg: '#252E42', filterBg: '#252E42', danger: '#FFA4AE', success: '#82D9B1', warning: '#F4CA80',
};
const family = { ...soft, bg: '#F2F9F7', tint: '#166D68', tabIconSelected: '#166D68', inputBg: '#E5F3EF', filterBg: '#E5F3EF' };
const familyDark = { ...ink, bg: '#101B1C', tint: '#80DFD3', tabIconSelected: '#80DFD3', onTint: '#073D37', inputBg: '#213B39', filterBg: '#213B39' };

export function resolveMoeTheme(preferences: Pick<MoePreferences, 'theme' | 'followSystem'>, systemDark: boolean) {
  const isDark = preferences.followSystem ? systemDark : preferences.theme === 'ink';
  const colors = preferences.theme === 'family' ? (isDark ? familyDark : family) : isDark ? ink : soft;
  return { colors, isDark };
}
