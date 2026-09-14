import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { expect, it } from 'vitest';
import { MoeCelebrationLayer, MoeCelebrationLayerHost, MoeCelebrationStage } from './MoeCelebrationLayer';

it('keeps native-modal decoration in the nearest window and releases it on unmount', () => {
  const content = (visible: boolean) => <MoeCelebrationLayerHost>
    <MoeCelebrationLayer><Text>Root celebration</Text></MoeCelebrationLayer>
    <View testID="native-modal-window"><MoeCelebrationLayerHost>
      {visible ? <MoeCelebrationLayer><MoeCelebrationStage><Text>Modal celebration</Text></MoeCelebrationStage></MoeCelebrationLayer> : null}
    </MoeCelebrationLayerHost></View>
  </MoeCelebrationLayerHost>;
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(content(true)); });
  const modal = tree.root.findByProps({ testID: 'native-modal-window' });
  expect(modal.findByProps({ testID: 'moe-celebration-layer' }).findAllByType(Text).map(node => node.props.children)).toEqual(['Modal celebration']);
  expect(tree.root.findByProps({ testID: 'moe-celebration-stage' }).props.pointerEvents).toBe('none');
  act(() => { tree.update(content(false)); });
  expect(modal.findByProps({ testID: 'moe-celebration-layer' }).findAllByType(Text)).toHaveLength(0);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toEqual(['Root celebration']);
  act(() => { tree.unmount(); });
});

it('discards decoration when its native window is hidden or its route changes', () => {
  // The same retained child models a frozen navigation screen: it does not
  // unmount just because the host changes route or hides its native window.
  const retained = <MoeCelebrationLayer><Text>Old celebration</Text></MoeCelebrationLayer>;
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<MoeCelebrationLayerHost scopeKey="settings">{retained}</MoeCelebrationLayerHost>); });
  expect(tree.root.findAllByType(Text)).toHaveLength(1);
  act(() => { tree.update(<MoeCelebrationLayerHost scopeKey="tasks">{retained}</MoeCelebrationLayerHost>); });
  expect(tree.root.findAllByType(Text)).toHaveLength(0);
  act(() => { tree.update(<MoeCelebrationLayerHost scopeKey="settings" active={false}>{retained}</MoeCelebrationLayerHost>); });
  act(() => { tree.update(<MoeCelebrationLayerHost scopeKey="settings">{retained}</MoeCelebrationLayerHost>); });
  expect(tree.root.findAllByType(Text)).toHaveLength(0);
  act(() => { tree.unmount(); });
});
