import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated as NativeAnimated, AppState, type TextProps } from 'react-native';
import { NavigationContext } from '@react-navigation/core';
import Animated, { LinearTransition, useSharedValue, withTiming } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';

// Bounded, short-lived visual identities only. No Task objects, rendered rows,
// store data, business callbacks or timers are retained here.
const restores = new Map<string, { operationId: number; expiresAt: number }>();
function takeRestore(taskId: string): boolean {
    const now = Date.now();
    for (const [id, value] of restores) if (value.expiresAt < now) restores.delete(id);
    const restored = restores.has(taskId);
    restores.delete(taskId);
    return restored;
}
function markRestore(taskId: string, operationId: number) {
    restores.delete(taskId);
    restores.set(taskId, { operationId, expiresAt: Date.now() + 1000 });
    if (restores.size > 32) restores.delete(restores.keys().next().value!);
}

function useCompletionMotion() {
    const preferences = useMoePreferences();
    const reduced = useReducedMotion();
    return resolveMoeCompletionMotion(preferences.motion, reduced);
}

/** The row exists only as long as the original list includes its task. Native
 * layout animations retain the departing visual node after React unmounts it. */
export function useMoeCompletionRow(taskId: string, completed: boolean) {
    const motion = useCompletionMotion();
    const navigation = useContext(NavigationContext);
    const mounted = useRef(true);
    const operation = useRef(0);
    const restored = useRef<boolean | undefined>(undefined);
    if (restored.current === undefined) restored.current = takeRestore(taskId);
    const visual = useSharedValue({ operationId: 0, armed: false });
    const setVisual = useCallback((operationId: number, armed: boolean) => {
        try {
            // A JS SharedValue setter is queued. Fabric can remove the row
            // before that queue runs, so commit this tiny gate on UI first.
            runOnUISync((value, nextId, nextArmed) => {
                'worklet';
                value.value = { operationId: nextId, armed: nextArmed };
            }, visual, operationId, armed);
        } catch {
            // An unavailable animation runtime must never block the store.
        }
    }, [visual]);
    const cancel = useCallback((operationId?: number, undo = false) => {
        if (operationId !== undefined && operation.current !== operationId) return;
        setVisual(operation.current, false);
        if (restores.get(taskId)?.operationId === operation.current) restores.delete(taskId);
        if (undo && !mounted.current && AppState.currentState === 'active') markRestore(taskId, operation.current);
    }, [setVisual, taskId]);
    const arm = useCallback((operationId: number) => {
        operation.current = operationId;
        setVisual(operationId, !motion.reduced && AppState.currentState === 'active' && navigation?.isFocused() !== false);
    }, [motion.reduced, navigation, setVisual]);
    const settle = useCallback((operationId: number, succeeded: boolean) => {
        // A successful promise can settle before React commits the filter's
        // unmount. Only a failed write disarms here; retained Done rows disarm
        // in their committed layout effect below.
        if (!succeeded) cancel(operationId);
    }, [cancel]);
    useLayoutEffect(() => {
        // A Done row still present (All/expanded Completed) must not animate a
        // later ordinary filter, deletion, navigation or virtualization removal.
        if (completed) cancel();
    }, [cancel, completed]);
    useEffect(() => {
        mounted.current = true;
        const inactive = () => { cancel(); restores.delete(taskId); };
        const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') inactive(); });
        const blur = navigation?.addListener('blur', inactive);
        const leave = navigation?.addListener('beforeRemove', inactive);
        return () => {
            mounted.current = false;
            subscription.remove(); blur?.(); leave?.();
            // Do not clear the visual SharedValue here: React unmount is the
            // trigger for the native exit. There is no JS completion timer.
        };
    }, [cancel, navigation, taskId]);
    const exiting = useMemo(() => () => {
        'worklet';
        const current = visual.value;
        if (!current.armed || motion.reduced) return { initialValues: {}, animations: {} };
        visual.value = { operationId: current.operationId, armed: false };
        return {
            initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
            animations: {
                opacity: withTiming(0, { duration: motion.exitMs }),
                transform: [{ translateX: withTiming(motion.travel, { duration: motion.exitMs }) }],
            },
            // No business or JS callbacks. A remounted row owns a different
            // SharedValue, so finishing this old node cannot affect the new row.
        };
    }, [motion.exitMs, motion.reduced, motion.travel, visual]);
    const entering = useMemo(() => {
        if (!restored.current || motion.reduced) return undefined;
        return () => {
            'worklet';
            return { initialValues: { opacity: 0 }, animations: { opacity: withTiming(1, { duration: motion.enterMs }) } };
        };
    }, [motion.enterMs, motion.reduced]);
    return { arm, cancel, settle, entering, exiting };
}

export function MoeCompletionRow({ transition, children }: {
    transition: ReturnType<typeof useMoeCompletionRow>; children: React.ReactNode;
}) {
    return <Animated.View collapsable={false} entering={transition.entering} exiting={transition.exiting}>{children}</Animated.View>;
}

export function useMoeCompletionListLayout() {
    const motion = useCompletionMotion();
    return useMemo(() => motion.reduced ? undefined : LinearTransition.duration(motion.exitMs), [motion.exitMs, motion.reduced]);
}

/** Only this task row's title fades; its text and business status stay original. */
export function MoeCompletionTitle({ completed, style, ...props }: TextProps & { completed: boolean }) {
    const motion = useCompletionMotion();
    const target = completed ? motion.finishedOpacity : 1;
    const opacity = useRef(new NativeAnimated.Value(target)).current;
    useEffect(() => {
        opacity.stopAnimation();
        if (motion.reduced || AppState.currentState !== 'active') { opacity.setValue(target); return; }
        const animation = NativeAnimated.timing(opacity, { toValue: target, duration: motion.textMs, useNativeDriver: true });
        animation.start();
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active') { animation.stop(); opacity.setValue(target); }
        });
        return () => { animation.stop(); subscription.remove(); };
    }, [motion.reduced, motion.textMs, opacity, target]);
    return <NativeAnimated.Text {...props} style={[style, completed && { textDecorationLine: 'line-through' }, { opacity }]} />;
}
