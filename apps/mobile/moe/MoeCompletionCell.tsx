import React from 'react';
import { type CellRendererProps } from 'react-native';
import Animated, { withTiming, type LayoutAnimationsValues } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoePreferences } from './preferences';
import { resolveMoeCompletionMotion } from './completion-motion';
import { useMoeCompletionLayoutGate } from './MoeCompletionFeedback';

type CompletionCellProps = Pick<CellRendererProps<unknown>, 'children' | 'style' | 'onLayout' | 'onFocusCapture'> & { item?: unknown };

// Keep the native cell ancestor alive while a completed child exits. Forward
// VirtualizedList's measurement and focus handlers without changing its data.
export function MoeCompletionCell({ children, style, onLayout, onFocusCapture }: CompletionCellProps) {
    const reduced = useReducedMotion();
    const preferences = useMoePreferences();
    const motion = resolveMoeCompletionMotion(preferences.motion, reduced);
    const gate = useMoeCompletionLayoutGate();
    const layout = React.useMemo(() => motion.reduced ? undefined : (values: LayoutAnimationsValues) => {
        'worklet';
        const state = gate?.value;
        const epoch = state?.epoch ?? 0;
        const target = { originX: values.targetOriginX, originY: values.targetOriginY,
            width: values.targetWidth, height: values.targetHeight };
        if (state && (state.pending || Date.now() < state.until)) return { initialValues: target, animations: target };
        // A single timing curve (rather than withDelay) can observe Undo even
        // during the initial confirmation hold. An old epoch stays snapped, including
        // after the handoff closes, so old positions can never animate back.
        const easing = (progress: number) => {
            const latest = gate?.value;
            if (latest && (latest.epoch !== epoch || latest.pending || Date.now() < latest.until)) return 1;
            const hold = 0.35;
            return Math.min(1, Math.max(0, (progress - hold) / (1 - hold)));
        };
        const config = { duration: motion.exitMs, easing };
        return {
            initialValues: { originX: values.currentOriginX, originY: values.currentOriginY,
                width: values.currentWidth, height: values.currentHeight },
            animations: { originX: withTiming(target.originX, config), originY: withTiming(target.originY, config),
                width: withTiming(target.width, config), height: withTiming(target.height, config) },
        };
    }, [gate, motion.reduced, motion.exitMs]);
    const viewProps = { style, onLayout, onFocusCapture };
    return (
        <Animated.View {...viewProps} collapsable={false} layout={layout}>
            {children}
        </Animated.View>
    );
}
