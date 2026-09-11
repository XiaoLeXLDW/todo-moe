import Constants from 'expo-constants';
import brand from './brand/config.json';

type BrandConfig = { name?: string; android?: { package?: string }; extra?: { todoMoe?: { channel?: string } } };

export function resolveMobileAppName(config?: BrandConfig | null): string {
  const dev = config?.extra?.todoMoe?.channel === 'development' || config?.android?.package?.endsWith('.dev');
  const expected = dev ? `${brand.name} Dev` : brand.name;
  // Ignore a stale upstream Expo config while keeping the actual fork variant.
  return config?.name === brand.name || config?.name === `${brand.name} Dev` ? config.name : expected;
}
export const getMobileAppName = () => resolveMobileAppName(Constants.expoConfig);

/** Only application self-references. Provider names, backup formats, attribution
 * and task content must never pass through a global name replacement. */
export const MOBILE_APP_NAME_KEYS = new Set([
  'app.name', 'onboarding.title', 'onboarding.startFreshTitle',
  'appLock.title', 'appLock.description', 'appLock.prompt', 'appLock.enablePrompt', 'appLock.cancelled',
  'settings.mobile.appLockDesc',
  'quickAdd.audioQueued', 'obsidian.bringIntoMindwtrSuccess',
  'digest.morningBody', 'digest.eveningBody', 'digest.weeklyReviewBody',
]);

export function brandMobileText(key: string, text: string, appName = getMobileAppName()): string {
  if (!MOBILE_APP_NAME_KEYS.has(key)) return text;
  if (key === 'app.name') return appName;
  return text.split('Mindwtr').join(appName);
}

/** Reminder scheduling reads translations before the React language provider exists. */
export function brandMobileTranslations<T extends Record<string, string>>(translations: T, appName = getMobileAppName()): T {
  const output = { ...translations };
  for (const key of MOBILE_APP_NAME_KEYS) {
    if (typeof output[key] === 'string') output[key as keyof T] = brandMobileText(key, output[key], appName) as T[keyof T];
  }
  return output;
}
