import { useEffect, useMemo, useRef } from 'react';
import { Animated, AppState, PanResponder } from 'react-native';
import { MOE_VISUAL } from '../../moe/visual-system';

/** Attach only to the header handle. Input, pickers and scrolling own their gestures. */
export function useQuickCaptureDismissGesture({ enabled, presented, reduced, onDismiss }: {
  enabled: boolean; presented: boolean; reduced: boolean; onDismiss: () => void;
}) {
  const offset = useRef(new Animated.Value(0)).current;
  const active = useRef(AppState.currentState === 'active');
  const current = useRef({ enabled, reduced, onDismiss });
  current.current = { enabled, reduced, onDismiss };
  const responder = useMemo(() => {
    const reset = () => {
      offset.stopAnimation();
      if (current.current.reduced || !active.current) offset.setValue(0);
      else Animated.spring(offset, { toValue: 0, ...MOE_VISUAL.motion.lensSpring, useNativeDriver: true }).start();
    };
    return PanResponder.create({
      // The header has no tap action. Own DOWN before a Text child/native
      // target can keep the move negotiation from reaching this handle.
      onStartShouldSetPanResponder: () => current.current.enabled && active.current,
      onStartShouldSetPanResponderCapture: () => current.current.enabled && active.current,
      onMoveShouldSetPanResponder: (_event, gesture) => current.current.enabled && active.current
        && gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx) * 1.2,
      onPanResponderGrant: () => offset.stopAnimation(),
      onPanResponderMove: (_event, gesture) => {
        if (current.current.enabled && active.current) offset.setValue(Math.max(0, Math.min(120, gesture.dy * 0.72)));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (current.current.enabled && active.current && gesture.dy > Math.abs(gesture.dx) * 1.2
          && (gesture.dy >= 72 || (gesture.dy >= 28 && gesture.vy > 0.85))) {
          // Same immediate close request as X/backdrop; dirty drafts still confirm.
          current.current.onDismiss();
        }
        reset();
      },
      onPanResponderTerminate: reset,
      onPanResponderTerminationRequest: () => true,
    });
  }, [offset]);
  useEffect(() => {
    if (!presented) { offset.stopAnimation(); offset.setValue(0); }
  }, [offset, presented]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      active.current = state === 'active';
      if (!active.current) { offset.stopAnimation(); offset.setValue(0); }
    });
    return () => { subscription.remove(); offset.stopAnimation(); };
  }, [offset]);
  return { offset, panHandlers: responder.panHandlers };
}
