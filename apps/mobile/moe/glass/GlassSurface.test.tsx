import React, { useEffect } from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { GlassSurface } from './GlassSurface';

vi.mock('react-native', () => ({
    Platform: { OS: 'android', Version: 33 },
    View: 'View',
    StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {}, hairlineWidth: 1 },
}));
vi.mock('expo-modules-core', () => ({
    requireOptionalNativeModule: () => ({}),
    requireNativeViewManager: () => 'MoeGlassNative',
}));

describe('native glass foreground ownership', () => {
    it('keeps navigation children inside the excluded native group and mounted when turning glass off', async () => {
        const mounted = vi.fn();
        const unmounted = vi.fn();
        function Navigation() {
            useEffect(() => { mounted(); return () => unmounted(); }, []);
            return React.createElement('NavigationControls');
        }
        let renderer: ReturnType<typeof create>;
        await act(async () => { renderer = create(<GlassSurface mode="liquid"><Navigation /></GlassSurface>); });
        const native = renderer!.root.findByType('MoeGlassNative' as any);
        expect(native.props.mode).toBe('liquid');
        expect(native.findByType(Navigation)).toBeDefined();
        await act(async () => { renderer!.update(<GlassSurface mode="off" dark><Navigation /></GlassSurface>); });
        expect(renderer!.root.findByType('MoeGlassNative' as any).props.mode).toBe('off');
        expect(mounted).toHaveBeenCalledTimes(1);
        expect(unmounted).not.toHaveBeenCalled();
        await act(async () => renderer!.unmount());
        expect(unmounted).toHaveBeenCalledTimes(1);
    });

    it('passes reduced motion through while replacing the liquid lens with soft blur', async () => {
        let renderer: ReturnType<typeof create>;
        await act(async () => { renderer = create(<GlassSurface mode="liquid" reducedMotion />); });
        const native = renderer!.root.findByType('MoeGlassNative' as any);
        expect(native.props.mode).toBe('soft');
        expect(native.props.reducedMotion).toBe(true);
        await act(async () => renderer!.unmount());
    });
});
