import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { ProjectAreaModals } from './ProjectAreaModals';

vi.mock('../../lib/use-android-keyboard-inset', () => ({ useAndroidKeyboardInset: () => 0 }));
vi.mock('@/moe/glass/MoeGlassPanel', () => ({
  MoeGlassPanel: ({ children, ...props }: any) => React.createElement('MoeGlassPanel', props, children),
}));

describe('folder management from the lists screen', () => {
  it('allows standalone creation and keeps the typed name and manager open when creation fails', async () => {
    const addArea = vi.fn().mockResolvedValue(null);
    const onClose = vi.fn(), setName = vi.fn();
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<ProjectAreaModals
      standalone addArea={addArea} areaListMaxHeight={280} areaManagerListMaxHeight={320}
      areaUsage={new Map()} colors={['#234']} expandedAreaColorId={null}
      newAreaColor="#234" newAreaName="旅行准备" onCloseAreaManager={onClose}
      onDeleteArea={vi.fn()} onSetExpandedAreaColorId={vi.fn()} onSetNewAreaColor={vi.fn()}
      onSetNewAreaName={setName} onSetSelectedProject={vi.fn()} onSetShowAreaManager={vi.fn()}
      onSetShowAreaPicker={vi.fn()} onShowToast={vi.fn()} overlayModalPresentation="overFullScreen"
      pickerCardMaxHeight={560} selectedProject={null} showAreaManager showAreaPicker={false}
      sortedAreas={[]} sortAreasByColor={vi.fn()} sortAreasByName={vi.fn()} t={key => key}
      tc={{ border: '#aaa', cardBg: '#fff', inputBg: '#fff', secondaryText: '#555', text: '#222', tint: '#234' }}
      updateArea={vi.fn()} updateProject={vi.fn()}
    />); });
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
});
