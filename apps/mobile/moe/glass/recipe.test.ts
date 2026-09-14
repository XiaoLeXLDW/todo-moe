import { describe, expect, it } from 'vitest';
import { resolveGlassRecipe } from './recipe';
import { customTheme } from '../themes';

describe('semantic glass recipe', () => {
  it('uses one theme-derived crystal recipe with explicit bounded units', () => {
    for (const dark of [false, true]) {
      const theme = customTheme('#6750A4', dark);
      const recipe = resolveGlassRecipe('liquid', dark, theme);
      expect(recipe.surfaceTint).not.toBe(dark ? '#1B2130' : '#F4F5FA');
      expect(recipe.blurDp).toBeGreaterThan(0);
      expect(recipe.refractionDp).toBeGreaterThan(recipe.blurDp);
      for (const key of ['tintOpacity', 'thickness', 'highlight', 'innerShadow', 'chromaticEdge', 'pressResponse', 'velocityResponse'] as const) {
        expect(recipe[key]).toBeGreaterThanOrEqual(0);
        expect(recipe[key]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('removes refraction and animated optical responses outside Crystal mode', () => {
    const theme = customTheme('#6750A4', false);
    expect(resolveGlassRecipe('soft', false, theme)).toMatchObject({ refractionDp: 0, chromaticEdge: 0, pressResponse: 0, velocityResponse: 0 });
    expect(resolveGlassRecipe('off', false, theme)).toMatchObject({ blurDp: 0, refractionDp: 0, tintOpacity: 1 });
  });
});
