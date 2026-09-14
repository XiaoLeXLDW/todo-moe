import { useContext } from 'react';
import { STATUS_COLORS_BY_THEME } from '@mindwtr/core';
import type { StatusPalette } from '@mindwtr/core';
import { ThemeContext, type ThemeContextType } from '../contexts/theme-context';

export type { StatusColorSet, StatusPalette } from '@mindwtr/core';

type ResolvableTheme = Pick<ThemeContextType, 'isDark' | 'themePreset'>;

// Todo Moe's local presentation is always active on mobile. `isDark` is the
// effective Moe appearance, while `themePreset` is a legacy synced preference
// retained for compatibility. Mixing them can put black eink text on Moe dark.
export function resolveStatusColors(theme?: ResolvableTheme | null): StatusPalette {
    return STATUS_COLORS_BY_THEME[theme?.isDark ? 'dark' : 'light'];
}

export function useStatusColors(): StatusPalette {
    return resolveStatusColors(useContext(ThemeContext));
}
