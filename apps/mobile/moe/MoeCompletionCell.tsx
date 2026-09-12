import React from 'react';
import { View, type CellRendererProps } from 'react-native';

type CompletionCellProps = Pick<CellRendererProps<unknown>, 'children' | 'style' | 'onLayout' | 'onFocusCapture'>;

// Keep the native cell ancestor alive while a completed child exits. Forward
// VirtualizedList's measurement and focus handlers without changing its data.
export function MoeCompletionCell({ children, style, onLayout, onFocusCapture }: CompletionCellProps) {
    const viewProps = { style, onLayout, onFocusCapture };
    return (
        <View {...viewProps} collapsable={false}>
            {children}
        </View>
    );
}
