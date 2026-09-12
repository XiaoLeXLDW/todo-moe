import type { MoePreferences } from './preference-model';

/** Completion-only values; changing these never retimes capture or glass. */
export const MOE_COMPLETION_MOTION = Object.freeze({
  pressMs: 80, checkMs: 160, textMs: 180, exitMs: 300, enterMs: 220,
  pressedScale: 0.88, completedScale: 1.12, travel: 10, finishedOpacity: 0.5,
  spring: { damping: 16, stiffness: 250, mass: 0.65 },
  celebrationMs: 600,
  celebrationFadeInAt: 0.15, celebrationFadeOutAt: 0.72, celebrationParticleDistance: 24,
});

export function resolveMoeCompletionMotion(preference: MoePreferences['motion'], systemReduced: boolean) {
  const reduced = systemReduced || preference === 'simple';
  return { ...MOE_COMPLETION_MOTION, reduced,
    pressMs: reduced ? 0 : MOE_COMPLETION_MOTION.pressMs,
    checkMs: reduced ? 0 : MOE_COMPLETION_MOTION.checkMs,
    textMs: reduced ? 0 : MOE_COMPLETION_MOTION.textMs,
    exitMs: reduced ? 0 : preference === 'lively' ? 340 : MOE_COMPLETION_MOTION.exitMs,
    enterMs: reduced ? 0 : MOE_COMPLETION_MOTION.enterMs,
    pressedScale: reduced ? 1 : MOE_COMPLETION_MOTION.pressedScale,
    completedScale: reduced ? 1 : MOE_COMPLETION_MOTION.completedScale,
    travel: reduced ? 0 : MOE_COMPLETION_MOTION.travel,
  };
}
