import { describe, expect, it } from 'vitest';
import { platformGlassCapabilities, resolveGlassMode } from './capabilities';

describe('glass capability fallback', () => {
    it('keeps explicit off on capable devices', () => {
        expect(resolveGlassMode('off', platformGlassCapabilities('android', 36, true))).toBe('off');
    });
    it('does not promise native glass in Expo Go, web or old Android', () => {
        for (const capabilities of [platformGlassCapabilities('android', 30, true), platformGlassCapabilities('android', 36, false), platformGlassCapabilities('web', 36, true)]) {
            expect(resolveGlassMode('liquid', capabilities)).toBe('off');
        }
    });
    it('downgrades a saved liquid preference on Android 12 and under reduced motion', () => {
        expect(resolveGlassMode('liquid', platformGlassCapabilities('android', 31, true))).toBe('soft');
        expect(resolveGlassMode('liquid', platformGlassCapabilities('android', 33, true), true)).toBe('soft');
        expect(resolveGlassMode('liquid', platformGlassCapabilities('android', 33, true))).toBe('liquid');
    });
});
