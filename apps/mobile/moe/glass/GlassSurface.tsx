import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { platformGlassCapabilities, resolveGlassMode, type GlassMode } from './capabilities';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { resolveGlassRecipe } from './recipe';

export type GlassLensMotion = {
    center: SharedValue<number>;
    width: SharedValue<number>;
    press: SharedValue<number>;
    velocity: SharedValue<number>;
    height: number;
};
type NativeProps = { mode: GlassMode; dark: boolean; reducedMotion: boolean; samplingEnabled?: boolean; cornerRadius?: number; lensState?: number[];
    surfaceTint?: string; fallbackSurface?: string; borderColor?: string; tintOpacity?: number; blurDp?: number; refractionDp?: number;
    thickness?: number; highlight?: number; innerShadow?: number; chromaticEdge?: number; pressResponse?: number; velocityResponse?: number;
    style: StyleProp<ViewStyle>; children?: React.ReactNode };
let NativeGlass: React.ComponentType<NativeProps> | null = null;
if (Platform.OS === 'android') {
    try {
        if (requireOptionalNativeModule('MoeGlass')) NativeGlass = requireNativeViewManager<NativeProps>('MoeGlass');
    } catch { /* Expo Go and unsupported builds retain all navigation actions. */ }
}
const AnimatedNativeGlass = NativeGlass ? Animated.createAnimatedComponent(NativeGlass) : null;

export const glassCapabilities = () => platformGlassCapabilities(Platform.OS, Number(Platform.Version), NativeGlass !== null);

export function GlassSurface({ mode, dark = false, reducedMotion = false, samplingEnabled = true, cornerRadius = 28, lens, style, children }: {
    mode: GlassMode;
    dark?: boolean;
    reducedMotion?: boolean;
    samplingEnabled?: boolean;
    cornerRadius?: number;
    lens?: GlassLensMotion;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}) {
    const tc = useThemeColors();
    const effective = resolveGlassMode(mode, glassCapabilities(), reducedMotion);
    const recipe = resolveGlassRecipe(effective, dark, tc);
    const animatedProps = useAnimatedProps(() => ({
        // Atomically update the optical pose, in normalized surface coordinates.
        lensState: lens ? [1, lens.center.value, 0.5, lens.width.value, lens.height,
            reducedMotion ? 0 : lens.press.value, reducedMotion ? 0 : lens.velocity.value, 0] : [0, 0.5, 0.5, 0, 0, 0, 0, 0],
    }), [lens, reducedMotion]);
    // Sampling excludes foreground icons/labels together with this native group.
    // Toggling off keeps the same tree, preserving navigation and accessibility.
    if (AnimatedNativeGlass) {
        return <AnimatedNativeGlass animatedProps={animatedProps} mode={effective} dark={dark} reducedMotion={reducedMotion}
            samplingEnabled={samplingEnabled} cornerRadius={cornerRadius} {...recipe}
            style={[styles.surface, { borderRadius: cornerRadius }, style]}>{children}</AnimatedNativeGlass>;
    }
    return (
        <View style={[styles.surface, { borderRadius: cornerRadius }, style]}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.fallback, {
                backgroundColor: recipe.fallbackSurface, borderColor: recipe.borderColor, borderRadius: cornerRadius,
            }]} />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    surface: { borderRadius: 28, overflow: 'hidden' },
    fallback: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth },
});
