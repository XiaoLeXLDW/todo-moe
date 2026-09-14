import type { ThemeColors } from '../../hooks/use-theme-tokens';
import { mixColor } from '../themes';
import type { GlassMode } from './capabilities';

/** Explicit units: colors are #RRGGBB, opacity/response fields are 0..1,
 * optical distances are density-independent pixels. */
export type GlassRecipe = {
  surfaceTint: string;
  fallbackSurface: string;
  borderColor: string;
  tintOpacity: number;
  blurDp: number;
  refractionDp: number;
  thickness: number;
  highlight: number;
  innerShadow: number;
  chromaticEdge: number;
  pressResponse: number;
  velocityResponse: number;
};

export function resolveGlassRecipe(mode: GlassMode, dark: boolean, tc: ThemeColors): GlassRecipe {
  const crystal = mode === 'liquid';
  const soft = mode === 'soft';
  return {
    surfaceTint: mixColor(tc.cardBg, tc.tint, crystal ? (dark ? 0.18 : 0.1) : 0.04),
    fallbackSurface: mixColor(tc.cardBg, tc.tint, crystal ? (dark ? 0.13 : 0.07) : 0.025),
    borderColor: mixColor(tc.border, dark ? '#FFFFFF' : tc.tint, crystal ? 0.28 : 0.1),
    tintOpacity: mode === 'off' ? 1 : crystal ? (dark ? 0.3 : 0.24) : 0.42,
    blurDp: crystal ? 6 : soft ? 14 : 0,
    refractionDp: crystal ? 30 : 0,
    thickness: crystal ? 0.92 : 0,
    highlight: crystal ? 0.9 : soft ? 0.28 : 0,
    innerShadow: crystal ? 0.72 : 0,
    chromaticEdge: crystal ? 0.86 : 0,
    pressResponse: crystal ? 1 : 0,
    velocityResponse: crystal ? 0.9 : 0,
  };
}
