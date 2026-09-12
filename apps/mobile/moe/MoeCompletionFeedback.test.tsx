import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppState } from 'react-native';
import { measure } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { MoeCompletionFeedbackHost, useMoeCompletionFeedbackActive } from './MoeCompletionFeedback';
import { useMoeCompletionRow } from './MoeCompletionRow';
import type { FeedbackAppearance } from './MoeCompletionFeedbackState';

const state = vi.hoisted(() => ({ reduced: false, listeners: new Set<(value: string) => void>() }));
vi.mock('./preferences', () => ({ useMoePreferences: () => ({ motion: 'lively' }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => state.reduced }));
vi.mock('@react-navigation/core', () => ({ NavigationContext: React.createContext(undefined) }));
vi.mock('lucide-react-native', () => ({ Check: (props: object) => React.createElement('Check', props) }));
vi.mock('react-native-reanimated', async (original) => ({ ...await original() as object, measure: vi.fn() }));
vi.mock('react-native-worklets', () => ({ runOnUISync: vi.fn((worklet, ...args) => worklet(...args)) }));
vi.mock('react-native', async (original) => ({ ...await original() as object, AppState: { currentState: 'active', addEventListener: (_: string, listener: (value: string) => void) => {
    state.listeners.add(listener); return { remove: () => state.listeners.delete(listener) };
} } }));

const appearance: FeedbackAppearance = { backgroundColor: '#fff', borderColor: '#aaa', borderWidth: 1, borderRadius: 20,
    textColor: '#111', fontSize: 15, lineHeight: 20, fontWeight: '500', textAlign: 'left', writingDirection: 'ltr', checkColor: '#173', checkForeground: '#fff' };
const details = { title: 'Only the visible task title', appearance };
type Transition = ReturnType<typeof useMoeCompletionRow>;
let transition: Transition; let feedbackActive = false; let tree: ReactTestRenderer | undefined;
function Row({ done = false }: { done?: boolean }) { transition = useMoeCompletionRow('task-a', done); return null; }
function Active() { feedbackActive = useMoeCompletionFeedbackActive(); return null; }
function layout({ row = true, done = false, scope = '/focus', active = true } = {}) {
    return <MoeCompletionFeedbackHost scopeKey={scope} active={active}><Active />{row ? <Row done={done} /> : null}</MoeCompletionFeedbackHost>;
}
function mount() {
    act(() => { tree = create(layout()); });
    act(() => tree!.root.findAllByProps({ testID: 'moe-completion-feedback-host' }).at(-1)!.props.onLayout());
}
function geometry() {
    const base = { x: 0, y: 0 };
    vi.mocked(measure).mockReturnValueOnce({ ...base, pageX: 20, pageY: 100, width: 400, height: 800 })
        .mockReturnValueOnce({ ...base, pageX: 32, pageY: 270, width: 320, height: 64 })
        .mockReturnValueOnce({ ...base, pageX: 82, pageY: 282, width: 220, height: 40 })
        .mockReturnValueOnce({ ...base, pageX: 48, pageY: 290, width: 24, height: 24 });
}
const paints = () => tree!.root.findAll((node) => typeof node.type === 'string' && node.props.testID?.startsWith('moe-completion-feedback-') && node.props.testID !== 'moe-completion-feedback-host');
beforeEach(() => { state.reduced = false; AppState.currentState = 'active'; feedbackActive = false; vi.useFakeTimers(); vi.mocked(measure).mockReset(); });
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; state.listeners.clear(); vi.clearAllTimers(); vi.useRealTimers(); });

it('measures synchronously before business dispatch and survives the original row being filtered out', () => {
    mount(); geometry(); const write = vi.fn();
    act(() => { transition.arm(1, details); write(); tree!.update(layout({ row: false })); });
    expect(write).toHaveBeenCalledOnce(); expect(measure).toHaveBeenCalledTimes(4); expect(feedbackActive).toBe(true);
    expect(paints()).toHaveLength(1);
    expect(paints()[0].props.pointerEvents).toBe('none'); expect(paints()[0].props.importantForAccessibility).toBe('no-hide-descendants');
    expect(paints()[0].props.style[1]).toMatchObject({ left: 12, top: 170, width: 320, height: 64 });
    expect(transition.exiting().animations).toEqual({ opacity: 0 });
    act(() => { vi.advanceTimersByTime(340); }); expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(false);
});

it('quick Undo clears host paint before the undo API and does not request old native restore entering', () => {
    mount(); geometry(); const old = transition;
    act(() => { old.arm(2, details); tree!.update(layout({ row: false })); });
    const undo = vi.fn();
    act(() => { old.cancel(2, true); undo(); tree!.update(layout()); });
    expect(undo).toHaveBeenCalledOnce(); expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(false);
    expect(transition.entering).toBeUndefined(); expect(vi.getTimerCount()).toBe(0);
    expect(old.settle(2, true)).toBe(false);
});

it('a retained Done row uses its real checkbox and clears the feedback', () => {
    mount(); geometry(); act(() => { transition.arm(3, details); tree!.update(layout({ done: true })); });
    expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('failure and same-task replacement honor operation identity', () => {
    mount(); geometry(); act(() => transition.arm(4, details));
    geometry(); act(() => { transition.arm(5, details); transition.settle(4, false); });
    expect(paints().map((node) => node.props.testID)).toEqual(['moe-completion-feedback-5']);
    act(() => { transition.settle(5, false); }); expect(paints()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
});

it('page change, modal deactivation and background dispose paint and pending cleanup', () => {
    mount(); geometry(); act(() => transition.arm(6, details));
    act(() => tree!.update(layout({ scope: '/lists' }))); expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
    geometry(); act(() => transition.arm(7, details));
    act(() => tree!.update(layout({ scope: '/lists', active: false }))); expect(paints()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    act(() => tree!.update(layout({ scope: '/lists', active: true }))); geometry(); act(() => transition.arm(8, details));
    act(() => state.listeners.forEach((listener) => listener('background')));
    expect(paints()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
});

it('null measurement immediately falls back without retries or delaying the store', () => {
    mount(); vi.mocked(measure).mockReturnValue(null); const write = vi.fn();
    act(() => { transition.arm(9, details); write(); });
    expect(write).toHaveBeenCalledOnce(); expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(transition.exiting().initialValues.opacity).toBe(1);
});

it('measurement failure and absence of a host leave the original immediate fallback available', () => {
    act(() => { tree = create(<Row />); });
    act(() => transition.arm(11, details));
    expect(measure).not.toHaveBeenCalled(); expect(transition.exiting().initialValues.opacity).toBe(1);
    act(() => tree!.unmount()); tree = undefined;
    mount(); vi.mocked(measure).mockImplementation(() => { throw new Error('No native measurement'); });
    const write = vi.fn(); act(() => { transition.arm(12, details); write(); });
    expect(write).toHaveBeenCalledOnce(); expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('reduced motion never captures a completion snapshot', () => {
    state.reduced = true; mount(); act(() => transition.arm(10, details));
    expect(measure).not.toHaveBeenCalled(); expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('a failed native hide gate cancels the snapshot before falling back to the original exit', () => {
    mount(); geometry();
    vi.mocked(runOnUISync).mockImplementationOnce((worklet, ...args) => worklet(...args))
        .mockImplementationOnce(() => { throw new Error('Unable to set native gate'); });
    const write = vi.fn(); act(() => { transition.arm(13, details); write(); });
    expect(write).toHaveBeenCalledOnce(); expect(feedbackActive).toBe(false); expect(paints()).toHaveLength(0);
    expect(transition.exiting().initialValues.opacity).toBe(1); expect(vi.getTimerCount()).toBe(0);
});
