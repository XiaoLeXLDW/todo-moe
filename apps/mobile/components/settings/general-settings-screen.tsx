import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    canUseJalaliCalendar,
    getLocaleCoverageTier,
    normalizeDateFormatSetting,
    normalizeTimeFormatSetting,
    normalizeWeekStartPreference,
    normalizeWeekStartSetting,
    resolveCalendarSystemSetting,
    shallow,
    tFallback,
    useTaskStore,
} from '@mindwtr/core';

import { MoeSettings } from '@/moe/MoeSettings';
import { useMoePreferences } from '@/moe/preferences';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { isAppSearchSupported, readAppSearchIndexingEnabled, writeAppSearchIndexingEnabled } from '@/lib/app-search-preference';
import { enableAppSearchIndexing, wipeAppSearchIndex } from '@/lib/app-search-service';
import { authenticateWithDeviceLock, getMobileAppLockErrorKey } from '@/lib/mobile-app-lock';

import { SettingRow, SettingToggleRow } from './setting-row';
import { LANGUAGES } from './settings.constants';
import { useSettingsLocalization, useSettingsScrollContent } from './settings.hooks';
import { SettingsTopBar } from './settings.shell';
import { styles } from './settings.styles';

export function GeneralSettingsScreen() {
    const moePreferences = useMoePreferences();
    const { language, tr, setLanguage, t } = useSettingsLocalization();
    const { settings, updateSettings } = useTaskStore((state) => ({
        settings: state.settings,
        updateSettings: state.updateSettings,
    }), shallow);
    const tc = useThemeColors();
    const scrollContentStyle = useSettingsScrollContent();
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
    const [weekStartPickerOpen, setWeekStartPickerOpen] = useState(false);
    const [dateFormatPickerOpen, setDateFormatPickerOpen] = useState(false);
    const [calendarSystemPickerOpen, setCalendarSystemPickerOpen] = useState(false);
    const [timeFormatPickerOpen, setTimeFormatPickerOpen] = useState(false);
    const [appLockBusy, setAppLockBusy] = useState(false);
    const [appLockErrorKey, setAppLockErrorKey] = useState<string | null>(null);

    const languageLabel = (code: string) => {
        const native = LANGUAGES.find((lang) => lang.id === code)?.native ?? code;
        return getLocaleCoverageTier(code) === 'partial'
            ? `${native} — ${tr('settings.languagePartlyTranslated')}`
            : native;
    };

    const weekStart = normalizeWeekStartPreference(settings.weekStart);
    const dateFormat = normalizeDateFormatSetting(settings.dateFormat);
    const timeFormat = normalizeTimeFormatSetting(settings.timeFormat);
    const systemLocale = typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    const showCalendarSystem = canUseJalaliCalendar({ language, systemLocale });
    const calendarSystem = resolveCalendarSystemSetting(settings.calendarSystem, { language, systemLocale });
    const showTaskAge = settings.appearance?.showTaskAge === true;
    const appLockEnabled = settings.security?.mobileAppLockEnabled === true;
    const currentThemeLabel = language.startsWith('zh')
        ? (moePreferences.followSystem ? '跟随系统明暗' : { soft: '柔白', ink: '墨色', family: '家族色' }[moePreferences.theme])
        : (moePreferences.followSystem ? 'Follow system appearance' : { soft: 'Soft white', ink: 'Ink', family: 'Family' }[moePreferences.theme]);
    // Both "System default" labels show what they resolve to: the runtime locale
    // decides, which on a customized OS can differ from the OS setting (#1006).
    const systemWeekStart = normalizeWeekStartSetting('system');
    const systemWeekStartLabel = systemWeekStart === 'monday'
        ? t('settings.weekStartMonday')
        : systemWeekStart === 'saturday'
            ? t('settings.weekStartSaturday')
            : t('settings.weekStartSunday');
    const weekStartOptions: { value: 'system' | 'sunday' | 'monday' | 'saturday'; label: string }[] = [
        { value: 'system', label: `${tFallback(t, 'settings.weekStartSystem', 'System default')} (${systemWeekStartLabel})` },
        { value: 'sunday', label: t('settings.weekStartSunday') },
        { value: 'monday', label: t('settings.weekStartMonday') },
        { value: 'saturday', label: t('settings.weekStartSaturday') },
    ];
    const currentWeekStartLabel = weekStartOptions.find((opt) => opt.value === weekStart)?.label ?? tFallback(t, 'settings.weekStartSystem', 'System default');
    // Show what "System default" actually resolves to — the runtime locale's
    // short date, which on a customized OS can differ from the OS format (#1006).
    const systemDateSample = new Date().toLocaleDateString();
    const dateFormatOptions: { value: 'system' | 'dmy' | 'mdy' | 'ymd'; label: string }[] = [
        { value: 'system', label: `${t('settings.dateFormatSystem')} (${systemDateSample})` },
        { value: 'dmy', label: t('settings.dateFormatDmy') },
        { value: 'mdy', label: t('settings.dateFormatMdy') },
        { value: 'ymd', label: t('settings.dateFormatYmd') },
    ];
    const currentDateFormatLabel = dateFormatOptions.find((opt) => opt.value === dateFormat)?.label ?? t('settings.dateFormatSystem');
    const calendarSystemOptions: { value: 'gregorian' | 'jalali'; label: string }[] = [
        { value: 'gregorian', label: t('settings.calendarSystemGregorian') },
        { value: 'jalali', label: t('settings.calendarSystemJalali') },
    ];
    const currentCalendarSystemLabel = calendarSystemOptions.find((opt) => opt.value === calendarSystem)?.label
        ?? t('settings.calendarSystemGregorian');
    const timeFormatOptions: { value: 'system' | '12h' | '24h'; label: string }[] = [
        { value: 'system', label: t('settings.timeFormatSystem') },
        { value: '12h', label: t('settings.timeFormat12h') },
        { value: '24h', label: t('settings.timeFormat24h') },
    ];
    const currentTimeFormatLabel = timeFormatOptions.find((opt) => opt.value === timeFormat)?.label ?? t('settings.timeFormatSystem');
    const handleAppLockToggle = useCallback((value: boolean) => {
        setAppLockErrorKey(null);
        if (!value) {
            updateSettings({
                security: {
                    ...(settings.security ?? {}),
                    mobileAppLockEnabled: false,
                },
            }).catch(console.error);
            return;
        }

        if (appLockBusy) return;
        setAppLockBusy(true);
        authenticateWithDeviceLock({
            promptMessage: tr('appLock.enablePrompt'),
            cancelLabel: tr('common.cancel'),
            fallbackLabel: tr('appLock.useDevicePasscode'),
        })
            .then((result) => {
                if (!result.success) {
                    setAppLockErrorKey(getMobileAppLockErrorKey(result.reason));
                    return;
                }
                updateSettings({
                    security: {
                        ...(settings.security ?? {}),
                        mobileAppLockEnabled: true,
                    },
                }).catch(console.error);
            })
            .catch(() => setAppLockErrorKey('appLock.failed'))
            .finally(() => setAppLockBusy(false));
    }, [appLockBusy, settings.security, tr, updateSettings]);
    const appLockError = appLockErrorKey ? tr(appLockErrorKey) : null;

    // Device-local Android integration (#1017): whether this device's active
    // tasks/projects/areas are mirrored into Android's system-search index.
    const [appSearchEnabled, setAppSearchEnabled] = useState(false);
    useEffect(() => {
        if (!isAppSearchSupported()) return;
        readAppSearchIndexingEnabled().then(setAppSearchEnabled).catch(console.error);
    }, []);
    const handleAppSearchToggle = useCallback((value: boolean) => {
        setAppSearchEnabled(value);
        writeAppSearchIndexingEnabled(value).catch(console.error);
        if (value) {
            // enableAppSearchIndexing re-reads the preference after its
            // reindex finishes, so a quick toggle-off mid-flight wins
            // instead of resurrecting documents and re-arming after OFF.
            enableAppSearchIndexing().catch(console.error);
        } else {
            wipeAppSearchIndex().catch(console.error);
        }
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['bottom']}>
            <SettingsTopBar title={t('settings.general')} />
            <ScrollView style={styles.scrollView} contentContainerStyle={scrollContentStyle}>
                <Text style={[styles.sectionTitle, { color: tc.secondaryText }]}>{t('settings.appearance')}</Text>
                <View style={[styles.settingCard, { backgroundColor: tc.cardBg }]}>
                    <SettingRow
                        onPress={() => setThemePickerOpen(true)}
                        label={t('settings.theme')}
                        description={currentThemeLabel}
                    >
                        <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                    </SettingRow>
                    <SettingToggleRow
                        divider
                        label={tr('settings.mobile.showTaskAge')}
                        description={tr('settings.mobile.displayHowLongAgoATaskWasCreatedInTask')}
                        value={showTaskAge}
                        onChange={(value) => {
                            updateSettings({
                                appearance: {
                                    ...(settings.appearance ?? {}),
                                    showTaskAge: value,
                                },
                            }).catch(console.error);
                        }}
                        trackColor={{ false: tc.secondaryText, true: tc.tint }}
                    />
                </View>

                <Text style={[styles.sectionTitle, { color: tc.secondaryText, marginTop: 16 }]}>{tr('settings.privacy')}</Text>
                <View style={[styles.settingCard, { backgroundColor: tc.cardBg }]}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: tc.text }]}>{tr('settings.mobile.appLock')}</Text>
                            <Text style={[styles.settingDescription, { color: tc.secondaryText }]}>
                                {tr('settings.mobile.appLockDesc')}
                            </Text>
                            {appLockError && (
                                <Text style={[styles.settingDescription, { color: tc.danger, marginTop: 6 }]}>
                                    {appLockError}
                                </Text>
                            )}
                        </View>
                        <Switch
                            disabled={appLockBusy}
                            value={appLockEnabled}
                            onValueChange={handleAppLockToggle}
                            trackColor={{ false: tc.secondaryText, true: tc.tint }}
                        />
                    </View>

                    {isAppSearchSupported() && (
                        <SettingToggleRow
                            divider
                            label={tr('settings.appSearchLabel')}
                            description={tr('settings.appSearchDesc')}
                            value={appSearchEnabled}
                            onChange={handleAppSearchToggle}
                            trackColor={{ false: tc.secondaryText, true: tc.tint }}
                        />
                    )}
                </View>

                {themePickerOpen && <MoeSettings visible onClose={() => setThemePickerOpen(false)} />}

                <Text style={[styles.sectionTitle, { color: tc.secondaryText, marginTop: 16 }]}>{t('settings.language')}</Text>
                <Text style={[styles.description, { color: tc.secondaryText }]}>{t('settings.selectLang')}</Text>
                <View style={[styles.settingCard, { backgroundColor: tc.cardBg }]}>
                    <SettingRow
                        onPress={() => setLanguagePickerOpen(true)}
                        label={t('settings.language')}
                        description={languageLabel(language)}
                    >
                        <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                    </SettingRow>
                </View>
                <Modal
                    transparent
                    visible={languagePickerOpen}
                    animationType="fade"
                    onRequestClose={() => setLanguagePickerOpen(false)}
                >
                    <Pressable style={styles.pickerOverlay} onPress={() => setLanguagePickerOpen(false)}>
                        <View
                            style={[styles.pickerCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={[styles.pickerTitle, { color: tc.text }]}>{t('settings.language')}</Text>
                            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                                {LANGUAGES.map((lang) => {
                                    const selected = language === lang.id;
                                    return (
                                        <TouchableOpacity
                                            key={lang.id}
                                            style={[
                                                styles.pickerOption,
                                                { borderColor: tc.border, backgroundColor: selected ? tc.filterBg : 'transparent' },
                                            ]}
                                            onPress={() => {
                                                setLanguage(lang.id);
                                                updateSettings({ language: lang.id }).catch(console.error);
                                                setLanguagePickerOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.pickerOptionText, { color: selected ? tc.tint : tc.text }]}>
                                                {languageLabel(lang.id)}
                                            </Text>
                                            {selected && <Ionicons color={tc.tint} name="checkmark" size={18} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>

                <View style={[styles.settingCard, { backgroundColor: tc.cardBg, marginTop: 12 }]}>
                    <SettingRow
                        onPress={() => setWeekStartPickerOpen(true)}
                        label={t('settings.weekStart')}
                        description={currentWeekStartLabel}
                    >
                        <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                    </SettingRow>
                </View>
                <Modal
                    transparent
                    visible={weekStartPickerOpen}
                    animationType="fade"
                    onRequestClose={() => setWeekStartPickerOpen(false)}
                >
                    <Pressable style={styles.pickerOverlay} onPress={() => setWeekStartPickerOpen(false)}>
                        <View
                            style={[styles.pickerCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={[styles.pickerTitle, { color: tc.text }]}>{t('settings.weekStart')}</Text>
                            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                                {weekStartOptions.map((option) => {
                                    const selected = weekStart === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.pickerOption,
                                                { borderColor: tc.border, backgroundColor: selected ? tc.filterBg : 'transparent' },
                                            ]}
                                            onPress={() => {
                                                updateSettings({ weekStart: option.value }).catch(console.error);
                                                setWeekStartPickerOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.pickerOptionText, { color: selected ? tc.tint : tc.text }]}>
                                                {option.label}
                                            </Text>
                                            {selected && <Ionicons color={tc.tint} name="checkmark" size={18} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>

                <View style={[styles.settingCard, { backgroundColor: tc.cardBg, marginTop: 12 }]}>
                    <SettingRow
                        onPress={() => setDateFormatPickerOpen(true)}
                        label={t('settings.dateFormat')}
                        description={currentDateFormatLabel}
                    >
                        <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                    </SettingRow>
                </View>
                <Modal
                    transparent
                    visible={dateFormatPickerOpen}
                    animationType="fade"
                    onRequestClose={() => setDateFormatPickerOpen(false)}
                >
                    <Pressable style={styles.pickerOverlay} onPress={() => setDateFormatPickerOpen(false)}>
                        <View
                            style={[styles.pickerCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={[styles.pickerTitle, { color: tc.text }]}>{t('settings.dateFormat')}</Text>
                            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                                {dateFormatOptions.map((option) => {
                                    const selected = dateFormat === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.pickerOption,
                                                { borderColor: tc.border, backgroundColor: selected ? tc.filterBg : 'transparent' },
                                            ]}
                                            onPress={() => {
                                                updateSettings({ dateFormat: option.value }).catch(console.error);
                                                setDateFormatPickerOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.pickerOptionText, { color: selected ? tc.tint : tc.text }]}>
                                                {option.label}
                                            </Text>
                                            {selected && <Ionicons color={tc.tint} name="checkmark" size={18} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>

                {showCalendarSystem && (
                    <>
                        <View style={[styles.settingCard, { backgroundColor: tc.cardBg, marginTop: 12 }]}>
                            <SettingRow
                                onPress={() => setCalendarSystemPickerOpen(true)}
                                label={t('settings.calendarSystem')}
                                description={currentCalendarSystemLabel}
                            >
                                <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                            </SettingRow>
                        </View>
                        <Modal
                            transparent
                            visible={calendarSystemPickerOpen}
                            animationType="fade"
                            onRequestClose={() => setCalendarSystemPickerOpen(false)}
                        >
                            <Pressable style={styles.pickerOverlay} onPress={() => setCalendarSystemPickerOpen(false)}>
                                <View
                                    style={[styles.pickerCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
                                    onStartShouldSetResponder={() => true}
                                >
                                    <Text style={[styles.pickerTitle, { color: tc.text }]}>{t('settings.calendarSystem')}</Text>
                                    <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                                        {calendarSystemOptions.map((option) => {
                                            const selected = calendarSystem === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[
                                                        styles.pickerOption,
                                                        { borderColor: tc.border, backgroundColor: selected ? tc.filterBg : 'transparent' },
                                                    ]}
                                                    onPress={() => {
                                                        updateSettings({ calendarSystem: option.value }).catch(console.error);
                                                        setCalendarSystemPickerOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.pickerOptionText, { color: selected ? tc.tint : tc.text }]}>
                                                        {option.label}
                                                    </Text>
                                                    {selected && <Ionicons color={tc.tint} name="checkmark" size={18} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            </Pressable>
                        </Modal>
                    </>
                )}

                <View style={[styles.settingCard, { backgroundColor: tc.cardBg, marginTop: 12 }]}>
                    <SettingRow
                        onPress={() => setTimeFormatPickerOpen(true)}
                        label={t('settings.timeFormat')}
                        description={currentTimeFormatLabel}
                    >
                        <Ionicons color={tc.secondaryText} name="chevron-down" size={18} />
                    </SettingRow>
                </View>
                <Modal
                    transparent
                    visible={timeFormatPickerOpen}
                    animationType="fade"
                    onRequestClose={() => setTimeFormatPickerOpen(false)}
                >
                    <Pressable style={styles.pickerOverlay} onPress={() => setTimeFormatPickerOpen(false)}>
                        <View
                            style={[styles.pickerCard, { backgroundColor: tc.cardBg, borderColor: tc.border }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <Text style={[styles.pickerTitle, { color: tc.text }]}>{t('settings.timeFormat')}</Text>
                            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
                                {timeFormatOptions.map((option) => {
                                    const selected = timeFormat === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.pickerOption,
                                                { borderColor: tc.border, backgroundColor: selected ? tc.filterBg : 'transparent' },
                                            ]}
                                            onPress={() => {
                                                updateSettings({ timeFormat: option.value }).catch(console.error);
                                                setTimeFormatPickerOpen(false);
                                            }}
                                        >
                                            <Text style={[styles.pickerOptionText, { color: selected ? tc.tint : tc.text }]}>
                                                {option.label}
                                            </Text>
                                            {selected && <Ionicons color={tc.tint} name="checkmark" size={18} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}
