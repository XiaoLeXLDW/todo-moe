import React, { useRef, useState } from 'react';
import { Keyboard, Platform, type TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAndroidQuickCaptureExpand } from './useAndroidQuickCaptureExpand';

type Snapshot = ReturnType<typeof useAndroidQuickCaptureExpand> & { optionsExpanded: boolean; keyboardAvoidingEnabled: boolean; input: React.RefObject<TextInput | null> };
let snapshot: Snapshot;
const mounted: ReactTestRenderer[] = [];
function Harness() {
  const input = useRef<TextInput | null>(null);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [keyboardAvoidingEnabled, setKeyboardAvoidingEnabled] = useState(true);
  const controller = useAndroidQuickCaptureExpand({ clearInitialFocusTimer: vi.fn(), inputRef: input, setKeyboardAvoidingEnabled, setOptionsExpanded });
  snapshot = { ...controller, input, optionsExpanded, keyboardAvoidingEnabled };
  return null;
}
afterEach(() => { for (const tree of mounted.splice(0)) act(() => tree.unmount()); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Android More preserves the measured keyboard viewport', () => {
  it.each([true, false])('expands immediately without blur, dismiss, listeners or fallback timers (keyboard visible=%s)', (visible) => {
    const original = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    try {
      vi.useFakeTimers(); vi.spyOn(Keyboard, 'isVisible').mockReturnValue(visible);
      const dismiss = vi.spyOn(Keyboard, 'dismiss'); const listen = vi.spyOn(Keyboard, 'addListener');
      act(() => { mounted.push(create(<Harness />)); });
      const blur = vi.fn(); snapshot.input.current = { blur } as unknown as TextInput;
      act(() => snapshot.requestAndroidOptionsExpand());
      expect(snapshot.optionsExpanded).toBe(true); expect(snapshot.keyboardAvoidingEnabled).toBe(true);
      expect(snapshot.androidOptionsExpandPhase).toBe('expanded');
      expect(blur).not.toHaveBeenCalled(); expect(dismiss).not.toHaveBeenCalled(); expect(listen).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally { if (original) Object.defineProperty(Platform, 'OS', original); }
  });
  it('does not replay a delayed expansion after fast collapse or cleanup', () => {
    vi.useFakeTimers(); act(() => { mounted.push(create(<Harness />)); });
    act(() => { snapshot.requestAndroidOptionsExpand(); snapshot.collapseAndroidOptions(); snapshot.clearAndroidOptionsExpand(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(snapshot.optionsExpanded).toBe(false); expect(snapshot.keyboardAvoidingEnabled).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
