import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { ThemeColors } from '../hooks/use-theme-tokens';
import { customTheme, type SystemPalette } from './themes';

const FALLBACK: SystemPalette = Object.freeze({ supported: false });
let snapshot = FALLBACK;
const listeners = new Set<() => void>();
let cleanup: (() => void) | undefined;
interface NativeColors { getPalette(): unknown; addListener(name: string, listener: (value: unknown) => void): { remove(): void }; }
const nativeColors = (() => { try { return Platform.OS === 'android' ? requireOptionalNativeModule<NativeColors>('MoeSystemColors') : null; } catch { return null; } })();
const roles = Object.keys(customTheme('#6750A4', false)) as (keyof ThemeColors)[];
export function parseSystemPalette(value: unknown): SystemPalette {
  const data = value as Partial<SystemPalette> | null;
  const valid = (colors: unknown): colors is ThemeColors => Boolean(colors && typeof colors === 'object' && roles.every((key) => /^#[a-f0-9]{6}$/i.test(String((colors as ThemeColors)[key]))));
  return data?.supported === true && valid(data.light) && valid(data.dark) ? { supported: true, light: data.light, dark: data.dark } : FALLBACK;
}
function publish(value: unknown) {
  const next = parseSystemPalette(value);
  if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
  snapshot = next; listeners.forEach((listener) => listener());
}
export function refreshSystemPalette() { try { publish(nativeColors?.getPalette()); } catch { publish(null); } }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refreshSystemPalette();
    const native = typeof nativeColors?.addListener === 'function' ? nativeColors.addListener('onPaletteChanged', publish) : undefined;
    const app = AppState?.addEventListener?.('change', (state) => { if (state === 'active') refreshSystemPalette(); });
    cleanup = () => { native?.remove(); app?.remove(); };
  }
  return () => { listeners.delete(listener); if (!listeners.size) { cleanup?.(); cleanup = undefined; } };
}
export const getSystemPalette = () => snapshot;
export function useSystemPalette() { return useSyncExternalStore(subscribe, getSystemPalette, () => FALLBACK); }

// Seed the first render without a flash of fallback color on supported devices.
if (nativeColors) refreshSystemPalette();
