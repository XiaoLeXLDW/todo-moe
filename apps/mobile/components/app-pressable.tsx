import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeTokens } from '../hooks/use-theme-tokens';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { resolveMoeMotion } from '../moe/preference-model';
import { useMoePreferences } from '../moe/preferences';

type AppPressableProps = PressableProps & {
    /** Overlay color while pressed; defaults to a theme-aware dim layer. Useful
     *  on saturated backgrounds (e.g. swipe action buttons) that need a fixed
     *  darkening regardless of theme. */
    pressedColor?: string;
};

// React Native always provides createAnimatedComponent at runtime. The fallback
// keeps lightweight renderer/test hosts usable without weakening the app path.
const AnimatedPressable = typeof Animated.createAnimatedComponent === 'function'
    ? Animated.createAnimatedComponent(Pressable)
    : Pressable;

/**
 * The app's standard `Pressable`: every theme gets visible press feedback
 * (#818). Material 3 on Android keeps its ripple; everywhere else a pressed
 * overlay dims the control. The overlay is a separate layer instead of a
 * background swap so controls layered above other colors (task rows over
 * swipe actions) never flash what's underneath while pressed.
 */
export function AppPressable({ style, children, pressedColor, onPressIn, onPressOut, ...rest }: AppPressableProps) {
    const { isMaterial, state, isDark } = useThemeTokens();
    const reducedMotion = useReducedMotion();
    const preferences = useMoePreferences();
    const motion = resolveMoeMotion(preferences.motion, reducedMotion);
    const [pressed, setPressed] = useState(false);
    const pressScale = useRef(new Animated.Value(1)).current;
    const hasRipple = isMaterial && Boolean(state.rippleColor);
    // android_ripple is inert off Android, so the overlay covers those cases.
    const rippleHandlesFeedback = hasRipple && Platform.OS === 'android';
    const overlayColor = pressedColor
        ?? (isMaterial
            ? state.stateLayerColor('pressed')
            : isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)');
    // Animated's native prop reduction flattens style objects, not Pressable
    // callbacks. Resolve the callback here so layout and paint survive it.
    const resolvedStyle = typeof style === 'function'
        ? style({ pressed } as PressableStateCallbackType)
        : style;
    const flattenedStyle = StyleSheet.flatten(resolvedStyle as StyleProp<ViewStyle>) as ViewStyle | undefined;
    const overlayRadius = flattenedStyle?.borderRadius;
    const transforms = Array.isArray(flattenedStyle?.transform) ? flattenedStyle.transform : [];

    const handlePressIn = useCallback((event: GestureResponderEvent) => {
        setPressed(true);
        pressScale.stopAnimation();
        if (motion.reduced) pressScale.setValue(1);
        else Animated.timing(pressScale, { toValue: motion.pressScale, duration: 90, useNativeDriver: true }).start();
        onPressIn?.(event);
    }, [motion.pressScale, motion.reduced, onPressIn, pressScale]);
    const handlePressOut = useCallback((event: GestureResponderEvent) => {
        setPressed(false);
        pressScale.stopAnimation();
        if (motion.reduced) pressScale.setValue(1);
        else Animated.spring(pressScale, { toValue: 1, damping: 14, stiffness: 280, mass: 0.7, useNativeDriver: true }).start();
        onPressOut?.(event);
    }, [motion.reduced, onPressOut, pressScale]);

    useEffect(() => {
        if (!motion.reduced) return;
        pressScale.stopAnimation();
        pressScale.setValue(1);
    }, [motion.reduced, pressScale]);

    return (
        <AnimatedPressable
            android_ripple={hasRipple ? { color: state.rippleColor } : undefined}
            style={[resolvedStyle, { transform: [...transforms, { scale: pressScale }] }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            {...rest}
        >
            {/* The cast keeps this portable across react-native versions whose
                PressableStateCallbackType gained/lost optional members. */}
            {typeof children === 'function' ? children({ pressed } as PressableStateCallbackType) : children}
            {!rippleHandlesFeedback && pressed ? (
                <View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: overlayColor, borderRadius: overlayRadius },
                    ]}
                />
            ) : null}
        </AnimatedPressable>
    );
}
