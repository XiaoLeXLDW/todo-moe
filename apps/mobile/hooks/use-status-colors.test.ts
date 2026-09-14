import { describe, expect, it } from 'vitest';
import { getStatusColor, type TaskStatus } from '@mindwtr/core';
import { resolveStatusColors } from './use-status-colors';

const STATUSES: TaskStatus[] = ['inbox', 'next', 'waiting', 'someday', 'reference', 'done', 'archived'];

describe('resolveStatusColors', () => {
    it('keeps the core light palette for light default themes and missing context', () => {
        for (const status of STATUSES) {
            expect(resolveStatusColors(null)[status]).toEqual(getStatusColor(status));
            expect(resolveStatusColors({ themePreset: 'default', isDark: false })[status]).toEqual(getStatusColor(status));
        }
    });

    it('uses lighter hues for the effective dark appearance, including legacy presets', () => {
        const dark = resolveStatusColors({ themePreset: 'default', isDark: true });
        expect(dark.next.text).toBe('#60A5FA');
        expect(dark.next.text).not.toBe(getStatusColor('next').text);
        expect(resolveStatusColors({ themePreset: 'oled', isDark: true })).toEqual(dark);
    });

    it('does not mix a legacy preset with the effective Moe appearance', () => {
        const dark = resolveStatusColors({ themePreset: 'default', isDark: true });
        expect(resolveStatusColors({ themePreset: 'eink', isDark: true })).toEqual(dark);
        expect(resolveStatusColors({ themePreset: 'dracula', isDark: false })).toEqual(resolveStatusColors({ themePreset: 'default', isDark: false }));
    });

    it('provides bg, text, and border for every status in every palette', () => {
        const themes = [
            { themePreset: 'default', isDark: true },
            { themePreset: 'nord', isDark: true },
            { themePreset: 'sepia', isDark: false },
            { themePreset: 'eink', isDark: false },
            { themePreset: 'oled', isDark: true },
            { themePreset: 'catppuccin-macchiato', isDark: true },
            { themePreset: 'dracula', isDark: true },
        ] as const;
        for (const theme of themes) {
            const palette = resolveStatusColors(theme);
            for (const status of STATUSES) {
                expect(palette[status].bg).toBeTruthy();
                expect(palette[status].text).toBeTruthy();
                expect(palette[status].border).toBeTruthy();
            }
        }
    });
});
