import { LayoutAnimation } from 'react-native';
import { resolveMoeMotion } from './preference-model';
import { getMoePreferences } from './preferences';

/** Native retains only visual removal nodes; task ownership remains in the original store. */
export function animateMoeListMutation(systemReduced: boolean) {
  const motion = resolveMoeMotion(getMoePreferences().motion, systemReduced);
  if (motion.reduced) return;
  try {
    LayoutAnimation?.configureNext({
      duration: motion.duration,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
  } catch { /* A missing/failed visual facility must never prevent a store write. */ }
}
