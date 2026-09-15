import React from 'react';
import renderer from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectRow } from './ProjectRow';
import { MoeSwipeActionsTrack } from '@/moe/MoeSwipeActionsTrack';

const hapticsMocks = vi.hoisted(() => ({
  impactAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('expo-haptics', () => ({
  impactAsync: hapticsMocks.impactAsync,
  NotificationFeedbackType: {
    Warning: 'warning',
  },
  selectionAsync: hapticsMocks.selectionAsync,
  notificationAsync: hapticsMocks.notificationAsync,
}));

vi.mock('lucide-react-native', () => ({
  AlertTriangle: (props: any) => React.createElement('AlertTriangle', props),
  Copy: (props: any) => React.createElement('Copy', props),
  Star: (props: any) => React.createElement('Star', props),
  Trash2: (props: any) => React.createElement('Trash2', props),
}));

vi.mock('@/components/app-pressable', () => ({
  AppPressable: ({ children, ...props }: any) => React.createElement('AppPressable', props, children),
}));

vi.mock('react-native-gesture-handler', () => ({
  Swipeable: React.forwardRef(function SwipeableMock({ children, renderLeftActions, renderRightActions, ...props }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ close: () => undefined }));
    const animated = { interpolate: (config: unknown) => ({ config }) };
    return React.createElement(
      'Swipeable',
      props,
      renderLeftActions ? renderLeftActions(animated, animated) : null,
      children,
      renderRightActions ? renderRightActions(animated, animated) : null,
    );
  }),
}));

const project = {
  id: 'project-1',
  title: 'Redesign Client Website',
  status: 'active',
  isFocused: false,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
} as any;

const tc = {
  cardBg: '#111827',
  secondaryText: '#94a3b8',
  text: '#f8fafc',
  tint: '#3b82f6',
};

const statusPalette = {
  active: { text: '#ffffff', bg: '#111111', border: '#222222' },
  waiting: { text: '#ffffff', bg: '#111111', border: '#222222' },
  someday: { text: '#ffffff', bg: '#111111', border: '#222222' },
  archived: { text: '#ffffff', bg: '#111111', border: '#222222' },
};

describe('ProjectRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses one-way left swiping for project actions', () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <ProjectRow
          project={project}
          tc={tc}
          focusedCount={0}
          statusPalette={statusPalette as any}
          t={(key) => key}
          onDeleteProject={vi.fn()}
          onDuplicateProject={vi.fn()}
          onOpenProject={vi.fn()}
          onToggleProjectFocus={vi.fn()}
        />,
      );
    });

    const swipeable = tree.root.find((node) => (node.type as unknown) === 'Swipeable');
    expect(swipeable.props.friction).toBe(1.25);
    expect(swipeable.props.leftThreshold).toBeUndefined();
    expect(swipeable.props.rightThreshold).toBe(72);
    expect(swipeable.props.dragOffsetFromLeftEdge).toBeUndefined();
    expect(swipeable.props.dragOffsetFromRightEdge).toBe(28);
    expect(swipeable.props.overshootLeft).toBeUndefined();
    expect(swipeable.props.overshootRight).toBe(false);
  });

  it('uses a 12px hitSlop and triggers selection haptics when focusing a project', () => {
    const onToggleProjectFocus = vi.fn();

    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <ProjectRow
          project={project}
          tc={tc}
          focusedCount={0}
          statusPalette={statusPalette as any}
          t={(key) => key}
          onDeleteProject={vi.fn()}
          onDuplicateProject={vi.fn()}
          onOpenProject={vi.fn()}
          onToggleProjectFocus={onToggleProjectFocus}
        />,
      );
    });

    const focusButton = tree.root.find((node) => node.props.testID === 'project-row-focus-project-1');

    expect(focusButton.props.hitSlop).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });

    renderer.act(() => {
      focusButton.props.onPress();
    });

    expect(hapticsMocks.selectionAsync).toHaveBeenCalledTimes(1);
    expect(onToggleProjectFocus).toHaveBeenCalledWith('project-1');
  });

  it('shows the project task count from the precomputed summary', () => {
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <ProjectRow
          project={project}
          taskSummary={{ activeTaskCount: 7 }}
          tc={tc}
          focusedCount={0}
          statusPalette={statusPalette as any}
          t={(key) => ({ 'common.tasks': 'tasks' }[key] ?? key)}
          onDeleteProject={vi.fn()}
          onDuplicateProject={vi.fn()}
          onOpenProject={vi.fn()}
          onToggleProjectFocus={vi.fn()}
        />,
      );
    });

    const countBadge = tree.root.find((node) => node.props.accessibilityLabel === '7 tasks');

    expect(countBadge.findByType(Text).props.children).toBe(7);
  });

  it('uses warning haptics for confirmed project deletion from the swipe action', () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    const onDeleteProject = vi.fn();

    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <ProjectRow
          project={project}
          tc={tc}
          focusedCount={0}
          statusPalette={statusPalette as any}
          t={(key) =>
            ({
              'projects.title': 'Projects',
              'projects.deleteConfirm': 'Delete this project?',
              'projects.duplicate': 'Duplicate',
              'common.cancel': 'Cancel',
              'common.delete': 'Delete',
            }[key] ?? key)
          }
          onDeleteProject={onDeleteProject}
          onDuplicateProject={vi.fn()}
          onOpenProject={vi.fn()}
          onToggleProjectFocus={vi.fn()}
        />,
      );
    });

    const deleteButton = tree.root.find((node) => node.props.testID === 'project-row-delete-project-1');

    renderer.act(() => {
      deleteButton.props.onPress();
    });

    expect(hapticsMocks.selectionAsync).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Projects',
      'Delete this project?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive', onPress: expect.any(Function) }),
      ]),
    );

    const buttons = alertSpy.mock.calls[0]?.[2] as { text?: string; onPress?: () => void }[];
    const deleteAction = buttons.find((button) => button.text === 'Delete');

    renderer.act(() => {
      deleteAction?.onPress?.();
    });

    expect(hapticsMocks.notificationAsync).toHaveBeenCalledWith('warning');
    expect(onDeleteProject).toHaveBeenCalledWith('project-1');
  });

  it('reveals duplicate and delete together through the shared task-row action track', () => {
    const onDuplicateProject = vi.fn();
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(
        <ProjectRow
          project={project}
          tc={tc}
          focusedCount={0}
          statusPalette={statusPalette as any}
          t={(key) => ({ 'projects.duplicate': 'Duplicate' }[key] ?? key)}
          onDeleteProject={vi.fn()}
          onDuplicateProject={onDuplicateProject}
          onOpenProject={vi.fn()}
          onToggleProjectFocus={vi.fn()}
        />,
      );
    });

    expect(tree.root.findAllByType(MoeSwipeActionsTrack)).toHaveLength(1);
    const duplicateButton = tree.root.find((node) => node.props.testID === 'project-row-duplicate-project-1');
    const deleteButton = tree.root.find((node) => node.props.testID === 'project-row-delete-project-1');

    expect(duplicateButton.props.accessibilityLabel).toBe('Duplicate');
    expect(deleteButton.props.accessibilityLabel).toBe('common.delete');

    renderer.act(() => {
      duplicateButton.props.onPress();
    });

    expect(hapticsMocks.selectionAsync).toHaveBeenCalledTimes(1);
    expect(onDuplicateProject).toHaveBeenCalledWith('project-1');
  });

  it('distinguishes completed and cancelled closed projects', () => {
    const renderStatus = (cancelledAt?: string) => {
      let tree!: renderer.ReactTestRenderer;
      renderer.act(() => {
        tree = renderer.create(
          <ProjectRow
            project={{ ...project, status: 'archived', cancelledAt }}
            tc={tc}
            focusedCount={0}
            statusPalette={statusPalette as any}
            t={(key) => ({ 'list.done': 'Completed', 'projects.cancelled': 'Cancelled' }[key] ?? key)}
            onDeleteProject={vi.fn()}
            onDuplicateProject={vi.fn()}
            onOpenProject={vi.fn()}
            onToggleProjectFocus={vi.fn()}
          />,
        );
      });
      return tree.root.findAllByType(Text).map((node) => node.props.children);
    };

    expect(renderStatus()).toContain('Completed');
    expect(renderStatus('2026-04-02T00:00:00.000Z')).toContain('Cancelled');
  });
});
