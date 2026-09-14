import type { MoePreferences } from './preference-model';

/** Completion-only values; changing these never retimes capture or glass. */
export const MOE_COMPLETION_MOTION = Object.freeze({
  pressMs: 80, checkMs: 160, textMs: 180, exitMs: 300, enterMs: 220,
  rowExitMs: 300, tailMs: 500,
  pressedScale: 0.88, completedScale: 1.12, travel: 10, finishedOpacity: 0.5,
  spring: { damping: 16, stiffness: 250, mass: 0.65 },
  celebrationMs: 600,
  burstSize: 72, burstParticles: 6,
  celebrationFadeInAt: 0.15, celebrationFadeOutAt: 0.72, celebrationParticleDistance: 24,
});

export function resolveMoeCompletionMotion(preference: MoePreferences['motion'], systemReduced: boolean) {
  const reduced = systemReduced || preference === 'simple';
  const maximal = preference === 'maximal';
  return { ...MOE_COMPLETION_MOTION, reduced,
    pressMs: reduced ? 0 : maximal ? 110 : MOE_COMPLETION_MOTION.pressMs,
    checkMs: reduced ? 0 : maximal ? 190 : MOE_COMPLETION_MOTION.checkMs,
    textMs: reduced ? 0 : MOE_COMPLETION_MOTION.textMs,
    exitMs: reduced ? 0 : maximal ? 760 : preference === 'lively' ? 460 : MOE_COMPLETION_MOTION.exitMs,
    rowExitMs: reduced ? 0 : maximal ? 300 : MOE_COMPLETION_MOTION.rowExitMs,
    tailMs: reduced ? 0 : maximal ? 760 : preference === 'lively' ? 460 : MOE_COMPLETION_MOTION.tailMs,
    enterMs: reduced ? 0 : MOE_COMPLETION_MOTION.enterMs,
    pressedScale: reduced ? 1 : maximal ? 0.8 : MOE_COMPLETION_MOTION.pressedScale,
    completedScale: reduced ? 1 : maximal ? 2.3 : preference === 'lively' ? 1.44 : MOE_COMPLETION_MOTION.completedScale,
    travel: reduced ? 0 : maximal ? 28 : preference === 'lively' ? 22 : MOE_COMPLETION_MOTION.travel,
    burstSize: reduced ? 0 : maximal ? 196 : preference === 'lively' ? 100 : MOE_COMPLETION_MOTION.burstSize,
    burstParticles: reduced ? 0 : maximal ? 20 : preference === 'lively' ? 10 : MOE_COMPLETION_MOTION.burstParticles,
    celebrationMs: !reduced && maximal ? 1300 : !reduced && preference === 'lively' ? 1000 : MOE_COMPLETION_MOTION.celebrationMs,
    celebrationSize: maximal ? 300 : preference === 'lively' ? 180 : 160,
    celebrationParticles: maximal ? 40 : preference === 'lively' ? 14 : 8,
    celebrationParticleDistance: maximal ? 170 : preference === 'lively' ? 100 : MOE_COMPLETION_MOTION.celebrationParticleDistance,
  };
}
