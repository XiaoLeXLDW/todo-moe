import React from 'react';
import { type CellRendererProps } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/use-reduced-motion';

type CompletionCellProps = Pick<CellRendererProps<unknown>, 'children' | 'style' | 'onLayout' | 'onFocusCapture'>;

// Keep the native cell ancestor alive while a completed child exits. Forward
// VirtualizedList's measurement and focus handlers without changing its data.
export function MoeCompletionCell({ children, style, onLayout, onFocusCapture }: CompletionCellProps) {
    const reduced = useReducedMotion();
    const layout = React.useMemo(() => reduced ? undefined : LinearTransition.delay(120).duration(220), [reduced]);
    const viewProps = { style, onLayout, onFocusCapture };
    return (
        <Animated.View {...viewProps} collapsable={false} layout={layout}>
            {children}
        </Animated.View>
    );
}
