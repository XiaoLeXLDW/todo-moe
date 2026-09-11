// Test hosts only: this preserves props and hook identities, never pretends to
// execute Fabric layout transitions or validate native exiting-node lifetimes.
import { useEffect, useRef } from 'react';
import * as Native from 'react-native';
const { FlatList, Text, View } = Native;
// Some focused list tests intentionally expose only the hosts they render.
const ScrollView = 'ScrollView' in Native ? Native.ScrollView : View;

export const createAnimatedComponent = <T,>(component: T): T => component;
export function useSharedValue<T>(value: T) {
    return useRef({ value, get() { return this.value; }, set(next: T) { this.value = next; } }).current;
}
export const useAnimatedStyle = (factory: () => unknown) => factory();
export const useAnimatedProps = (factory: () => unknown) => factory();
export const useDerivedValue = (factory: () => unknown) => ({ value: factory() });
export const useAnimatedRef = () => useRef(null);
export const useAnimatedScrollHandler = (handlers: unknown) => handlers;
export const useAnimatedReaction = (prepare: () => unknown, react: (value: unknown, previous: unknown) => void) => useEffect(() => { react(prepare(), null); }, [prepare, react]);
export const withTiming = <T,>(value: T, _config?: unknown, _callback?: unknown): T => value;
export const withSpring = withTiming;
export const withDelay = <T,>(_delay: number, value: T): T => value;
export const withSequence = <T,>(...values: T[]): T => values[values.length - 1];
export const withRepeat = <T,>(value: T): T => value;
export const cancelAnimation = (_value: unknown) => {};
export const runOnJS = <T,>(callback: T): T => callback;
export const runOnUI = <T,>(callback: T): T => callback;
export const interpolate = (value: number, input: number[], output: number[]) => {
    const fraction = Math.max(0, Math.min(1, (value - input[0]) / (input[input.length - 1] - input[0])));
    return output[0] + fraction * (output[output.length - 1] - output[0]);
};
export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing = { linear: (v: number) => v, ease: (v: number) => v, quad: (v: number) => v * v, out: (fn: unknown) => fn, inOut: (fn: unknown) => fn };
function builder(name: string, options: Record<string, unknown> = {}): any {
    return { name, options,
        duration: (duration: number) => builder(name, { ...options, duration }),
        delay: (delay: number) => builder(name, { ...options, delay }),
        reduceMotion: (reduceMotion: unknown) => builder(name, { ...options, reduceMotion }),
        withCallback: (callback: unknown) => builder(name, { ...options, callback }),
        easing: (easing: unknown) => builder(name, { ...options, easing }),
        springify: () => builder(name, { ...options, spring: true }),
    };
}
export const LinearTransition = builder('LinearTransition');
export const Layout = LinearTransition;
export const FadeIn = builder('FadeIn');
export const FadeOut = builder('FadeOut');
export const FadeOutUp = builder('FadeOutUp');
export const useReducedMotion = () => false;
export { FlatList, ScrollView, Text, View };
export default { View, Text, ScrollView, FlatList, createAnimatedComponent };
