import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import { platformGlassCapabilities, resolveGlassMode, type GlassMode } from './capabilities';

type NativeProps = { mode: GlassMode; dark: boolean; reducedMotion: boolean; style: StyleProp<ViewStyle>; children?: React.ReactNode };
let NativeGlass: React.ComponentType<NativeProps> | null = null;
if (Platform.OS === 'android') {
    try {
        if (requireOptionalNativeModule('MoeGlass')) NativeGlass = requireNativeViewManager<NativeProps>('MoeGlass');
    } catch { /* Expo Go and unsupported builds retain all navigation actions. */ }
}

export const glassCapabilities = () => platformGlassCapabilities(Platform.OS, Number(Platform.Version), NativeGlass !== null);

export function GlassSurface({ mode, dark = false, reducedMotion = false, style, children }: {
    mode: GlassMode;
    dark?: boolean;
    reducedMotion?: boolean;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}) {
    const effective = resolveGlassMode(mode, glassCapabilities(), reducedMotion);
    // Sampling excludes foreground icons/labels together with this native group.
    // Toggling off keeps the same tree, preserving navigation and accessibility.
    if (NativeGlass) {
        return <NativeGlass mode={effective} dark={dark} reducedMotion={reducedMotion} style={[styles.surface, style]}>{children}</NativeGlass>;
    }
    return (
        <View style={[styles.surface, style]}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.fallback, {
                backgroundColor: dark ? '#1b1e2c' : '#f8f7fd', borderColor: dark ? '#454557' : '#e3deef',
            }]} />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    surface: { borderRadius: 28, overflow: 'hidden' },
    fallback: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth },
});
