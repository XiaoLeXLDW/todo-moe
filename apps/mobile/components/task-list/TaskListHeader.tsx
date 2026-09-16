import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ArrowUpDown, Folder, SlidersHorizontal, X } from 'lucide-react-native';

import { AppPressable } from '../app-pressable';
import { moeHaptic } from '../../moe/haptics';
import { styles } from './task-list.styles';
import { MoeGlassPanel } from '../../moe/glass/MoeGlassPanel';

type ThemeColors = {
  border: string;
  cardBg: string;
  danger: string;
  filterBg: string;
  onTint: string;
  secondaryText: string;
  text: string;
  tint: string;
};

export type TaskListActiveFilterChip = {
  id: string;
  label: string;
  /** Excluded (subtracting) token — struck through and danger-colored. */
  excluded?: boolean;
  onPress: () => void;
};

type TaskListHeaderProps = {
  activeFilterChips: TaskListActiveFilterChip[];
  count: number;
  headerAccessory?: React.ReactNode;
  filterActiveCount: number;
  groupByLabel?: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onOpenFilters: () => void;
  onOpenGroup?: () => void;
  onOpenSort: () => void;
  showHeader: boolean;
  showFilterButton?: boolean;
  showSort: boolean;
  sortByLabel: string;
  t: (key: string) => string;
  themeColors: ThemeColors;
  title: string;
};

export function TaskListHeader({
  activeFilterChips,
  count,
  headerAccessory,
  filterActiveCount,
  groupByLabel,
  hasActiveFilters,
  onClearFilters,
  onOpenFilters,
  onOpenGroup,
  onOpenSort,
  showHeader,
  showFilterButton = true,
  showSort,
  sortByLabel,
  t,
  themeColors,
  title,
}: TaskListHeaderProps) {
  const filtersLabel = t('filters.label') === 'filters.label' ? 'Filters' : t('filters.label');
  const groupLabel = t('list.groupBy') === 'list.groupBy' ? 'Group' : t('list.groupBy');
  const clearLabel = t('filters.clear') === 'filters.clear' ? t('common.clear') : t('filters.clear');
  const removeFilterLabel = t('filters.remove') === 'filters.remove' ? 'Remove filter' : t('filters.remove');
  const excludedStateLabel = t('filters.excluded') === 'filters.excluded' ? 'Excluded' : t('filters.excluded');
  const sortControl = showSort ? (
    <AppPressable
      onPress={() => { moeHaptic('selectionTick'); onOpenSort(); }}
      style={[
        styles.sortButton,
        { borderColor: themeColors.border, backgroundColor: themeColors.filterBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t('sort.label')}: ${sortByLabel}`}
      hitSlop={8}
    >
      <ArrowUpDown size={16} color={themeColors.secondaryText} strokeWidth={2} />
    </AppPressable>
  ) : null;
  const filterControl = showFilterButton ? (
    <AppPressable
      onPress={() => { moeHaptic('selectionTick'); onOpenFilters(); }}
      style={[
        styles.sortButton,
        {
          borderColor: hasActiveFilters ? themeColors.tint : themeColors.border,
          backgroundColor: themeColors.filterBg,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={filterActiveCount > 0 ? `${filtersLabel}: ${filterActiveCount}` : filtersLabel}
      hitSlop={8}
    >
      <SlidersHorizontal size={16} color={hasActiveFilters ? themeColors.tint : themeColors.secondaryText} strokeWidth={2} />
      {filterActiveCount > 0 ? (
        <View style={[styles.filterBadge, { backgroundColor: themeColors.tint }]}>
          <Text style={[styles.filterBadgeText, { color: themeColors.onTint }]}>
            {filterActiveCount}
          </Text>
        </View>
      ) : null}
    </AppPressable>
  ) : null;
  const groupControl = onOpenGroup ? (
    <AppPressable
      onPress={() => { moeHaptic('selectionTick'); onOpenGroup(); }}
      style={[
        styles.sortButton,
        { borderColor: themeColors.border, backgroundColor: themeColors.filterBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${groupLabel}: ${groupByLabel ?? ''}`}
      hitSlop={8}
    >
      <Folder size={16} color={themeColors.secondaryText} strokeWidth={2} />
    </AppPressable>
  ) : null;
  return (
    <>
      {showHeader ? (
        <MoeGlassPanel cornerRadius={0} style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.title, { color: themeColors.text }]} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.count, { color: themeColors.secondaryText }]} accessibilityLabel={`${count} tasks`}>
              {count} {t('common.tasks')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {sortControl}
            {groupControl}
            {filterControl}
            {headerAccessory}
          </View>
        </MoeGlassPanel>
      ) : sortControl || groupControl || filterControl || headerAccessory ? (
        <MoeGlassPanel cornerRadius={0} style={styles.headerAccessoryRow}>
          <View style={styles.headerAccessoryLeft}>
            <View style={styles.headerAccessoryControls}>
              {sortControl}
              {groupControl}
              {filterControl}
            </View>
          </View>
          <View style={styles.headerAccessoryRight}>
            {headerAccessory}
          </View>
        </MoeGlassPanel>
      ) : null}

      {activeFilterChips.length > 0 ? (
        <MoeGlassPanel cornerRadius={0} style={[styles.filterSection, { borderBottomColor: themeColors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {activeFilterChips.map((chip) => {
              const accent = chip.excluded ? themeColors.danger : themeColors.tint;
              return (
                <AppPressable
                  key={chip.id}
                  accessibilityRole="button"
                  accessibilityLabel={chip.excluded
                    ? `${removeFilterLabel}: ${chip.label} (${excludedStateLabel})`
                    : `${removeFilterLabel}: ${chip.label}`}
                  onPress={() => { moeHaptic('selectionTick'); chip.onPress(); }}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: accent,
                      backgroundColor: themeColors.filterBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: accent },
                      chip.excluded ? { textDecorationLine: 'line-through' } : null,
                    ]}
                  >
                    {chip.label}
                  </Text>
                  <X size={14} color={accent} />
                </AppPressable>
              );
            })}
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={clearLabel}
              onPress={() => { moeHaptic('selectionTick'); onClearFilters(); }}
              style={[styles.filterChip, { borderColor: themeColors.border, backgroundColor: themeColors.filterBg }]}
            >
              <Text style={[styles.filterChipText, { color: themeColors.secondaryText }]}>
                {clearLabel}
              </Text>
            </AppPressable>
          </ScrollView>
        </MoeGlassPanel>
      ) : null}
    </>
  );
}
