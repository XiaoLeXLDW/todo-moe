import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_MOE_PREFERENCES, parseMoePreferences, type MoePreferences } from './preference-model';

export type { MoePreferences } from './preference-model';
const KEY = '@todo-moe/presentation/v1';
let value: MoePreferences = { ...DEFAULT_MOE_PREFERENCES };
let durableValue = value;
let hydration: Promise<void> | undefined;
let revision = 0;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const getMoePreferences = () => value;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function hydrateMoePreferences(): Promise<void> {
  if (!hydration) {
    const startingRevision = revision;
    hydration = AsyncStorage.getItem(KEY).then((raw) => {
      if (revision !== startingRevision || !raw) return;
      const stored = JSON.parse(raw) as Record<string, unknown>;
      const migrated = stored.presentationVersion === 2 ? stored : {
        ...stored,
        presentationVersion: 2,
        // The previous release called its strongest choices `lively` and
        // `light`. Upgrade those defaults once while preserving explicit
        // reduced/standard/off choices.
        motion: stored.motion === 'lively' || stored.motion === undefined ? 'maximal' : stored.motion,
        haptics: stored.haptics === 'light' || stored.haptics === undefined ? 'crisp' : stored.haptics,
      };
      value = parseMoePreferences(migrated);
      durableValue = value;
      emit();
      if (stored.presentationVersion !== 2) {
        const next = value;
        const ownRevision = ++revision;
        const writing = writeQueue.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
        writeQueue = writing;
        void writing.then(() => { if (revision === ownRevision) durableValue = next; }).catch(() => {});
      }
    }).catch(() => { /* A corrupt/unavailable preference never prevents opening tasks. */ });
  }
  return hydration;
}

/** Serialize writes; a slow older write must never overwrite a newer choice. */
export async function setMoePreferences(patch: Partial<MoePreferences>): Promise<void> {
  await hydrateMoePreferences();
  if (patch.appearance === undefined && (patch.theme !== undefined || patch.followSystem !== undefined)) {
    const followSystem = patch.followSystem ?? value.followSystem;
    patch = { ...patch, appearance: followSystem ? 'system' : (patch.theme ?? value.theme) === 'ink' ? 'dark' : 'light' };
  }
  value = parseMoePreferences({ ...value, ...patch });
  const next = value;
  const ownRevision = ++revision;
  emit();
  const writing = writeQueue.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
  writeQueue = writing;
  try { await writing; durableValue = next; } catch (error) {
    if (revision === ownRevision) { value = durableValue; emit(); }
    throw error;
  }
}

export function useMoePreferences(): MoePreferences {
  const preferences = useSyncExternalStore(subscribe, getMoePreferences, getMoePreferences);
  useEffect(() => { void hydrateMoePreferences(); }, []);
  return preferences;
}
