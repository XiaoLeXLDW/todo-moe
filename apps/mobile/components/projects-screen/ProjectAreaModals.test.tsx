import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useTaskStore, type Project } from '@mindwtr/core';
import { describe, expect, it, vi } from 'vitest';

import { ProjectAreaModals } from './ProjectAreaModals';

vi.mock('../../lib/use-android-keyboard-inset', () => ({ useAndroidKeyboardInset: () => 0 }));
vi.mock('@/moe/glass/MoeGlassPanel', () => ({
  MoeGlassPanel: ({ children, ...props }: any) => React.createElement('MoeGlassPanel', props, children),
}));

type ProjectAreaModalsProps = React.ComponentProps<typeof ProjectAreaModals>;

const project = (id: string): Project => ({
  id,
  title: `Project ${id}`,
  status: 'active',
  color: '#3b82f6',
  order: 0,
  tagIds: [],
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
});

const createProps = (overrides: Partial<ProjectAreaModalsProps> = {}): ProjectAreaModalsProps => ({
  standalone: false,
  addArea: vi.fn(),
  areaListMaxHeight: 280,
  areaManagerListMaxHeight: 320,
  areaUsage: new Map(),
  colors: ['#234'],
  expandedAreaColorId: null,
  newAreaColor: '#234',
  newAreaName: '',
  onCloseAreaManager: vi.fn(),
  onDeleteArea: vi.fn(),
  onSetExpandedAreaColorId: vi.fn(),
  onSetNewAreaColor: vi.fn(),
  onSetNewAreaName: vi.fn(),
  onSetSelectedProject: vi.fn(),
  onSetShowAreaManager: vi.fn(),
  onSetShowAreaPicker: vi.fn(),
  onShowToast: vi.fn(),
  overlayModalPresentation: 'overFullScreen',
  pickerCardMaxHeight: 560,
  selectedProject: null,
  showAreaManager: false,
  showAreaPicker: false,
  sortedAreas: [],
  sortAreasByColor: vi.fn(),
  sortAreasByName: vi.fn(),
  t: key => key,
  tc: { border: '#aaa', cardBg: '#fff', inputBg: '#fff', secondaryText: '#555', text: '#222', tint: '#234' },
  updateArea: vi.fn(),
  updateProject: vi.fn(),
  ...overrides,
});

describe('folder management from the lists screen', () => {
  it('allows standalone creation and keeps the typed name and manager open when creation fails', async () => {
    const addArea = vi.fn().mockResolvedValue(null);
    const onClose = vi.fn(), setName = vi.fn();
    const props = createProps({
      standalone: true,
      addArea,
      newAreaName: '旅行准备',
      onCloseAreaManager: onClose,
      onSetNewAreaName: setName,
      showAreaManager: true,
    });
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<ProjectAreaModals {...props} />); });
    const save = tree.root.find(node => typeof node.props.onPress === 'function'
      && node.props.children?.props?.children === 'common.save');
    await act(async () => { await save.props.onPress(); });
    expect(addArea).toHaveBeenCalledWith('旅行准备', { color: '#234' });
    expect(onClose).not.toHaveBeenCalled();
    expect(setName).not.toHaveBeenCalledWith('');
    expect(tree.root.find(node => node.props.value === '旅行准备')).toBeTruthy();
    expect(tree.root.findAllByType('MoeGlassPanel' as any).some(node => node.props.active === true)).toBe(true);
    act(() => tree.unmount());
  });

  it.each(['another project opens', 'the same project picker reopens'] as const)(
    'does not publish or close a delayed area selection after %s',
    async (transition) => {
      const projectA = project('project-a');
      const projectB = project('project-b');
      const previousProjects = useTaskStore.getState()._allProjects;
      useTaskStore.setState({ _allProjects: [projectA, projectB] });
      let finishWrite!: (value: unknown) => void;
      const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
      const onSetSelectedProject = vi.fn();
      const onSetShowAreaPicker = vi.fn();
      const props = createProps({
        onSetSelectedProject,
        onSetShowAreaPicker,
        selectedProject: projectA,
        showAreaPicker: true,
        sortedAreas: [{
          id: 'area-2',
          name: 'Folder 2',
          order: 0,
          createdAt: '2026-09-15T00:00:00.000Z',
          updatedAt: '2026-09-15T00:00:00.000Z',
        }],
        updateProject,
      });
      let tree!: ReturnType<typeof create>;
      try {
        act(() => { tree = create(<ProjectAreaModals {...props} />); });
        const areaRow = tree.root.findAllByType(TouchableOpacity).find(node => (
          node.findAllByType(Text).some(text => text.props.children === 'Folder 2')
        ));
        expect(areaRow).toBeTruthy();
        let selection!: Promise<void>;
        act(() => { selection = areaRow!.props.onPress(); });
        expect(updateProject).toHaveBeenCalledWith(projectA.id, { areaId: 'area-2' });

        if (transition === 'another project opens') {
          act(() => { tree.update(<ProjectAreaModals {...props} selectedProject={projectB} />); });
        } else {
          act(() => { tree.update(<ProjectAreaModals {...props} showAreaPicker={false} />); });
          act(() => { tree.update(<ProjectAreaModals {...props} />); });
        }
        await act(async () => { finishWrite({ success: true }); await selection; });

        expect(onSetSelectedProject).not.toHaveBeenCalled();
        expect(onSetShowAreaPicker).not.toHaveBeenCalledWith(false);
      } finally {
        if (tree!) act(() => tree.unmount());
        useTaskStore.setState({ _allProjects: previousProjects });
      }
    }
  );
});
