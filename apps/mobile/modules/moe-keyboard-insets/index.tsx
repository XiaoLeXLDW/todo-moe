import React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';

export type DialogKeyboardFrame = {
  imeVisible: boolean;
  imeBottomPx: number;
  keyboardTopPx: number;
  windowTopPx: number;
  windowHeightPx: number;
  hostTopPx: number;
  hostHeightPx: number;
  density: number;
  source: string;
};
type Props = {
  style?: StyleProp<ViewStyle>;
  onInsetsChange: (event: { nativeEvent: DialogKeyboardFrame }) => void;
  pointerEvents?: 'none';
};
let NativeProbe: React.ComponentType<Props> | null = null;
if (Platform.OS === 'android') {
  try {
    if (requireOptionalNativeModule('MoeKeyboardInsets')) NativeProbe = requireNativeViewManager<Props>('MoeKeyboardInsets');
  } catch { /* Expo Go retains the legacy keyboard inset fallback. */ }
}
export const hasNativeKeyboardInsets = NativeProbe !== null;
export function DialogKeyboardInsetsProbe(props: Props) {
  return NativeProbe ? <NativeProbe {...props} pointerEvents="none" /> : null;
}
