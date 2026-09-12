import { describe, expect, it } from 'vitest';
import { clampLensCenter, lensSlotAt, lensSlotCenter } from './tab-lens';

describe('tab lens drop geometry', () => {
    it('keeps all three visual centers aligned with navigation targets at narrow and wide sizes', () => {
        for (const width of [1, 220, 448]) {
            for (let index = 0; index < 3; index++) {
                expect(lensSlotCenter(index, width, 3)).toBeGreaterThan(0);
                expect(lensSlotCenter(index, width, 3)).toBeLessThan(1);
                expect(lensSlotAt(lensSlotCenter(index, width, 3) * width, width, 3)).toBe(index);
            }
        }
    });
    it('clamps an outside release to a real page and keeps the lens inside its slot limits', () => {
        expect(lensSlotAt(-80, 300, 3)).toBe(0);
        expect(lensSlotAt(450, 300, 3)).toBe(2);
        expect(clampLensCenter(-80, 300, 3)).toBe(lensSlotCenter(0, 300, 3));
        expect(clampLensCenter(450, 300, 3)).toBe(lensSlotCenter(2, 300, 3));
    });
});
