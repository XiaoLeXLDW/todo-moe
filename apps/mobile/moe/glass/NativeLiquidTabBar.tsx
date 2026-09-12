import type React from 'react';
import { Platform, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { GlassMode } from './capabilities';

export type NativeLiquidTabBarProps = {
    labels: string[];
    selectedIndex: number;
    selectionRevision: number;
    dark: boolean;
    accentColor: string;
    surfaceColor: string;
    contentColor: string;
    mode: GlassMode;
    reducedMotion: boolean;
    samplingEnabled: boolean;
    onSelect: (event: NativeSyntheticEvent<{ index: number }>) => void;
    style?: StyleProp<ViewStyle>;
};

// Compose owns the complete original optical/gesture stack. Only route identity
// crosses this bridge; task state and navigation remain in the existing host.
let NativeLiquidTabBar: React.ComponentType<NativeLiquidTabBarProps> | null = null;
if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
        if (requireOptionalNativeModule('MoeLiquidTabBar')) {
            NativeLiquidTabBar = requireNativeViewManager<NativeLiquidTabBarProps>('MoeLiquidTabBar');
        }
    } catch { /* Expo Go retains the existing accessible RN navigation. */ }
}

export { NativeLiquidTabBar };
