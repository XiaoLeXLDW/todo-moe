import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated as NativeAnimated, AppState, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { measure, useAnimatedRef, useAnimatedStyle, useSharedValue, type AnimatedRef, type SharedValue } from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';
import { NavigationContext } from '@react-navigation/core';
import { useMoePreferences } from './preferences';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { resolveMoeCompletionMotion } from './completion-motion';
import { MoeCompletionCheck } from './MoeCompletionCheck';
import { MoeCelebrationLayerHost } from './MoeCelebrationLayer';
import { MoeCompletionParticles } from './MoeCompletionParticles';
import { createCompletionFeedbackStore, feedbackGeometry, type CompletionFeedback, type FeedbackAppearance, type FeedbackLayoutGate } from './MoeCompletionFeedbackState';

export type CompletionMeasureRefs = { row: AnimatedRef<View>; title: AnimatedRef<Text>; check: AnimatedRef<View> };
export type CompletionFeedbackDetails = { title: string; appearance: FeedbackAppearance };
type FeedbackStore = ReturnType<typeof createCompletionFeedbackStore>;
type FeedbackHost = { store: FeedbackStore; hostRef: AnimatedRef<View>; layoutGate: SharedValue<FeedbackLayoutGate>; available: () => boolean };
const Context = createContext<FeedbackHost | null>(null);
const noSubscribe = () => () => {};
const falseSnapshot = () => false;

export function useMoeCompletionFeedbackActive() {
    const host = useContext(Context);
    const getSnapshot = useCallback(() => host?.store.hasFeedback() ?? false, [host]);
    return useSyncExternalStore(host?.store.subscribe ?? noSubscribe, getSnapshot, falseSnapshot);
}

export function useMoeCompletionUndoPending(taskId?: string) {
    const host = useContext(Context);
    const getSnapshot = useCallback(() => taskId ? host?.store.isUndoing(taskId) ?? false : false, [host, taskId]);
    return useSyncExternalStore(host?.store.subscribe ?? noSubscribe, getSnapshot, falseSnapshot);
}

export function useMoeCompletionLayoutGate() { return useContext(Context)?.layoutGate; }

/** One stable paint host per native window, outside the list's filtered cells. */
export function MoeCompletionFeedbackHost({ children, active = true, scopeKey = '' }: {
    children: React.ReactNode; active?: boolean; scopeKey?: string;
}) {
    const store = useMemo(createCompletionFeedbackStore, []);
    const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const hostRef = useAnimatedRef<View>();
    const layoutGate = useSharedValue<FeedbackLayoutGate>(store.getLayoutGate());
    const navigation = useContext(NavigationContext);
    const ready = useRef(false);
    const enabled = useRef(false);
    const touchOrigin = useRef<{ x: number; y: number } | null>(null);
    useLayoutEffect(() => {
        let previous: FeedbackLayoutGate | undefined;
        const syncLayoutGate = () => {
            const next = store.getLayoutGate();
            if (previous === next) return;
            previous = next;
            try {
                runOnUISync((target, value) => { 'worklet'; target.value = value; }, layoutGate, next);
            } catch { /* Visual scheduling must not block Undo's store call. */ }
        };
        const unsubscribeLayout = store.subscribe(syncLayoutGate);
        const updateEnabled = () => { enabled.current = active && AppState.currentState === 'active' && navigation?.isFocused() !== false; };
        const leave = () => { enabled.current = false; store.clear(); };
        updateEnabled();
        store.clear();
        const subscription = AppState.addEventListener('change', (state) => {
            enabled.current = active && state === 'active' && navigation?.isFocused() !== false;
            if (!enabled.current) store.clear();
        });
        const blur = navigation?.addListener('blur', leave);
        const beforeRemove = navigation?.addListener('beforeRemove', leave);
        const focus = navigation?.addListener('focus', updateEnabled);
        return () => { enabled.current = false; subscription.remove(); blur?.(); beforeRemove?.(); focus?.(); store.clear(); unsubscribeLayout(); };
    }, [active, layoutGate, navigation, scopeKey, store]);
    const host = useMemo(() => ({ store, hostRef, layoutGate, available: () => enabled.current && ready.current }), [hostRef, layoutGate, store]);
    const rememberTouch = useCallback((event: GestureResponderEvent) => {
        touchOrigin.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
    }, []);
    const dismissAfterRealMove = useCallback((event: GestureResponderEvent) => {
        const origin = touchOrigin.current;
        if (!origin) return;
        const dx = event.nativeEvent.pageX - origin.x;
        const dy = event.nativeEvent.pageY - origin.y;
        if ((dx * dx) + (dy * dy) < 64) return;
        touchOrigin.current = null;
        store.dismissVisuals();
    }, [store]);
    const forgetTouch = useCallback(() => { touchOrigin.current = null; }, []);
    return (
        <Context.Provider value={host}>
          <MoeCelebrationLayerHost active={active} scopeKey={scopeKey}>
            <View style={styles.host} testID="moe-feedback-touch-host"
                onTouchStart={rememberTouch} onTouchMove={dismissAfterRealMove}
                onTouchEnd={forgetTouch} onTouchCancel={forgetTouch}>
                {children}
                <Animated.View ref={hostRef} collapsable={false} onLayout={() => {
                    if (ready.current) store.dismissVisuals();
                    ready.current = true;
                }}
                    testID="moe-completion-feedback-host"
                    pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden style={styles.layer}>
                    {entries.map((entry) => <FeedbackPaint key={`${entry.taskId}:${entry.operationId}`} entry={entry} />)}
                </Animated.View>
            </View>
          </MoeCelebrationLayerHost>
        </Context.Provider>
    );
}

export function useMoeCompletionFeedback(taskId: string) {
    const host = useContext(Context);
    const undoPending = useMoeCompletionUndoPending(taskId);
    const row = useAnimatedRef<View>();
    const title = useAnimatedRef<Text>();
    const check = useAnimatedRef<View>();
    const refs = useMemo(() => ({ row, title, check }), [check, row, title]);
    const present = useCallback((taskId: string, operationId: number, details: CompletionFeedbackDetails, durationMs: number) => {
        if (!host?.available() || AppState.currentState !== 'active') return false;
        try {
            const measured = runOnUISync((hostRef, rowRef, titleRef, checkRef) => {
                'worklet';
                const h = measure(hostRef); const r = measure(rowRef); const t = measure(titleRef); const c = measure(checkRef);
                return h && r && t && c ? { host: h, row: r, title: t, check: c } : null;
            }, host.hostRef, row, title, check);
            if (!measured) return false;
            const geometry = feedbackGeometry(measured.host, measured.row, measured.title, measured.check);
            if (!geometry) return false;
            return host.store.present({ operationId, taskId, title: details.title, appearance: details.appearance,
                ...geometry, expiresAt: Date.now() + Math.min(1400, Math.max(300, durationMs)) });
        } catch { return false; }
    }, [check, host, row, title]);
    const cancel = useCallback((taskId: string, operationId?: number) => host?.store.cancel(taskId, operationId), [host]);
    const retainParticles = useCallback((taskId: string, operationId: number) => host?.store.retainParticles(taskId, operationId) ?? false, [host]);
    const beginUndo = useCallback((taskId: string, operationId: number) => host?.available() && AppState.currentState === 'active'
        ? host.store.beginUndo(taskId, operationId) : false, [host]);
    const finishUndo = useCallback((taskId: string, operationId: number) => host?.store.finishUndo(taskId, operationId), [host]);
    return { refs, present, cancel, retainParticles, beginUndo, finishUndo, undoPending };
}

function FeedbackPaint({ entry }: { entry: CompletionFeedback }) {
    const preferences = useMoePreferences();
    const reduced = useReducedMotion();
    const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
    const gate = useMoeCompletionLayoutGate();
    const operationId = entry.operationId;
    // The same UI gate that snaps neighboring cells hides this old paint before
    // React commits its removal. Other task feedback remains visible.
    const visibility = useAnimatedStyle(() => ({ opacity: gate?.value.canceledOperationIds.includes(operationId) ? 0 : 1 }), [gate, operationId]);
    const emphasis = useRef(new NativeAnimated.Value(0)).current;
    const fragments = useRef(new NativeAnimated.Value(0)).current;
    const rowProgress = useRef(new NativeAnimated.Value(0)).current;
    const mark = useRef(new NativeAnimated.Value(0)).current;
    useEffect(() => {
        if (motion.reduced) { emphasis.setValue(1); rowProgress.setValue(1); mark.setValue(1); fragments.setValue(1); return; }
        const duration = Math.max(1, entry.expiresAt - Date.now());
        const animation = NativeAnimated.parallel([
            NativeAnimated.timing(fragments, { toValue: 1, duration: Math.min(motion.particleMs, duration), easing: (value) => value, useNativeDriver: true }),
            NativeAnimated.timing(emphasis, { toValue: 1, duration: Math.min(motion.checkMs, duration), easing: (value) => value, useNativeDriver: true }),
            NativeAnimated.timing(rowProgress, { toValue: 1, duration: Math.min(motion.rowExitMs, duration), easing: (value) => value, useNativeDriver: true }),
            NativeAnimated.timing(mark, { toValue: 1, duration: Math.min(motion.checkMs, duration), easing: (value) => value, useNativeDriver: false }),
        ]);
        animation.start();
        return () => { animation.stop(); emphasis.stopAnimation(); rowProgress.stopAnimation(); mark.stopAnimation(); fragments.stopAnimation(); };
    }, [entry.expiresAt, mark, emphasis, rowProgress, fragments, motion.reduced, motion.checkMs, motion.rowExitMs, motion.particleMs]);
    const { appearance: a, row, titleRect, check } = entry;
    return (
        <Animated.View collapsable={false} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
            testID={`moe-completion-feedback-${entry.operationId}`} style={[styles.paintGate, {
                left: row.x, top: row.y, width: row.width, height: row.height,
            }, visibility]}>
        {!entry.particlesOnly ? <NativeAnimated.View style={[styles.paint, { left: 0, top: 0, width: row.width, height: row.height,
                backgroundColor: a.backgroundColor, borderColor: a.borderColor, borderWidth: a.borderWidth, borderRadius: a.borderRadius,
                opacity: rowProgress.interpolate({ inputRange: [0, motion.confirmationHold, 1], outputRange: [1, 1, 0] }),
                transform: [{ translateX: rowProgress.interpolate({ inputRange: [0, motion.confirmationHold, 1], outputRange: [0, 0, motion.travel] }) }],
            }]}>
            <NativeAnimated.Text numberOfLines={2} style={{ position: 'absolute', left: titleRect.x, top: titleRect.y,
                width: titleRect.width, height: titleRect.height, color: a.textColor, fontSize: a.fontSize,
                lineHeight: a.lineHeight, fontWeight: a.fontWeight, textAlign: a.textAlign, writingDirection: a.writingDirection,
                textDecorationLine: 'line-through', opacity: mark.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }),
            }}>{entry.title}</NativeAnimated.Text>
            <View pointerEvents="none" style={{ position: 'absolute', left: check.x, top: check.y, width: check.width, height: check.height }}>
                <MoeCompletionCheck reveal={mark} emphasis={emphasis} motion={motion} color={a.checkColor}
                    foreground={a.checkForeground} size={Math.min(check.width, check.height)} />
            </View>
        </NativeAnimated.View> : null}
        {motion.particles ? <View pointerEvents="none" style={{ position: 'absolute', left: check.x + check.width / 2, top: check.y + check.height / 2, overflow: 'visible' }}>
            <MoeCompletionParticles progress={fragments} color={a.checkColor} secondaryColor={a.textColor} seed={entry.operationId} profile={motion.particleProfile} />
        </View> : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({ host: { flex: 1 }, layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    paintGate: { position: 'absolute', overflow: 'visible' }, paint: { position: 'absolute', overflow: 'visible' } });
