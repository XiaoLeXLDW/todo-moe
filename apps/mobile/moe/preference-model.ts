export type MoePreferences = {
  /** Local-only migration marker. It is never part of the synced task schema. */
  presentationVersion?: 2;
  /** Legacy fields remain readable during hydration; new controls use appearance. */
  theme: 'soft' | 'ink' | 'family';
  followSystem: boolean;
  appearance?: 'system' | 'light' | 'dark';
  colorSource?: 'dynamic' | 'custom';
  customColor?: string;
  glass: 'off' | 'soft' | 'liquid';
  motion: 'simple' | 'standard' | 'lively' | 'maximal';
  haptics: 'off' | 'system' | 'crisp' | 'strong';
  celebration: boolean;
  nextActionPrompt: boolean;
};

export const DEFAULT_MOE_PREFERENCES: Readonly<MoePreferences> = Object.freeze({
  presentationVersion: 2,
  theme: 'soft', followSystem: true, appearance: 'system', colorSource: 'dynamic', customColor: '#6750A4',
  glass: 'liquid', motion: 'maximal', haptics: 'crisp', celebration: true, nextActionPrompt: false,
});

/** Device presentation only: deliberately never added to the task/sync schema. */
export function parseMoePreferences(raw: unknown): MoePreferences {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const oneOf = <T extends string>(value: unknown, values: T[], fallback: T): T =>
    values.includes(value as T) ? value as T : fallback;
  const legacyFollow = typeof source.followSystem === 'boolean' ? source.followSystem : true;
  const appearance = oneOf(source.appearance, ['system', 'light', 'dark'], legacyFollow ? 'system' : source.theme === 'ink' ? 'dark' : 'light');
  return {
    presentationVersion: 2,
    theme: appearance === 'dark' ? 'ink' : 'soft',
    followSystem: appearance === 'system',
    appearance,
    colorSource: oneOf<'dynamic' | 'custom'>(source.colorSource, ['dynamic', 'custom'], 'dynamic'),
    customColor: typeof source.customColor === 'string' && /^#[a-f0-9]{6}$/i.test(source.customColor) ? source.customColor.toUpperCase() : '#6750A4',
    glass: oneOf(source.glass, ['off', 'soft', 'liquid'], DEFAULT_MOE_PREFERENCES.glass),
    motion: oneOf(source.motion, ['simple', 'standard', 'lively', 'maximal'], DEFAULT_MOE_PREFERENCES.motion),
    haptics: oneOf(source.haptics, ['off', 'system', 'crisp', 'strong'], DEFAULT_MOE_PREFERENCES.haptics),
    celebration: typeof source.celebration === 'boolean' ? source.celebration : true,
    nextActionPrompt: typeof source.nextActionPrompt === 'boolean' ? source.nextActionPrompt : false,
  };
}

export const MOE_MOTION = Object.freeze({ fast: 120, normal: 220, slow: 320, pressScale: 0.92, maximalPressScale: 0.8 });
export function resolveMoeMotion(preference: MoePreferences['motion'], systemReduced: boolean) {
  const reduced = systemReduced || preference === 'simple';
  return { reduced, duration: reduced ? 0 : preference === 'maximal' ? 380 : preference === 'lively' ? MOE_MOTION.slow : MOE_MOTION.normal,
    pressScale: reduced ? 1 : preference === 'maximal' ? MOE_MOTION.maximalPressScale : MOE_MOTION.pressScale,
    travel: reduced ? 0 : preference === 'maximal' ? 24 : preference === 'lively' ? 12 : 8 };
}
