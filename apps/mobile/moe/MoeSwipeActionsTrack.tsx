import React from 'react';
import { Animated as NativeAnimated, StyleSheet } from 'react-native';

export const MOE_SWIPE_FRICTION = 1.25;
export const MOE_SWIPE_OPEN_THRESHOLD = 72;
export const MOE_SWIPE_DRAG_OFFSET = 28;

type SwipeActionsTrackProps = {
    progress: NativeAnimated.AnimatedInterpolation<number>;
    dragX: NativeAnimated.AnimatedInterpolation<number>;
    children: React.ReactNode;
};

export function MoeSwipeActionsTrack({ progress, dragX, children }: SwipeActionsTrackProps) {
    return (
        <NativeAnimated.View
            style={[
                moeSwipeActionStyles.track,
                {
                    opacity: progress.interpolate({
                        inputRange: [0, 0.35, 1],
                        outputRange: [0, 0.72, 1],
                        extrapolate: 'clamp',
                    }),
                    transform: [
                        {
                            translateX: dragX.interpolate({
                                inputRange: [-172, 0],
                                outputRange: [0, 18],
                                extrapolate: 'clamp',
                            }),
                        },
                        {
                            scale: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.82, 1],
                                extrapolate: 'clamp',
                            }),
                        },
                    ],
                },
            ]}
        >
            {children}
        </NativeAnimated.View>
    );
}

export const moeSwipeActionStyles = StyleSheet.create({
    track: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
        marginLeft: 8,
    },
    secondary: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
        width: 78,
        borderRadius: 14,
        gap: 4,
    },
    destructive: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'stretch',
        width: 78,
        borderRadius: 14,
        gap: 4,
    },
    label: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
});
