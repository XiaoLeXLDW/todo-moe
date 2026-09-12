import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Area.icon is an emoji or an icon identifier, never user-facing prose.
// Keep emoji sequences intact, including modifiers, flags, ZWJ and keycaps.
const EMOJI_PARTS = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\uFE0F|\uFE0E|\u200D|[#*0-9]\uFE0F?\u20E3)+$/u;
const EMOJI_BASE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/u;

export function MoeFolderIcon({ icon, color, size = 16 }: { icon?: string; color: string; size?: number }) {
  const value = icon?.trim();
  const emoji = Boolean(value && EMOJI_PARTS.test(value) && EMOJI_BASE.test(value));
  // Match the existing IconSymbol folder alias; use the installed icon registry
  // for arbitrary Area identifiers instead of duplicating its fixed SF list.
  const identifier = value === 'folder.fill' ? 'folder' : value;
  const name: React.ComponentProps<typeof Ionicons>['name'] = identifier && Ionicons.glyphMap
    && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, identifier)
    ? identifier as React.ComponentProps<typeof Ionicons>['name']
    : 'folder-outline';
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ minWidth: size, height: size + 4, alignItems: 'center', justifyContent: 'center' }}>
      {emoji ? (
        <Text allowFontScaling={false} style={{ fontSize: size, color }}>{value}</Text>
      ) : <Ionicons name={name} color={color} size={size} />}
    </View>
  );
}
