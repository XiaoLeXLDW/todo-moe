import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Animated as NativeAnimated, AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/core';
import { withTiming } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { MoeCompletionRow, MoeCompletionTitle, useMoeCompletionListLayout, useMoeCompletionRow } from './MoeCompletionRow';

const mocks = vi.hoisted(() => ({ preference: 'standard' as 'simple' | 'standard' | 'lively', reduced: false, deferWrites: false, onUI: false, appListeners: new Set<(state: string) => void>() }));
vi.mock('./preferences', () => ({ useMoePreferences: () => ({ motion: mocks.preference }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => mocks.reduced }));
vi.mock('@react-navigation/core', () => ({ NavigationContext: React.createContext(undefined) }));
vi.mock('react-native', async (original) => ({ ...(await original() as object),
    AppState: { currentState: 'active', addEventListener: (_: string, listener: (state: string) => void) => {
        mocks.appListeners.add(listener); return { remove: () => mocks.appListeners.delete(listener) };
    } },
}));
vi.mock('react-native-reanimated', async (original) => ({ ...(await original() as object),
    withTiming: vi.fn((target: number, config: { duration: number }) => ({ target, duration: config.duration })),
    useSharedValue: (initial: unknown) => {
        const ref = React.useRef<{ value: unknown } | null>(null);
        if (!ref.current) {
            let current = initial;
            ref.current = { get value() { return current; }, set value(next) {
                // Model removal occurring before the JS setter queue is drained.
                if (!mocks.deferWrites || mocks.onUI) current = next;
            } };
        }
        return ref.current;
    },
}));
vi.mock('react-native-worklets', () => ({ runOnUISync: vi.fn((worklet, ...args) => {
    mocks.onUI = true;
    try { return worklet(...args); } finally { mocks.onUI = false; }
}) }));

type Transition = ReturnType<typeof useMoeCompletionRow>;
const mounted: ReactTestRenderer[] = [];
function Harness({ id, completed = false, capture }: { id: string; completed?: boolean; capture: (value: Transition) => void }) {
    const transition = useMoeCompletionRow(id, completed);
    capture(transition);
    return <MoeCompletionRow transition={transition}><>{id}</></MoeCompletionRow>;
}
function mount(id: string) {
    const handle = { current: null as unknown as Transition };
    const capture = (transition: Transition) => { handle.current = transition; };
    let tree!: ReactTestRenderer;
    act(() => { tree = create(<Harness id={id} capture={capture} />); });
    mounted.push(tree);
    return { handle, tree, capture };
}
beforeEach(() => { mocks.preference = 'standard'; mocks.reduced = false; mocks.deferWrites = false; mocks.onUI = false; AppState.currentState = 'active'; vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => { for (const tree of mounted.splice(0)) act(() => tree.unmount()); mocks.appListeners.clear(); vi.useRealTimers(); });

describe('completion-only native row configuration (not a Fabric animation simulation)', () => {
    it('overrides an unfinished restoration entry when the intermediate row leaves', () => {
        const old = mount('undo-intermediate');
        act(() => { old.handle.current.arm(22); old.tree.unmount(); });
        act(() => old.handle.current.cancel(22, true));
        const intermediate = mount('undo-intermediate');
        const entry = intermediate.handle.current.entering!();
        act(() => intermediate.tree.unmount());
        const exit = intermediate.handle.current.exiting();
        // Reanimated merges new targets with a still-running layout animation.
        expect({ ...entry.animations, ...exit.animations }.opacity).toBe(0);
    });
    it('commits the UI gate before the caller can perform its immediate store write', () => {
        mocks.deferWrites = true;
        const { handle } = mount('ui-gate');
        const write = vi.fn(() => {
            expect(handle.current.exiting().animations.opacity).toEqual({ target: 0, duration: 300 });
        });
        act(() => { handle.current.arm(20); write(); });
        expect(write).toHaveBeenCalledOnce();
    });
    it('does not throw into the business path when the UI bridge is unavailable', () => {
        const { handle } = mount('missing-ui');
        vi.mocked(runOnUISync).mockImplementationOnce(() => { throw new Error('UI unavailable'); });
        const write = vi.fn();
        act(() => { handle.current.arm(21); write(); });
        expect(write).toHaveBeenCalledOnce();
        expect(handle.current.exiting().animations).toEqual({ opacity: 0 });
    });
    it('does not configure a fade for ordinary filtering, deletion or virtualization unmount', () => {
        const { tree, handle } = mount('ordinary');
        const exit = handle.current.exiting;
        act(() => tree.unmount());
        expect(exit()).toEqual({ initialValues: { opacity: 0 }, animations: { opacity: 0 } });
        expect(withTiming).not.toHaveBeenCalled();
    });
    it('arms each row independently before an immediate business callback', () => {
        const a = mount('independent-a'); const b = mount('independent-b');
        const write = vi.fn(() => { expect(a.handle.current.exiting().animations).not.toEqual({ opacity: 0 }); });
        act(() => { a.handle.current.arm(1); write(); });
        expect(write).toHaveBeenCalledOnce();
        expect(vi.mocked(withTiming).mock.calls.some(([value, config]) => value === 10 && config?.duration === 300)).toBe(true);
        expect(b.handle.current.exiting().animations).toEqual({ opacity: 0 });
        act(() => b.handle.current.arm(2));
        expect(b.handle.current.exiting().animations.opacity).toEqual({ target: 0, duration: 300 });
        expect(a.handle.current.exiting().animations).toEqual({ opacity: 0 });
    });
    it('a synchronous successful action does not disarm before React commits removal', () => {
        const { tree, handle } = mount('commit-race');
        const transition = handle.current;
        act(() => { transition.arm(11); transition.settle(11, true); tree.unmount(); });
        expect(transition.exiting().animations.opacity).toEqual({ target: 0, duration: 300 });
    });
    it('retained Done rows and failed operations do not arm later unrelated removal', () => {
        const row = mount('retained');
        act(() => { row.handle.current.arm(3); row.tree.update(<Harness id="retained" completed capture={row.capture} />); });
        expect(row.handle.current.exiting().animations).toEqual({ opacity: 0 });
        act(() => { row.handle.current.arm(4); row.handle.current.settle(4, false); });
        expect(row.handle.current.exiting().animations).toEqual({ opacity: 0 });
    });
    it('Undo requests restoration entry; old operation handlers cannot touch a new row instance', () => {
        const old = mount('undo-same-key'); const previous = old.handle.current;
        act(() => { previous.arm(5); old.tree.unmount(); });
        act(() => previous.cancel(5, true));
        const replacement = mount('undo-same-key');
        expect(replacement.handle.current.entering?.().animations.opacity).toEqual({ target: 1, duration: 220 });
        act(() => { replacement.handle.current.arm(6); previous.settle(5, false); previous.cancel(5); });
        expect(replacement.handle.current.exiting().animations.opacity).toEqual({ target: 0, duration: 300 });
        // This checks JS handle isolation, NOT cancellation of an old native node.
        expect(previous.exiting().animations).toEqual({ opacity: 0 });
    });
    it('stale operations do not cancel a newer operation on the same mounted row', () => {
        const { handle } = mount('new-operation');
        act(() => { handle.current.arm(7); handle.current.arm(8); handle.current.settle(7, false); });
        expect(handle.current.exiting().animations.opacity).toEqual({ target: 0, duration: 300 });
    });
    it('failed Undo clears its visual entry request without queuing any task data', () => {
        const old = mount('failed-undo');
        act(() => { old.handle.current.arm(15); old.tree.unmount(); });
        act(() => { old.handle.current.cancel(15, true); old.handle.current.cancel(15); });
        expect(mount('failed-undo').handle.current.entering).toBeUndefined();
    });
    it('restoration metadata expires lazily without JS timers', () => {
        const old = mount('expired-entry');
        act(() => { old.handle.current.arm(9); old.tree.unmount(); });
        act(() => old.handle.current.cancel(9, true));
        vi.advanceTimersByTime(1001);
        expect(mount('expired-entry').handle.current.entering).toBeUndefined();
        expect(vi.getTimerCount()).toBe(0);
    });
    it('background and route departure disarm visual work and clean observers without timers', () => {
        const callbacks = new Map<string, () => void>();
        const navigation = { isFocused: () => true, addListener: (name: string, callback: () => void) => { callbacks.set(name, callback); return () => callbacks.delete(name); } };
        let transition!: Transition; let tree!: ReactTestRenderer;
        act(() => { tree = create(<NavigationContext.Provider value={navigation as any}><Harness id="route" capture={(value) => { transition = value; }} /></NavigationContext.Provider>); });
        mounted.push(tree);
        act(() => { transition.arm(10); callbacks.get('blur')?.(); });
        expect(transition.exiting().animations).toEqual({ opacity: 0 });
        act(() => { transition.arm(11); mocks.appListeners.forEach((listener) => listener('background')); });
        expect(transition.exiting().animations).toEqual({ opacity: 0 });
        act(() => tree.unmount());
        expect(callbacks.size).toBe(0); expect(mocks.appListeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    });
    it('honors Simple/system reduction and keeps the lively row and feedback lifetime aligned', () => {
        mocks.preference = 'simple'; const simple = mount('simple'); act(() => simple.handle.current.arm(12));
        expect(simple.handle.current.exiting().animations).toEqual({ opacity: 0 });
        mocks.preference = 'standard'; mocks.reduced = true; const reduced = mount('system'); act(() => reduced.handle.current.arm(13));
        expect(reduced.handle.current.exiting().animations).toEqual({ opacity: 0 });
        mocks.reduced = false; mocks.preference = 'lively'; const lively = mount('lively'); act(() => lively.handle.current.arm(14));
        expect(lively.handle.current.exiting().animations.opacity).toEqual({ target: 0, duration: 460 });
    });
    it('keeps list reflow quick when a task is removed', () => {
        let result: any;
        function List() { result = useMoeCompletionListLayout(); return null; }
        let tree!: ReactTestRenderer; act(() => { tree = create(<List />); }); mounted.push(tree);
        expect(result.options.duration).toBe(180);
        mocks.reduced = true; act(() => tree.update(<List />));
        expect(result).toBeUndefined();
    });
    it('the title uses the shared fade target and returns to full opacity on rollback', () => {
        const timing = vi.spyOn(NativeAnimated, 'timing');
        let tree!: ReactTestRenderer;
        act(() => { tree = create(<MoeCompletionTitle completed={false}>Visible task text</MoeCompletionTitle>); });
        mounted.push(tree);
        act(() => tree.update(<MoeCompletionTitle completed>Visible task text</MoeCompletionTitle>));
        expect(timing).toHaveBeenLastCalledWith(expect.anything(), { toValue: 0.5, duration: 180, useNativeDriver: true });
        act(() => tree.update(<MoeCompletionTitle completed={false}>Visible task text</MoeCompletionTitle>));
        expect(timing).toHaveBeenLastCalledWith(expect.anything(), { toValue: 1, duration: 180, useNativeDriver: true });
        act(() => tree.unmount());
        expect(vi.getTimerCount()).toBe(0);
        timing.mockRestore();
    });
});
