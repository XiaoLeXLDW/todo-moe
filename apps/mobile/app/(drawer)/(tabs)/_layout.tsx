import { Link, Tabs, useRouter } from 'expo-router';
import { Search, Inbox, Calendar, Circle, ClipboardCheck, Folder, Menu, Settings, Target } from 'lucide-react-native';
import { Animated, Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { MobileAreaSwitcher } from '@/components/mobile-area-switcher';
import { useMobileAreaFilter } from '@/hooks/use-mobile-area-filter';
import { useMobileSyncBadge } from '@/hooks/use-mobile-sync-badge';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { MOBILE_HOME_TAB_ROUTE } from '@/lib/home-route';
import { useLanguage } from '../../../contexts/language-context';
import { QuickCaptureSheet } from '@/components/quick-capture-sheet';
import { beginCaptureProfile, endCaptureProfile } from '@/lib/capture-profiler';
import { QuickCaptureProvider, useQuickCapture, type QuickCaptureOptions } from '../../../contexts/quick-capture-context';
import { useToastBottomOffset } from '../../../contexts/toast-context';
import { getDefaultTaskAreaMode, useTaskStore, type MobileQuickAccessView, type SavedSearch, type Task } from '@mindwtr/core';
import {
  MOBILE_QUICK_ACCESS_STACK_ROUTE,
} from '@/lib/mobile-quick-access-view';
import { COMPACT_NAV_TEXT_MAX_SCALE } from '@/constants/text-scale';
import { MoeTabBar } from '@/moe/MoeTabBar';
import { MoeSettings } from '@/moe/MoeSettings';
import { moeTabLabel } from '@/moe/navigation';
import { MoeCelebration } from '@/moe/MoeCelebration';
import { MOE_TAB_BOTTOM_PADDING, MoeTabInsetContext } from '@/moe/tab-insets';

type IconSymbolName = Parameters<typeof IconSymbol>[0]['name'];
type Translate = (key: string) => string;

type MoreDestination = {
  id: string;
  label: string;
  displayLabel?: string;
  icon: IconSymbolName;
  iconColor: string;
  route?: string;
  onPress?: () => void;
};

function compactSlashLabel(label: string) {
  return label.split('/')[0]?.trim() || label;
}

function MoreSheetTile({
  item,
  onNavigate,
  tc,
}: {
  item: MoreDestination;
  onNavigate: (route: string) => void;
  tc: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => {
        if (item.route) {
          onNavigate(item.route);
          return;
        }
        item.onPress?.();
      }}
      style={({ pressed }) => [
        styles.moreTile,
        {
          backgroundColor: pressed ? tc.filterBg : tc.cardBg,
          borderColor: tc.border,
        },
      ]}
    >
      <View style={[styles.moreTileIcon, { backgroundColor: tc.filterBg }]}>
        <IconSymbol name={item.icon} size={24} color={item.iconColor} />
      </View>
      <Text
        style={[styles.moreTileLabel, { color: tc.text }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        maxFontSizeMultiplier={COMPACT_NAV_TEXT_MAX_SCALE}
      >
        {item.displayLabel ?? item.label}
      </Text>
    </Pressable>
  );
}

function MoreSheetCompactItem({
  itemStyle,
  item,
  onNavigate,
  tc,
}: {
  itemStyle?: ViewStyle;
  item: MoreDestination;
  onNavigate: (route: string) => void;
  tc: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => {
        if (item.route) {
          onNavigate(item.route);
          return;
        }
        item.onPress?.();
      }}
      style={({ pressed }) => [
        styles.moreCompactItem,
        itemStyle,
        { backgroundColor: pressed ? tc.filterBg : 'transparent' },
      ]}
    >
      <View style={styles.moreCompactIcon}>
        <IconSymbol name={item.icon} size={18} color={item.iconColor} />
      </View>
      <Text
        style={[styles.moreCompactLabel, { color: tc.secondaryText }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        maxFontSizeMultiplier={1}
      >
        {item.displayLabel ?? item.label}
      </Text>
    </Pressable>
  );
}

function MoreNavigationSheet({
  closeRequestId,
  onClose,
  onNavigate,
  savedSearches,
  t,
  tabBarHeight,
  tc,
  visible,
  quickAccessView,
}: {
  closeRequestId: number;
  onClose: () => void;
  onNavigate: (route: string) => void;
  savedSearches: SavedSearch[];
  t: Translate;
  tabBarHeight: number;
  tc: ReturnType<typeof useThemeColors>;
  visible: boolean;
  quickAccessView: MobileQuickAccessView;
}) {
  const reducedMotion = useReducedMotion();
  const sheetTranslateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const lastCloseRequestIdRef = useRef(closeRequestId);
  const hiddenTranslateY = Dimensions.get('window').height;
  const iconColors = {
    board: '#4F8CF7',
    review: '#22C55E',
    calendar: '#35B8B1',
    projects: '#10B981',
    contexts: '#8B5CF6',
    waiting: '#F2B705',
    someday: '#6366F1',
    reference: '#0EA5E9',
    done: '#22C55E',
    archived: '#64748B',
    trash: '#EF4444',
    settings: '#64748B',
    saved: '#4F8CF7',
  };

  const animateClosed = useCallback(() => {
    if (reducedMotion) {
      sheetTranslateY.setValue(hiddenTranslateY);
      onClose();
      return;
    }
    Animated.timing(sheetTranslateY, {
      toValue: hiddenTranslateY,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [hiddenTranslateY, onClose, reducedMotion, sheetTranslateY]);
  const animateOpen = useCallback(() => {
    if (reducedMotion) {
      sheetTranslateY.setValue(0);
      return;
    }
    sheetTranslateY.setValue(hiddenTranslateY);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hiddenTranslateY, reducedMotion, sheetTranslateY]);
  const restoreOpenPosition = useCallback(() => {
    if (reducedMotion) {
      sheetTranslateY.setValue(0);
      return;
    }
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [reducedMotion, sheetTranslateY]);
  const closeSheet = useCallback(() => {
    animateClosed();
  }, [animateClosed]);
  const settleSheetGesture = useCallback((gestureState: { dy: number; vy: number }) => {
    if (gestureState.dy > 72 || (gestureState.dy > 24 && gestureState.vy > 0.75)) {
      closeSheet();
      return;
    }
    restoreOpenPosition();
  }, [closeSheet, restoreOpenPosition]);
  const sheetPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gestureState) => (
      gestureState.dy > 12
      && gestureState.dy > Math.abs(gestureState.dx)
    ),
    onPanResponderMove: (_event, gestureState) => {
      sheetTranslateY.setValue(Math.max(0, gestureState.dy));
    },
    onPanResponderRelease: (_event, gestureState) => settleSheetGesture(gestureState),
    onPanResponderTerminate: (_event, gestureState) => settleSheetGesture(gestureState),
  }), [settleSheetGesture, sheetTranslateY]);

  useEffect(() => {
    if (visible) animateOpen();
  }, [animateOpen, visible]);

  useEffect(() => {
    if (lastCloseRequestIdRef.current === closeRequestId) return;
    lastCloseRequestIdRef.current = closeRequestId;
    if (visible) animateClosed();
  }, [animateClosed, closeRequestId, visible]);

  if (!visible) return null;

  const quickAccessItems: Record<MobileQuickAccessView, MoreDestination> = {
    review: { id: 'review', label: t('nav.review'), icon: 'clipboard.fill', iconColor: iconColors.review, route: MOBILE_QUICK_ACCESS_STACK_ROUTE.review },
    projects: { id: 'projects', label: t('nav.projects'), icon: 'folder.fill', iconColor: iconColors.projects, route: MOBILE_QUICK_ACCESS_STACK_ROUTE.projects },
    calendar: { id: 'calendar', label: t('nav.calendar'), icon: 'calendar', iconColor: iconColors.calendar, route: MOBILE_QUICK_ACCESS_STACK_ROUTE.calendar },
    contexts: { id: 'contexts', label: t('nav.contexts'), icon: 'circle', iconColor: iconColors.contexts, route: MOBILE_QUICK_ACCESS_STACK_ROUTE.contexts },
  };
  const moreQuickAccessItem = (view: Exclude<MobileQuickAccessView, 'review'>) => (
    quickAccessView === view ? quickAccessItems.review : quickAccessItems[view]
  );
  const primaryItems: MoreDestination[] = [
    { id: 'waiting', label: t('nav.waiting'), icon: 'pause.circle.fill', iconColor: iconColors.waiting, route: '/waiting' },
    { id: 'board', label: t('nav.board'), icon: 'square.grid.2x2.fill', iconColor: iconColors.board, route: '/board' },
    moreQuickAccessItem('projects'),
    {
      id: 'someday',
      label: t('nav.someday'),
      displayLabel: compactSlashLabel(t('nav.someday')),
      icon: 'arrow.up.circle.fill',
      iconColor: iconColors.someday,
      route: '/someday',
    },
    moreQuickAccessItem('contexts'),
    moreQuickAccessItem('calendar'),
  ];
  const secondaryItems: MoreDestination[] = [
    { id: 'trash', label: t('nav.trash'), icon: 'trash.fill', iconColor: iconColors.trash, route: '/trash' },
    { id: 'archived', label: t('nav.archived'), icon: 'archivebox.fill', iconColor: iconColors.archived, route: '/archived' },
    { id: 'done', label: t('nav.done'), icon: 'checkmark.circle.fill', iconColor: iconColors.done, route: '/done' },
    { id: 'reference', label: t('nav.reference'), icon: 'book.closed.fill', iconColor: iconColors.reference, route: '/reference' },
    { id: 'settings', label: t('nav.settings'), icon: 'gearshape.fill', iconColor: iconColors.settings, route: '/settings' },
  ];

  return (
    <>
      <View pointerEvents="box-none" style={[styles.moreOverlayContainer, { bottom: tabBarHeight }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.moreBackdrop}
          onPress={closeSheet}
        />
        <Animated.View
          accessibilityRole="menu"
          style={[
            styles.moreSheet,
            {
              backgroundColor: tc.cardBg,
              borderColor: tc.border,
              bottom: 0,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
          {...sheetPanResponder.panHandlers}
        >
          <View style={[styles.moreSheetHandle, { backgroundColor: tc.border }]} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.moreSheetContent}
          >
            <View style={styles.moreUtilityRow}>
              {secondaryItems.map((item) => (
                <MoreSheetCompactItem
                  key={item.id}
                  item={item}
                  itemStyle={styles.moreUtilityRowItem}
                  onNavigate={onNavigate}
                  tc={tc}
                />
              ))}
            </View>

            {savedSearches.length > 0 ? (
              <View style={styles.moreSavedSection}>
                <Text style={[styles.moreSectionTitle, { color: tc.secondaryText }]}>
                  {t('search.savedSearches')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.moreUtilityStripContent}
                >
                  {savedSearches.map((search) => (
                    <MoreSheetCompactItem
                      key={search.id}
                      item={{
                        id: search.id,
                        label: search.name,
                        icon: 'tray.fill',
                        iconColor: iconColors.saved,
                        route: `/saved-search/${search.id}`,
                      }}
                      itemStyle={styles.moreUtilityScrollItem}
                      onNavigate={onNavigate}
                      tc={tc}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={[styles.moreDivider, { backgroundColor: tc.border }]} />

            <View style={styles.morePrimaryGrid}>
              {primaryItems.map((item) => (
                <MoreSheetTile key={item.id} item={item} onNavigate={onNavigate} tc={tc} />
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>

    </>
  );
}

export default function TabLayout() {
  const tc = useThemeColors();
  const { t, language = 'en' } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The root layout's provider, which presents capture as a pushed route.
  const { openQuickCapture: openRouteQuickCapture } = useQuickCapture();
  const settings = useTaskStore((state) => state.settings);
  const { selectedAreaIdForNewTasks } = useMobileAreaFilter();
  const defaultAreaMode = getDefaultTaskAreaMode(settings);
  const tabBarBottomInset = Math.max(0, insets.bottom);
  const tabBarBottomOffset = 0;
  const tabBarHeight = 80 + tabBarBottomInset;
  // Undo toasts must sit above the tab bar, not on top of it (#1044).
  useToastBottomOffset(tabBarHeight + tabBarBottomOffset);
  const [captureState, setCaptureState] = useState<{
    visible: boolean;
    presented: boolean;
    openRequestId: number;
    initialValue?: string;
    initialProps?: Partial<Task> | null;
    autoRecord?: boolean;
  }>({
    visible: false,
    presented: false,
    openRequestId: 0,
    initialValue: '',
    initialProps: null,
    autoRecord: false,
  });
  const [moeSettingsVisible, setMoeSettingsVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [moreSheetCloseRequestId, setMoreSheetCloseRequestId] = useState(0);
  const withSelectedArea = useCallback((initialProps?: Partial<Task> | null): Partial<Task> | undefined => {
    const nextInitialProps = initialProps ? { ...initialProps } : {};
    const hasProject = typeof nextInitialProps.projectId === 'string' && nextInitialProps.projectId.trim().length > 0;
    const hasArea = Object.prototype.hasOwnProperty.call(nextInitialProps, 'areaId');
    if (!hasProject && !hasArea && defaultAreaMode === 'active' && selectedAreaIdForNewTasks) {
      nextInitialProps.areaId = selectedAreaIdForNewTasks;
    }
    return Object.keys(nextInitialProps).length > 0 ? nextInitialProps : undefined;
  }, [defaultAreaMode, selectedAreaIdForNewTasks]);

  const openQuickCapture = useCallback((options?: QuickCaptureOptions) => {
    // A capture that promises to return somewhere (project quick add, #938)
    // needs a real route change: its caller dismisses UI and restores it on
    // the focus event when capture pops. The tab sheet opens in place — no
    // blur, no focus — so returnTo captures go through the root capture
    // screen instead of stranding the caller on its base screen.
    if (options?.returnTo) {
      openRouteQuickCapture({ ...options, initialProps: withSelectedArea(options.initialProps) });
      return;
    }
    beginCaptureProfile();
    setCaptureState((prev) => ({
      visible: true,
      presented: true,
      openRequestId: prev.openRequestId + 1,
      initialValue: options?.initialValue ?? '',
      initialProps: withSelectedArea(options?.initialProps) ?? null,
      autoRecord: options?.autoRecord ?? false,
    }));
  }, [openRouteQuickCapture, withSelectedArea]);

  const closeQuickCapture = useCallback(() => {
    endCaptureProfile();
    setCaptureState((prev) => ({ ...prev, visible: false }));
  }, []);
  const finishQuickCaptureExit = useCallback((openRequestId: number) => {
    setCaptureState((prev) => {
      if (prev.visible || prev.openRequestId !== openRequestId) return prev;
      return { ...prev, presented: false, initialValue: '', initialProps: null, autoRecord: false };
    });
  }, []);
  const closeMoreSheet = useCallback(() => setMoreSheetVisible(false), []);
  const toggleMoreSheet = useCallback(() => {
    if (moreSheetVisible) {
      setMoreSheetCloseRequestId((prev) => prev + 1);
      return;
    }
    setMoreSheetVisible(true);
  }, [moreSheetVisible]);
  const navigateFromMoreSheet = useCallback((route: string) => {
    setMoreSheetVisible(false);
    router.push(route as never);
  }, [router]);

  const iconTint = tc.tabIconSelected;
  const inactiveTint = tc.tabIconDefault;
  const defaultCapture = settings.gtd?.defaultCaptureMethod ?? 'text';
  const defaultAutoRecord = defaultCapture === 'audio';
  const quickAccessView = 'projects' as const;
  const { syncBadgeAccessibilityLabel, syncBadgeColor } = useMobileSyncBadge();

  return (
    <QuickCaptureProvider value={{ openQuickCapture }}>
    <MoeTabInsetContext.Provider value={MOE_TAB_BOTTOM_PADDING + Math.max(0, insets.bottom)}>
      <Tabs
        initialRouteName={MOBILE_HOME_TAB_ROUTE}
        tabBar={(props) => (
          <MoeTabBar
            {...props}
            tabBarBottomInset={tabBarBottomInset}
            openQuickCapture={openQuickCapture}
            closeMoreSheet={closeMoreSheet}
            defaultAutoRecord={defaultAutoRecord}
            captureVisible={captureState.visible}
          />
        )}
        screenOptions={{
        tabBarActiveTintColor: iconTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarShowLabel: false,
        headerShown: true,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: tc.bg,
          borderBottomWidth: 0,
        },
        headerBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: tc.bg,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: tc.border,
              },
            ]}
          />
        ),
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={toggleMoreSheet} style={styles.headerIconButton} accessibilityRole="button"
              accessibilityLabel={language.startsWith('zh') ? '高级 GTD 视图' : 'Advanced GTD views'} accessibilityState={{ expanded: moreSheetVisible }}>
              <Menu size={22} color={tc.text} />
              {syncBadgeColor ? <View style={[styles.menuSyncDot, { backgroundColor: syncBadgeColor }]} /> : null}
            </TouchableOpacity>
            <MobileAreaSwitcher />
          </View>
        ),
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerTintColor: tc.text,
        headerTitle: ({ children }) => (
          <Text
            style={[styles.headerTitle, { color: tc.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            maxFontSizeMultiplier={COMPACT_NAV_TEXT_MAX_SCALE}
          >
            {children}
          </Text>
        ),
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '700',
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Link href="/global-search" asChild>
              <TouchableOpacity style={styles.headerIconButton} accessibilityLabel={t('search.title')} accessibilityRole="button">
                <Search size={22} color={tc.text} />
              </TouchableOpacity>
            </Link>
            <TouchableOpacity onPress={() => setMoeSettingsVisible(true)} style={styles.headerIconButton}
              accessibilityLabel={t('nav.settings')} accessibilityRole="button">
              <Settings size={22} color={tc.text} />
            </TouchableOpacity>
          </View>
        ),
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      }}
      >
      <Tabs.Screen
        name={MOBILE_HOME_TAB_ROUTE}
        options={{
          title: moeTabLabel('focus', language.startsWith('zh')),
          tabBarIcon: ({ color, focused }) => (
            <Target size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: moeTabLabel('inbox', language.startsWith('zh')),
          tabBarIcon: ({ color, focused }) => (
            <Inbox size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen name="capture" options={{ href: null }} />
      <Tabs.Screen
        name="capture-quick"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: moeTabLabel('projects', language.startsWith('zh')),
          href: undefined,
          tabBarIcon: ({ color, focused }) => (
            <Folder size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar-tab"
        options={{
          title: t('nav.calendar'),
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <Calendar size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="contexts-tab"
        options={{
          title: t('nav.contexts'),
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <Circle size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="review-tab"
        options={{
          title: t('tab.review'),
          href: null,
          tabBarIcon: ({ color, focused }) => (
            <ClipboardCheck size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('tab.menu'),
          tabBarAccessibilityLabel: syncBadgeAccessibilityLabel
            ? `${t('tab.menu')}, ${syncBadgeAccessibilityLabel}`
            : t('tab.menu'),
          tabBarIcon: ({ color, focused }) => (
            <Menu size={focused ? 26 : 24} color={color} strokeWidth={2} opacity={focused ? 1 : 0.8} />
          ),
        }}
      />
    </Tabs>
    {captureState.presented && <QuickCaptureSheet
        visible={captureState.visible}
        openRequestId={captureState.openRequestId}
        initialValue={captureState.initialValue}
        initialProps={captureState.initialProps ?? undefined}
        autoRecord={captureState.autoRecord}
        onClose={closeQuickCapture}
        onDidHide={() => finishQuickCaptureExit(captureState.openRequestId)}
      />}
    <MoeCelebration />
    {moeSettingsVisible && <MoeSettings visible onClose={() => setMoeSettingsVisible(false)} />}
    <MoreNavigationSheet
      closeRequestId={moreSheetCloseRequestId}
      onClose={closeMoreSheet}
      onNavigate={navigateFromMoreSheet}
      savedSearches={settings?.savedSearches ?? []}
      t={t}
      tabBarHeight={tabBarHeight}
      tc={tc}
      visible={moreSheetVisible}
      quickAccessView={quickAccessView}
    />
    </MoeTabInsetContext.Provider>
    </QuickCaptureProvider>
  );
}

const styles = StyleSheet.create({
  menuSyncDot: {
    position: 'absolute',
    top: -2,
    right: -7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
    opacity: 0.85,
  },
  headerIconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 0,
  },
  moreOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  moreBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
  },
  moreSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    maxHeight: '82%',
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  moreSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 18,
  },
  moreSheetContent: {
    paddingBottom: 8,
  },
  morePrimaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moreTile: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 104,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  moreTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moreTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 15,
    textAlign: 'center',
  },
  moreDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  moreUtilityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  moreUtilityStripContent: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 2,
  },
  moreCompactItem: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  moreUtilityRowItem: {
    flex: 1,
    minWidth: 0,
  },
  moreUtilityScrollItem: {
    width: 76,
  },
  moreCompactIcon: {
    opacity: 0.64,
  },
  moreCompactLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 4,
    minHeight: 16,
    textAlign: 'center',
  },
  moreSavedSection: {
    marginTop: 18,
  },
  moreSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
});
