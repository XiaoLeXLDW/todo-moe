import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { MoeFolderIcon } from './MoeFolderIcon';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: Object.assign((props: Record<string, unknown>) => React.createElement('NativeIcon', props), {
    glyphMap: { folder: 0, 'folder-outline': 1, home: 2 },
  }),
}));

describe('folder icon display', () => {
  it.each([
    ['folder', 'folder'], ['folder.fill', 'folder'], ['home', 'home'],
    ['unknown-icon', 'folder-outline'], ['folder 📁', 'folder-outline'], [undefined, 'folder-outline'],
  ])('resolves %s through the icon registry without printing the identifier', (icon, expected) => {
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<MoeFolderIcon icon={icon} color="#123" />); });
    const glyph = tree.root.find(node => String(node.type) === 'NativeIcon');
    expect(glyph.props.name).toBe(expected);
    expect(tree.root.findAllByType(Text)).toHaveLength(0);
    expect(tree.toJSON()).toMatchObject({ props: { pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants' } });
    act(() => tree.unmount());
  });

  it.each(['📁', '👩🏽‍💻', '🇨🇳', '1️⃣'])('preserves the complete %s emoji sequence', icon => {
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<MoeFolderIcon icon={icon} color="#123" />); });
    expect(tree.root.findByType(Text).props.children).toBe(icon);
    expect(tree.root.findAll(node => String(node.type) === 'NativeIcon')).toHaveLength(0);
    act(() => tree.unmount());
  });
});
