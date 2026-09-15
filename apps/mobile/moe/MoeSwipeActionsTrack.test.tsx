import React from 'react';
import { StyleSheet, View } from 'react-native';
import renderer from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { projectsScreenStyles } from '../components/projects-screen/projects-screen.styles';
import { styles as taskRowStyles } from '../components/swipeable-task-item/swipeable-task-item.styles';
import { MoeSwipeActionsTrack, moeSwipeActionStyles } from './MoeSwipeActionsTrack';

describe('MoeSwipeActionsTrack', () => {
  it('keeps task and project action rails on the same reveal animation', () => {
    const progress = {
      interpolate: vi.fn((config: unknown) => ({ source: 'progress', config })),
    };
    const dragX = {
      interpolate: vi.fn((config: unknown) => ({ source: 'dragX', config })),
    };

    renderer.act(() => {
      renderer.create(
        <MoeSwipeActionsTrack progress={progress as never} dragX={dragX as never}>
          <View />
        </MoeSwipeActionsTrack>,
      );
    });

    expect(progress.interpolate).toHaveBeenNthCalledWith(1, {
      inputRange: [0, 0.35, 1],
      outputRange: [0, 0.72, 1],
      extrapolate: 'clamp',
    });
    expect(dragX.interpolate).toHaveBeenCalledWith({
      inputRange: [-172, 0],
      outputRange: [0, 18],
      extrapolate: 'clamp',
    });
    expect(progress.interpolate).toHaveBeenNthCalledWith(2, {
      inputRange: [0, 1],
      outputRange: [0.82, 1],
      extrapolate: 'clamp',
    });
  });

  it('keeps both consumers on the same dimensions and spacing', () => {
    const track = StyleSheet.flatten(moeSwipeActionStyles.track);
    expect(track).toEqual(expect.objectContaining({
      alignSelf: 'stretch',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
      marginLeft: 8,
    }));
    expect(StyleSheet.flatten(taskRowStyles.taskItem).marginBottom).toBe(track.marginBottom);
    expect(StyleSheet.flatten(projectsScreenStyles.projectItem).marginBottom).toBe(track.marginBottom);
    expect(StyleSheet.flatten(moeSwipeActionStyles.secondary)).toEqual(expect.objectContaining({
      alignSelf: 'stretch',
      width: 78,
      borderRadius: 14,
    }));
    expect(StyleSheet.flatten(moeSwipeActionStyles.destructive)).toEqual(expect.objectContaining({
      alignSelf: 'stretch',
      width: 78,
      borderRadius: 14,
      backgroundColor: '#EF4444',
    }));
  });
});
