import React from 'react';
import { type CellRendererProps } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useMoeCompletionUndoPending } from './MoeCompletionFeedback';

type CompletionCellProps = Pick<CellRendererProps<unknown>, 'children' | 'style' | 'onLayout' | 'onFocusCapture'> & { item?: unknown };

// Keep the native cell ancestor alive while a completed child exits. Forward
// VirtualizedList's measurement and focus handlers without changing its data.
export function MoeCompletionCell({ children, style, onLayout, onFocusCapture, item }: CompletionCellProps) {
    const reduced = useReducedMotion();
    const candidate = item as { type?: string; kind?: string; task?: { id?: unknown } } | undefined;
    const taskId = candidate && (candidate.type === 'task' || candidate.kind === 'task') && typeof candidate.task?.id === 'string' ? candidate.task.id : undefined;
    const undoPending = useMoeCompletionUndoPending(taskId);
    const restoreCell = React.useRef({ taskId, skipLayout: false });
    if (restoreCell.current.taskId !== taskId) restoreCell.current = { taskId, skipLayout: false };
    if (undoPending) restoreCell.current.skipLayout = true;
    // Do not re-install a delayed transition as the restored row is revealed:
    // this native cell instance must never animate from the temporary Next slot.
    const skipLayout = restoreCell.current.skipLayout;
    const layout = React.useMemo(() => reduced || skipLayout ? undefined : LinearTransition.delay(120).duration(220), [reduced, skipLayout]);
    const viewProps = { style, onLayout, onFocusCapture };
    return (
        <Animated.View {...viewProps} collapsable={false} layout={layout}>
            {children}
        </Animated.View>
    );
}
