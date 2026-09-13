import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Bell,
    CalendarDays,
    Database,
    Info,
    Layers,
    ListChecks,
    Monitor,
    RefreshCw,
    Search,
    Settings2,
    Sparkles,
    type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSandboxMode } from '@mindwtr/core';

import { useMobileSyncBadge } from '@/hooks/use-mobile-sync-badge';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { MoeAppearanceSettings, MoeMotionSettings } from '@/moe/MoeSettings';
import { useMoePreferences } from '@/moe/preferences';
import { AboutSettingsScreen } from '@/components/settings/about-settings-screen';
import { AISettingsScreen } from '@/components/settings/ai-settings-screen';
import { CalendarSettingsScreen } from '@/components/settings/calendar-settings-screen';
import { DataSettingsScreen, SyncSettingsScreen } from '@/components/settings/sync-settings-screen';
import { GeneralSettingsScreen } from '@/components/settings/general-settings-screen';
import { GtdSettingsScreen } from '@/components/settings/gtd-settings-screen';
import { ManageSettingsScreen } from '@/components/settings/manage-settings-screen';
import { NotificationsSettingsScreen } from '@/components/settings/notifications-settings-screen';
import { MenuItem, SettingsTopBar } from '@/components/settings/settings.shell';
import { styles } from '@/components/settings/settings.styles';
import {
    buildSettingsMenuSearchText,
    findSettingsMenuMatch,
    SETTINGS_SCREEN_SET,
    settingsMenuMatchesQuery,
    type SettingsMenuRowId,
    type SettingsScreen,
} from '@/components/settings/settings.constants';
import { useSettingsLocalization, useSettingsScrollContent } from '@/components/settings/settings.hooks';
import { SandboxSettingsScreen } from '@/components/settings/sandbox-settings-screen';

export default function SettingsPage() {
    if (isSandboxMode()) return <SandboxSettingsScreen />;
    return <PersonalSettingsPage />;
}

function PersonalSettingsPage() {
    const router = useRouter();
    const tc = useThemeColors();
    const { t, language } = useSettingsLocalization();
    const zh = language.startsWith('zh');
    const label = (cn: string, en: string) => zh ? cn : en;
    const preferences = useMoePreferences();
    const scrollContentStyle = useSettingsScrollContent();
    const { onboardingHandoff, settingsScreen } = useLocalSearchParams<{
        onboardingHandoff?: string | string[];
        settingsScreen?: string | string[];
    }>();
    const { syncBadgeAccessibilityLabel, syncBadgeColor, syncConfigured, lastSyncAt } = useMobileSyncBadge();
    const [hasUpdateBadge, setHasUpdateBadge] = useState(false);
    const [search, setSearch] = useState('');

    const currentScreen = useMemo<SettingsScreen>(() => {
        const rawScreen = Array.isArray(settingsScreen) ? settingsScreen[0] : settingsScreen;
        if (!rawScreen) return 'main';
        return SETTINGS_SCREEN_SET[rawScreen as SettingsScreen] ? (rawScreen as SettingsScreen) : 'main';
    }, [settingsScreen]);
    const showOnboardingHandoff = useMemo(() => {
        const rawHandoff = Array.isArray(onboardingHandoff) ? onboardingHandoff[0] : onboardingHandoff;
        return rawHandoff === '1';
    }, [onboardingHandoff]);
    const menuDescriptions = useMemo(
        () => ({
            general: t('settings.menuDesc.general'),
            gtd: t('settings.menuDesc.gtd'),
            manage: t('settings.menuDesc.manage'),
            notifications: t('settings.menuDesc.notifications'),
            sync: t('settings.menuDesc.sync'),
            data: t('settings.menuDesc.data'),
            advanced: t('settings.menuDesc.advanced'),
            about: t('settings.menuDesc.about'),
            ai: t('settings.menuDesc.ai'),
            calendar: t('settings.menuDesc.calendar'),
        }),
        [t],
    );

    const pushSettingsScreen = (nextScreen: SettingsScreen) => {
        if (nextScreen === 'main') {
            router.push('/settings');
            return;
        }
        router.push({ pathname: '/settings', params: { settingsScreen: nextScreen } });
    };

    if (currentScreen === 'appearance') return <MoeAppearanceSettings />;
    if (currentScreen === 'motion') return <MoeMotionSettings />;
    if (currentScreen === 'tasks') return <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['bottom']}><SettingsTopBar title={label('任务与提醒', 'Tasks & reminders')} /><ScrollView contentContainerStyle={scrollContentStyle}><View style={[styles.menuCard, { backgroundColor: tc.cardBg }]}><MenuItem title={label('任务行为', 'Task behavior')} description={menuDescriptions.gtd} icon={ListChecks} onPress={() => pushSettingsScreen('gtd')} /><MenuItem title={label('文件夹、标签与情境', 'Folders, tags & contexts')} icon={Layers} onPress={() => pushSettingsScreen('manage')} /><MenuItem title={label('提醒与通知', 'Reminders & notifications')} icon={Bell} onPress={() => pushSettingsScreen('notifications')} isLast /></View></ScrollView></SafeAreaView>;

    if (currentScreen === 'notifications') {
        return <NotificationsSettingsScreen />;
    }

    if (currentScreen === 'general') {
        return <GeneralSettingsScreen />;
    }

    if (currentScreen === 'ai') {
        return <AISettingsScreen />;
    }

    if (currentScreen === 'manage') {
        return <ManageSettingsScreen />;
    }

    if (
        currentScreen === 'gtd'
        || currentScreen === 'gtd-archive'
        || currentScreen === 'gtd-capture'
        || currentScreen === 'gtd-inbox'
        || currentScreen === 'gtd-pomodoro'
        || currentScreen === 'gtd-review'
        || currentScreen === 'gtd-time-estimates'
        || currentScreen === 'gtd-task-editor'
    ) {
        return <GtdSettingsScreen onNavigate={pushSettingsScreen} screen={currentScreen} />;
    }

    if (currentScreen === 'calendar') {
        return <CalendarSettingsScreen />;
    }

    if (currentScreen === 'sync') {
        return <SyncSettingsScreen onboardingHandoff={showOnboardingHandoff} />;
    }

    if (currentScreen === 'data') {
        return <DataSettingsScreen onboardingHandoff={showOnboardingHandoff} />;
    }

    if (currentScreen === 'about') {
        return <AboutSettingsScreen onUpdateBadgeChange={setHasUpdateBadge} />;
    }

    if (currentScreen === 'advanced') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['bottom']}>
                <SettingsTopBar title={t('settings.advanced')} />
                <ScrollView style={styles.scrollView} contentContainerStyle={scrollContentStyle}>
                    <View style={[styles.menuCard, { backgroundColor: tc.cardBg }]}>
                        <MenuItem
                            title={t('settings.ai')}
                            description={menuDescriptions.ai}
                            icon={Sparkles}
                            onPress={() => pushSettingsScreen('ai')}
                        />
                        <MenuItem
                            title={t('settings.calendar')}
                            description={menuDescriptions.calendar}
                            icon={CalendarDays}
                            isLast
                            onPress={() => pushSettingsScreen('calendar')}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    type MenuRow = {
        id: SettingsMenuRowId;
        title: string;
        description?: string;
        icon: LucideIcon;
        onPress: () => void;
        showIndicator?: boolean;
        indicatorColor?: string;
        indicatorAccessibilityLabel?: string;
    };

    const syncDate = lastSyncAt ? new Date(lastSyncAt) : null;
    const syncDescription = !syncConfigured ? label('仅本机，尚未配置同步', 'On this device · sync not configured')
        : syncBadgeAccessibilityLabel ?? (syncDate && Number.isFinite(syncDate.getTime()) ? label('最近同步：', 'Last sync: ') + syncDate.toLocaleString() : label('已配置同步', 'Sync configured'));
    const modeDescription = preferences.appearance === 'dark' ? label('深色', 'Dark') : preferences.appearance === 'light' ? label('浅色', 'Light') : label('跟随系统', 'System');
    const menuGroups: MenuRow[][] = [
        [
            { id: 'sync', title: label('同步', 'Sync'), description: syncDescription, icon: RefreshCw, onPress: () => pushSettingsScreen('sync'), showIndicator: Boolean(syncBadgeColor), indicatorColor: syncBadgeColor, indicatorAccessibilityLabel: syncBadgeAccessibilityLabel },
            { id: 'data', title: label('备份与恢复', 'Backup & restore'), description: label('导出、恢复与导入', 'Export, restore & import'), icon: Database, onPress: () => pushSettingsScreen('data') },
        ],
        [
            { id: 'appearance', title: label('外观', 'Appearance'), description: modeDescription + ' · ' + (preferences.colorSource === 'custom' ? label('自定义配色', 'Custom colors') : label('系统动态色', 'System colors')), icon: Monitor, onPress: () => pushSettingsScreen('appearance') },
            { id: 'motion', title: label('动画与触感', 'Motion & haptics'), description: label('强度、即时预览与完成庆祝', 'Intensity, live preview & celebration'), icon: Sparkles, onPress: () => pushSettingsScreen('motion') },
        ],
        [
            { id: 'tasks', title: label('任务与提醒', 'Tasks & reminders'), description: label('记录、整理、文件夹与通知', 'Capture, organization, folders & notifications'), icon: ListChecks, onPress: () => pushSettingsScreen('tasks') },
            { id: 'general', title: label('通用与隐私', 'General & privacy'), description: label('语言、显示、隐私与可选集成', 'Language, display, privacy & optional integrations'), icon: Settings2, onPress: () => pushSettingsScreen('general') },
        ],
        [{ id: 'about', title: label('帮助与关于', 'Help & about'), description: label('使用帮助、更新、隐私与开源许可', 'Help, updates, privacy & open-source licenses'), icon: Info, onPress: () => pushSettingsScreen('about'), showIndicator: hasUpdateBadge, indicatorAccessibilityLabel: hasUpdateBadge ? t('settings.updateAvailable') : undefined }],
    ];

    const filteredGroups = menuGroups
        .map((group) =>
            group
                .filter((row) =>
                    settingsMenuMatchesQuery(
                        buildSettingsMenuSearchText(row.id, row.title, row.description, t),
                        search,
                    ),
                )
                // While searching, the row's second line says which setting
                // matched and where it lives, instead of the generic blurb.
                .map((row) => {
                    const match = findSettingsMenuMatch(row.id, row.title, t, search);
                    return match ? { ...row, description: `${match.title} · ${match.path}` } : row;
                }),
        )
        .filter((group) => group.length > 0);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['bottom']}>
            <SettingsTopBar />
            <ScrollView style={styles.scrollView} contentContainerStyle={scrollContentStyle} keyboardShouldPersistTaps="handled">
                <View style={[searchStyles.searchBar, { backgroundColor: tc.cardBg, borderColor: tc.border }]}>
                    <Search color={tc.secondaryText} size={18} strokeWidth={2} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('common.search')}
                        placeholderTextColor={tc.secondaryText}
                        style={[searchStyles.searchInput, { color: tc.text }]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                        accessibilityLabel={t('common.search')}
                    />
                </View>
                <View style={styles.menuGroupStack}>
                    {filteredGroups.map((group) => (
                        <View key={group[0].id} style={[styles.menuCard, { backgroundColor: tc.cardBg }]}>
                            {group.map((row, rowIndex) => (
                                <MenuItem
                                    key={row.id}
                                    title={row.title}
                                    description={row.description}
                                    icon={row.icon}
                                    isLast={rowIndex === group.length - 1}
                                    onPress={row.onPress}
                                    showIndicator={row.showIndicator}
                                    indicatorColor={row.indicatorColor}
                                    indicatorAccessibilityLabel={row.indicatorAccessibilityLabel}
                                />
                            ))}
                        </View>
                    ))}
                    {filteredGroups.length === 0 ? (
                        <Text style={[searchStyles.noResults, { color: tc.secondaryText }]}>
                            {t('common.noMatches')}
                        </Text>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const searchStyles = StyleSheet.create({
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    noResults: {
        textAlign: 'center',
        fontSize: 14,
        paddingVertical: 24,
    },
});
