import { useEffect, useRef, useState } from 'react';
import { Animated, AppState } from 'react-native';
import { MOE_VISUAL } from '../../moe/visual-system';

/** Retain the existing modal for its exit, never a second draft. Closing remains
 * an immediate owner notification; the completion callback only cleans UI. */
export function useQuickCapturePresentation(visible: boolean, reduced: boolean, onDidHide?: () => void) {
  const [presented, setPresented] = useState(visible);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const progress = useRef(new Animated.Value(0)).current;
  const current = useRef({ visible, onDidHide });
  current.current = { visible, onDidHide };
  const wasPresented = useRef(visible);
  useEffect(() => {
    let cancelled = false;
    progress.stopAnimation();
    if (visible) { wasPresented.current = true; setPresented(true); }
    const finish = () => {
      if (cancelled || current.current.visible || !wasPresented.current) return;
      wasPresented.current = false;
      setPresented(false);
      current.current.onDidHide?.();
    };
    if (reduced || !active) {
      progress.setValue(visible ? 1 : 0);
      finish();
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? MOE_VISUAL.motion.keyboardMs : MOE_VISUAL.motion.settleMs,
      useNativeDriver: true,
    });
    animation.start((result) => { if (result?.finished !== false) finish(); });
    return () => { cancelled = true; animation.stop(); };
  }, [active, progress, reduced, visible]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => { subscription.remove(); progress.stopAnimation(); };
  }, [progress]);
  return { presented, progress, samplingEnabled: visible && active };
}
