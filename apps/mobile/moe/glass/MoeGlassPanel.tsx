import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { useThemeTokens } from '../../hooks/use-theme-tokens';
import { useMoePreferences } from '../preferences';
import { GlassSurface } from './GlassSurface';

/** Shared app-owned operation surface; content layers remain ordinary readable views. */
export function MoeGlassPanel({
    active = true,
    children,
    cornerRadius = 14,
    style,
}: {
    active?: boolean;
    children: React.ReactNode;
    cornerRadius?: number;
    style?: StyleProp<ViewStyle>;
}) {
    const preferences = useMoePreferences();
    const reducedMotion = useReducedMotion();
    const { isDark } = useThemeTokens();
    return (
        <GlassSurface
            mode={preferences.glass}
            dark={isDark}
            reducedMotion={reducedMotion}
            samplingEnabled={active}
            cornerRadius={cornerRadius}
            style={style}
        >
            {children}
        </GlassSurface>
    );
}
