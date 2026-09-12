import { useCallback, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Platform, type TextInput } from 'react-native';

export type AndroidQuickCaptureExpandPhase = 'idle' | 'expanded';
type UseAndroidQuickCaptureExpandParams = {
  clearInitialFocusTimer: () => void;
  // Compatibility inputs; disclosure no longer waits for keyboard events.
  fallbackMs?: number;
  inputRef?: RefObject<TextInput | null>;
  setKeyboardAvoidingEnabled: Dispatch<SetStateAction<boolean>>;
  setOptionsExpanded: Dispatch<SetStateAction<boolean>>;
};
export function useAndroidQuickCaptureExpand({ clearInitialFocusTimer, setKeyboardAvoidingEnabled, setOptionsExpanded }: UseAndroidQuickCaptureExpandParams) {
  const [phase, setPhase] = useState<AndroidQuickCaptureExpandPhase>('idle');
  const clearAndroidOptionsExpand = useCallback(() => setPhase('idle'), []);
  const requestAndroidOptionsExpand = useCallback(() => {
    clearInitialFocusTimer();
    // The Dialog's measured viewport keeps the input and save reachable.
    setKeyboardAvoidingEnabled(true);
    setOptionsExpanded(true);
    setPhase('expanded');
  }, [clearInitialFocusTimer, setKeyboardAvoidingEnabled, setOptionsExpanded]);
  const collapseAndroidOptions = useCallback(() => {
    setKeyboardAvoidingEnabled(true);
    setOptionsExpanded(false);
    setPhase('idle');
  }, [setKeyboardAvoidingEnabled, setOptionsExpanded]);
  return { androidOptionsExpandPhase: Platform.OS === 'android' ? phase : 'idle', clearAndroidOptionsExpand, collapseAndroidOptions, requestAndroidOptionsExpand };
}
