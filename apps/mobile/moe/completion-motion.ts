import type { MoePreferences } from './preference-model';

/** Completion-only values; changing these never retimes capture or glass. */
export const MOE_COMPLETION_MOTION = Object.freeze({
  pressMs: 80, checkMs: 160, textMs: 180, exitMs: 300, enterMs: 220,
  rowExitMs: 300, tailMs: 300, confirmationHold: 0.45,
  pressedScale: 0.88, completedScale: 1.12, travel: 10, finishedOpacity: 0.5,
  spring: { damping: 16, stiffness: 250, mass: 0.65 },
  celebrationMs: 600,
  celebrationFadeInAt: 0.15, celebrationFadeOutAt: 0.72,
});

export function resolveMoeCompletionMotion(preference: MoePreferences['motion'], systemReduced: boolean) {
  const reduced = systemReduced || preference === 'simple';
  const maximal = preference === 'maximal';
  return { ...MOE_COMPLETION_MOTION, reduced,
    pressMs: reduced ? 0 : maximal ? 90 : MOE_COMPLETION_MOTION.pressMs,
    checkMs: reduced ? 0 : maximal ? 260 : MOE_COMPLETION_MOTION.checkMs,
    textMs: reduced ? 0 : MOE_COMPLETION_MOTION.textMs,
    exitMs: reduced ? 0 : maximal ? 420 : preference === 'lively' ? 460 : MOE_COMPLETION_MOTION.exitMs,
    rowExitMs: reduced ? 0 : maximal ? 420 : preference === 'lively' ? 460 : MOE_COMPLETION_MOTION.rowExitMs,
    tailMs: reduced ? 0 : maximal ? 420 : preference === 'lively' ? 460 : MOE_COMPLETION_MOTION.tailMs,
    enterMs: reduced ? 0 : MOE_COMPLETION_MOTION.enterMs,
    pressedScale: reduced ? 1 : maximal ? 0.84 : MOE_COMPLETION_MOTION.pressedScale,
    completedScale: reduced ? 1 : maximal ? 1.6 : preference === 'lively' ? 1.35 : MOE_COMPLETION_MOTION.completedScale,
    travel: reduced ? 0 : maximal ? 12 : preference === 'lively' ? 10 : MOE_COMPLETION_MOTION.travel,
    confirmationHold: maximal ? 0.55 : MOE_COMPLETION_MOTION.confirmationHold,
    celebrationMs: !reduced && (maximal || preference === 'lively') ? 1000 : MOE_COMPLETION_MOTION.celebrationMs,
  };
}
