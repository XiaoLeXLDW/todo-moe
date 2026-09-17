import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppState, StyleSheet, Text } from 'react-native';
import { measure, useAnimatedStyle } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { MoeCompletionFeedbackHost, useMoeCompletionFeedback, useMoeCompletionFeedbackActive, useMoeInteractiveListLayout } from './MoeCompletionFeedback';
import { MoeCompletionRow, useMoeCompletionRow } from './MoeCompletionRow';
import { settleStoreAction } from '../components/store-action-result';
import { MoeCompletionCell } from './MoeCompletionCell';
import type { FeedbackAppearance } from './MoeCompletionFeedbackState';

const state = vi.hoisted(() => ({ reduced: false, motion: 'lively', listeners: new Set<(value: string) => void>() }));
vi.mock('./preferences', () => ({ useMoePreferences: () => ({ motion: state.motion }) }));
vi.mock('../hooks/use-reduced-motion', () => ({ useReducedMotion: () => state.reduced }));
vi.mock('@react-navigation/core', () => ({ NavigationContext: React.createContext(undefined) }));
vi.mock('lucide-react-native', () => ({ Check: (props: object) => React.createElement('Check', props) }));
vi.mock('react-native-reanimated', async (original) => ({ ...await original() as object, measure: vi.fn(),
    useAnimatedStyle: vi.fn((updater: () => object) => updater()),
    withTiming: vi.fn((target: number, config: { duration: number; easing?: (progress: number) => number }) => ({ target, config })),
}));
vi.mock('react-native-worklets', () => ({ runOnUISync: vi.fn((worklet, ...args) => worklet(...args)) }));
vi.mock('react-native', async (original) => ({ ...await original() as object, AppState: { currentState: 'active', addEventListener: (_: string, listener: (value: string) => void) => {
    state.listeners.add(listener); return { remove: () => state.listeners.delete(listener) };
} } }));

const appearance: FeedbackAppearance = { backgroundColor: '#fff', borderColor: '#aaa', borderWidth: 1, borderRadius: 20,
    textColor: '#111', fontSize: 15, lineHeight: 20, fontWeight: '500', textAlign: 'left', writingDirection: 'ltr', checkColor: '#173', checkForeground: '#fff' };
const details = { title: 'Only the visible task title', appearance };
type Transition = ReturnType<typeof useMoeCompletionRow>;
let transition: Transition; let feedbackActive = false; let tree: ReactTestRenderer | undefined;
let beginInteractiveListLayout: () => void = () => {};
function Row({ done = false, focused = true }: { done?: boolean; focused?: boolean }) {
    transition = useMoeCompletionRow('task-a', done);
    return <MoeCompletionCell style={undefined} item={{ type: 'task', task: { id: 'task-a' } }}><MoeCompletionRow transition={transition}><Text testID="restore-star-state">{focused ? 'filled' : 'hollow'}</Text></MoeCompletionRow></MoeCompletionCell>;
}
function Active() { feedbackActive = useMoeCompletionFeedbackActive(); return null; }
function InteractiveLayoutControl() { beginInteractiveListLayout = useMoeInteractiveListLayout(); return null; }
function layout({ row = true, done = false, focused = true, scope = '/focus', active = true } = {}) {
    return <MoeCompletionFeedbackHost scopeKey={scope} active={active}><Active /><InteractiveLayoutControl />{row ? <Row key={focused ? 'focus' : 'next'} done={done} focused={focused} /> : null}</MoeCompletionFeedbackHost>;
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
beforeEach(() => { state.reduced = false; state.motion = 'lively'; AppState.currentState = 'active'; feedbackActive = false; vi.useFakeTimers(); vi.mocked(measure).mockReset(); });
afterEach(() => { if (tree) act(() => tree!.unmount()); tree = undefined; state.listeners.clear(); vi.clearAllTimers(); vi.useRealTimers(); });

it('measures synchronously before business dispatch and survives the original row being filtered out', () => {
    mount(); geometry(); const write = vi.fn();
    act(() => { transition.arm(1, details); write(); tree!.update(layout({ row: false })); });
    expect(write).toHaveBeenCalledOnce(); expect(measure).toHaveBeenCalledTimes(4); expect(feedbackActive).toBe(true);
    expect(paints()).toHaveLength(1);
    expect(paints()[0].props.pointerEvents).toBe('none'); expect(paints()[0].props.importantForAccessibility).toBe('no-hide-descendants');
    expect(paints()[0].props.style[1]).toMatchObject({ left: 12, top: 170, width: 320, height: 64 });
    expect(transition.exiting().animations).toEqual({ opacity: 0 });
    act(() => { vi.advanceTimersByTime(680); }); expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(false);
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

it('hides only the canceled operation on UI before React removes the old paint', () => {
    let other!: ReturnType<typeof useMoeCompletionFeedback>;
    function Other() { other = useMoeCompletionFeedback('task-b'); return null; }
    act(() => { tree = create(<MoeCompletionFeedbackHost><Row /><Other /></MoeCompletionFeedbackHost>); });
    act(() => tree!.root.findAllByProps({ testID: 'moe-completion-feedback-host' }).at(-1)!.props.onLayout());
    geometry(); act(() => transition.arm(60, details));
    geometry(); act(() => { other.present('task-b', 61, details, 340); });
    const oldPaints = paints();
    const updaters = vi.mocked(useAnimatedStyle).mock.calls.slice(-2).map(([updater]) => updater);
    expect(oldPaints).toHaveLength(2); expect(updaters).toHaveLength(2);
    expect(updaters.map((updater) => updater())).toEqual([{ opacity: 1 }, { opacity: 1 }]);
    act(() => {
        transition.cancel(60, true); transition.beginUndo(60);
        // React has not committed this act yet. Re-evaluate the already-mounted
        // UI updaters against the synchronously delivered gate, not new props.
        expect(paints()).toHaveLength(2);
        expect(updaters.map((updater) => updater())).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    });
    expect(paints().map((paint) => paint.props.testID)).toEqual(['moe-completion-feedback-61']);
    act(() => { transition.finishUndo(60); });
    expect(updaters[0]()).toEqual({ opacity: 0 });
});

it('a retained Done row keeps only external fragments so Swipeable cannot clip them', () => {
    mount(); geometry(); act(() => { transition.arm(3, details); tree!.update(layout({ done: true })); });
    expect(paints()).toHaveLength(1); expect(feedbackActive).toBe(true);
    expect(paints()[0].findAllByType(Text)).toHaveLength(0);
    expect(transition.exiting().animations).toEqual({ opacity: 0 });
    act(() => { transition.cancel(3, true); });
    expect(paints()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
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

it('keeps non-interactive maximal shards only for their bounded lifetime after the row exits', () => {
    state.motion = 'maximal';
    mount(); geometry();
    act(() => { transition.arm(80, details); tree!.update(layout({ row: false })); });
    act(() => { vi.advanceTimersByTime(560); });
    expect(paints()).toHaveLength(1);
    expect(paints()[0].props.pointerEvents).toBe('none');
    expect(paints()[0].findAll(node => node.props.profile === 'maximal')).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(690); });
    expect(paints()).toHaveLength(0);
    expect(feedbackActive).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
});

it('dismisses fixed-position paint on finger movement without discarding pending Undo identity', () => {
    mount(); geometry();
    act(() => { transition.arm(70, details); transition.beginUndo(70); });
    expect(paints()).toHaveLength(1); expect(feedbackActive).toBe(true);
    const host = tree!.root.findByProps({ testID: 'moe-feedback-touch-host' });
    act(() => {
      host.props.onTouchStart({ nativeEvent: { pageX: 10, pageY: 10 } });
      host.props.onTouchMove({ nativeEvent: { pageX: 10, pageY: 24 } });
    });
    expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(true); expect(vi.getTimerCount()).toBe(0);
    act(() => transition.finishUndo(70));
    expect(feedbackActive).toBe(false);
});

it('keeps feedback through a tap but invalidates stale geometry on movement or host relayout', () => {
    mount(); geometry(); act(() => transition.arm(71, details));
    const host = tree!.root.findByProps({ testID: 'moe-feedback-touch-host' });
    act(() => {
      host.props.onTouchStart({ nativeEvent: { pageX: 20, pageY: 20 } });
      host.props.onTouchMove({ nativeEvent: { pageX: 23, pageY: 23 } });
      host.props.onTouchEnd();
    });
    expect(paints()).toHaveLength(1);
    act(() => {
      host.props.onTouchStart({ nativeEvent: { pageX: 20, pageY: 20 } });
      host.props.onTouchMove({ nativeEvent: { pageX: 31, pageY: 20 } });
    });
    expect(paints()).toHaveLength(0);
    geometry(); act(() => transition.arm(72, details));
    act(() => tree!.root.findByProps({ testID: 'moe-completion-feedback-host' }).props.onLayout());
    expect(paints()).toHaveLength(0); expect(feedbackActive).toBe(false);
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

const rowPaint = () => tree!.root.findByType(MoeCompletionRow).findAllByType('View' as unknown as React.ElementType)[0];
const cellPaint = () => tree!.root.findByType(MoeCompletionCell).findAllByType('View' as unknown as React.ElementType)[0];
const layoutValues = { currentOriginX: 0, currentOriginY: 100, currentWidth: 320, currentHeight: 64,
    targetOriginX: 0, targetOriginY: 180, targetWidth: 320, targetHeight: 64 };
type UndoVisual = Transition;

it('clips expanding row content to the animated cell height so it cannot cover its neighbor', () => {
    mount();
    expect(StyleSheet.flatten(cellPaint().props.style)).toMatchObject({ overflow: 'hidden' });
});

it('uses a short immediate layout transition for checklist expansion', () => {
    mount();
    act(() => beginInteractiveListLayout());
    const animation = cellPaint().props.layout({
        ...layoutValues,
        targetHeight: 300,
    }).animations.height;
    expect(animation.config.duration).toBeLessThanOrEqual(220);
    expect(animation.config.easing(0.1)).toBeGreaterThan(0);
});

it('hides the real unfocused intermediate row until both original Undo writes settle', async () => {
    mount(); geometry(); const old = transition as UndoVisual;
    act(() => { old.arm(30, details); tree!.update(layout({ row: false })); });
    let statusDone!: () => void; let focusDone!: () => void;
    const statusWrite = new Promise<void>((resolve) => { statusDone = resolve; });
    const focusWrite = new Promise<void>((resolve) => { focusDone = resolve; });
    const undo = vi.fn(async () => {
        tree!.update(layout({ focused: false })); // original moveTask notification
        await statusWrite;
        tree!.update(layout({ focused: true })); // original focus update notification
        await focusWrite;
    });
    let pending!: ReturnType<typeof settleStoreAction>;
    act(() => {
        old.cancel(30, true); old.beginUndo(30);
        pending = settleStoreAction(undo).then((outcome) => { old.finishUndo(30); return outcome; });
    });
    expect(undo).toHaveBeenCalledOnce(); expect(paints()).toHaveLength(0);
    expect(tree!.root.findAllByProps({ testID: 'restore-star-state' }).at(-1)!.props.children).toBe('hollow');
    expect(rowPaint().props.style).toEqual({ opacity: 0 });
    expect(rowPaint().props.pointerEvents).toBe('none');
    expect(cellPaint().props.layout(layoutValues).animations.originY).toBe(180);
    await act(async () => { statusDone(); await Promise.resolve(); });
    expect(rowPaint().props.style).toEqual({ opacity: 0 });
    await act(async () => { focusDone(); await pending; });
    expect(rowPaint().props.style).toBeUndefined();
    expect(cellPaint().props.layout(layoutValues).animations.originY).toBe(180);
    expect(tree!.root.findAllByProps({ testID: 'restore-star-state' }).at(-1)!.props.children).toBe('filled');
    expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('failed Undo clears its gate and exposes the actual partial result without inventing a star', async () => {
    mount(); geometry(); const old = transition as UndoVisual;
    act(() => { old.arm(31, details); tree!.update(layout({ row: false })); });
    let fail!: (error: Error) => void;
    const focusWrite = new Promise<void>((_, reject) => { fail = reject; });
    let pending!: ReturnType<typeof settleStoreAction>;
    act(() => {
        old.cancel(31, true); old.beginUndo(31);
        pending = settleStoreAction(() => { tree!.update(layout({ focused: false })); return focusWrite; })
            .then((outcome) => { old.finishUndo(31); return outcome; });
    });
    expect(rowPaint().props.style).toEqual({ opacity: 0 });
    await act(async () => { fail(new Error('focus persistence failed')); await pending; });
    expect((await pending).ok).toBe(false);
    expect(rowPaint().props.style).toBeUndefined();
    expect(cellPaint().props.layout(layoutValues).animations.originY).toBe(180);
    expect(tree!.root.findAllByProps({ testID: 'restore-star-state' }).at(-1)!.props.children).toBe('hollow');
    expect(feedbackActive).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('one Host gate snaps waiting row/header/neighbor layouts together and later permits fresh animations', () => {
    act(() => { tree = create(<MoeCompletionFeedbackHost scopeKey="group"><Row />
        <MoeCompletionCell style={undefined} item={{ type: 'section' }}><Text>Today header</Text></MoeCompletionCell>
        <MoeCompletionCell style={undefined} item={{ type: 'task', task: { id: 'neighbor' } }}><Text>Neighbor</Text></MoeCompletionCell>
    </MoeCompletionFeedbackHost>); });
    act(() => { tree!.root.findAllByProps({ testID: 'moe-completion-feedback-host' }).at(-1)!.props.onLayout(); });
    const cells = tree!.root.findAllByType(MoeCompletionCell).map((cell) => cell.findAllByType('View' as unknown as React.ElementType)[0]);
    const oldAnimations = cells.map((cell) => cell.props.layout(layoutValues).animations.originY);
    expect(oldAnimations).toHaveLength(3);
    oldAnimations.forEach((animation) => expect(animation.config.easing(0.1)).toBe(0));
    act(() => { transition.arm(45); transition.cancel(45, true); transition.beginUndo(45); });
    // Already-created timing curves observe the gate inside their hold period;
    // newly requested layouts use the same immediate final coordinates.
    oldAnimations.forEach((animation) => expect(animation.config.easing(0.1)).toBe(1));
    cells.forEach((cell) => {
        expect(cell.props.layout(layoutValues).animations.originY).toBe(180);
        expect(cell.props.pointerEvents).toBeUndefined();
        expect(cell.props.importantForAccessibility).toBeUndefined();
    });
    act(() => { transition.finishUndo(45); });
    cells.forEach((cell) => expect(cell.props.layout(layoutValues).animations.originY).toBe(180));
    act(() => { vi.advanceTimersByTime(341); });
    cells.forEach((cell) => {
        const fresh = cell.props.layout(layoutValues).animations.originY;
        expect(fresh.config.duration).toBe(460);
        expect(fresh.config.easing(0.1)).toBe(0);
        expect(fresh.config.easing(0.8)).toBeGreaterThan(0);
        expect(fresh.config.easing(0.8)).toBeLessThan(1);
    });
    oldAnimations.forEach((animation) => expect(animation.config.easing(0.8)).toBe(1));
    expect(vi.getTimerCount()).toBe(0);
});
