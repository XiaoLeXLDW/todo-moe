import React, { useEffect, useState } from 'react';
import { FlatList, Image, Linking, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppIdentity, TODO_MOE_RELEASES_URL, TODO_MOE_ISSUES_URL, TODO_MOE_REPOSITORY } from '@/lib/app-identity';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useToast } from '@/contexts/toast-context';
import { useLanguage } from '@/contexts/language-context';
import { getProductHelp, getProductPrivacy } from '@/moe/legal/product-information';
import { bundledNotices, noticeCoverage } from '@/moe/legal/notices.generated';
import { UPDATE_BADGE_AVAILABLE_KEY, UPDATE_BADGE_LATEST_KEY } from './settings.constants';
import { useSettingsScrollContent } from './settings.hooks';
import { SettingsTopBar } from './settings.shell';
import { styles } from './settings.styles';
import todoMoeIcon from '../../moe/brand/icon.png';

export function AboutSettingsScreen({ onUpdateBadgeChange }: { onUpdateBadgeChange: (next: boolean) => void }) {
    const tc = useThemeColors();
    const reduced = useReducedMotion();
    const { showToast } = useToast();
    const { language } = useLanguage();
    const zh = language.startsWith('zh');
    const label = (cn: string, en: string) => zh ? cn : en;
    const scrollContentStyle = useSettingsScrollContent();
    const [buildOpen, setBuildOpen] = useState(false);
    const [document, setDocument] = useState<{ title: string; text: string } | null>(null);
    const [licensesOpen, setLicensesOpen] = useState(false);
    const [query, setQuery] = useState('');
    const identity = getAppIdentity();
    const build = Constants.expoConfig?.extra?.todoMoe as { versionCode?: number; sourceSha?: string; dirty?: boolean; upstreamVersion?: string; upstreamSha?: string } | undefined;
    const unknown = label('未知', 'Unknown');
    const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || label('未知版本', 'Unknown version');
    const versionCode = Application.nativeBuildVersion || build?.versionCode || unknown;
    useEffect(() => {
        // Releases are opened explicitly. Discard badges left by the upstream store checker.
        onUpdateBadgeChange(false);
        void AsyncStorage.multiRemove([UPDATE_BADGE_AVAILABLE_KEY, UPDATE_BADGE_LATEST_KEY]).catch(() => undefined);
    }, [onUpdateBadgeChange]);
    const openLink = async (url: string) => {
        try { await Linking.openURL(url); }
        catch { showToast({ title: label('无法打开链接', 'Could not open link'), message: label('请稍后再试，或在浏览器打开 Todo Moe 仓库。', 'Try again later or open the Todo Moe repository in your browser.'), tone: 'warning' }); }
    };
    const row = (title: string, subtitle: string, onPress: () => void, external = false) => (
        <TouchableOpacity accessibilityRole={external ? 'link' : 'button'} onPress={onPress} style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: tc.border, minHeight: 60 }]}>
            <View style={{ flex: 1, paddingVertical: 8 }}>
                <Text style={[styles.settingLabel, { color: tc.text }]}>{title}</Text>
                <Text style={{ color: tc.secondaryText, marginTop: 4, lineHeight: 20 }}>{subtitle}</Text>
            </View>
            <Text style={{ color: tc.secondaryText, marginLeft: 12 }}>{external ? '↗' : '›'}</Text>
        </TouchableOpacity>
    );
    const closeReader = () => document ? setDocument(null) : setLicensesOpen(false);
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['bottom']}>
            <SettingsTopBar title={label('关于 Todo Moe', 'About Todo Moe')} />
            <ScrollView style={styles.scrollView} contentContainerStyle={scrollContentStyle}>
                <View style={[styles.settingCard, { backgroundColor: tc.cardBg }]}>
                    <View style={[styles.aboutAppHeader, { borderBottomColor: tc.border }]}>
                        <Image source={todoMoeIcon} style={styles.aboutAppIcon} resizeMode="cover" />
                        <Text style={[styles.aboutAppName, { color: tc.text }]}>Todo Moe{identity.channel === 'development' ? ' Dev' : ''}</Text>
                        <Text selectable style={[styles.aboutAppVersion, { color: tc.secondaryText }]}>{label('版本', 'Version')} {version} · {versionCode}</Text>
                        <Text style={{ color: tc.secondaryText, marginTop: 8 }}>{label('轻巧、顺手的待办清单', 'A lightweight, comfortable task list')}</Text>
                    </View>
                    {row(label('下载与更新', 'Download & updates'), label('GitHub Releases · 正式 APK', 'GitHub Releases · Stable APK'), () => void openLink(TODO_MOE_RELEASES_URL), true)}
                    {row(label('使用帮助', 'Help'), label('记录、整理、撤销和备份', 'Capture, organize, undo, and back up'), () => setDocument({ title: label('使用帮助', 'Help'), text: getProductHelp(language) }))}
                    {row(label('反馈问题', 'Report a problem'), label('在 Todo Moe 仓库提交问题', 'Open an issue in the Todo Moe repository'), () => void openLink(TODO_MOE_ISSUES_URL), true)}
                    {row(label('源代码', 'Source code'), 'XiaoLeXLDW / todo-moe', () => void openLink(TODO_MOE_REPOSITORY), true)}
                    {row(label('隐私说明', 'Privacy information'), label('本地数据、可选服务与权限', 'Local data, optional services, and permissions'), () => setDocument({ title: label('隐私说明', 'Privacy information'), text: getProductPrivacy(language) }))}
                    {row(label('开源许可与致谢', 'Open-source licenses & credits'), label('AGPL-3.0-only · 离线阅读', 'AGPL-3.0-only · available offline'), () => setLicensesOpen(true))}
                    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: buildOpen }} onPress={() => setBuildOpen(!buildOpen)} style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: tc.secondaryText }]}>{label('构建信息', 'Build information')} {buildOpen ? '⌃' : '⌄'}</Text>
                    </TouchableOpacity>
                    {buildOpen && <Text selectable style={{ color: tc.secondaryText, padding: 16, lineHeight: 22 }}>{`${identity.channel}\n${identity.packageName}\n${label('源码', 'Source')}: ${build?.sourceSha || unknown}${build?.dirty ? label('（含未提交改动）', ' (with uncommitted changes)') : ''}\n${label('上游 Mindwtr', 'Upstream Mindwtr')}: ${build?.upstreamVersion || unknown}\n${build?.upstreamSha || ''}`}</Text>}
                </View>
                <Text style={{ color: tc.secondaryText, padding: 16, lineHeight: 22 }}>{label('基于 Mindwtr。感谢上游作者、SukiSU-Ultra、compose-miuix-ui、AndroidLiquidGlass 及所有开源贡献者。', 'Based on Mindwtr. Thanks to its authors, SukiSU-Ultra, compose-miuix-ui, AndroidLiquidGlass, and all open-source contributors.')}</Text>
            </ScrollView>
            <Modal visible={licensesOpen || document !== null} animationType={reduced ? 'none' : 'slide'} onRequestClose={closeReader}>
                <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label('返回', 'Back')} onPress={closeReader} style={{ padding: 20, minHeight: 56 }}>
                        <Text style={{ color: tc.text, fontSize: 18 }}>‹ {document?.title || label('开源许可与致谢', 'Open-source licenses & credits')}</Text>
                    </TouchableOpacity>
                    {document ? <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Text selectable style={{ color: tc.text, fontSize: 15, lineHeight: 24 }}>{document.text}</Text></ScrollView> : <>
                        <Text style={{ color: tc.secondaryText, paddingHorizontal: 20, lineHeight: 22 }}>{label('完整许可随应用提供，无需联网。依赖清单来自已安装的移动端运行依赖声明，不等同于完整 APK 二进制审计。', 'Full license texts are bundled for offline reading. The dependency list comes from declared mobile runtime dependencies and is not a complete APK binary audit.')}</Text>
                        <TextInput accessibilityLabel={label('搜索开源组件', 'Search open-source components')} placeholder={label('搜索组件或许可证', 'Search components or licenses')} placeholderTextColor={tc.secondaryText} value={query} onChangeText={setQuery} style={{ color: tc.text, padding: 16, margin: 16, borderWidth: 1, borderColor: tc.border, borderRadius: 12 }} />
                        <FlatList keyboardShouldPersistTaps="handled" data={bundledNotices.filter(item => item.title.toLowerCase().includes(query.toLowerCase()))} keyExtractor={item => item.source} renderItem={({ item }) => row(item.title, label('查看完整文本', 'View full text'), () => setDocument(item))} ListFooterComponent={row(label('清单覆盖范围', 'Notice coverage'), label('部分组件未附独立根目录许可文件', 'Some components do not include a separate root license file'), () => setDocument({ title: label('清单覆盖范围', 'Notice coverage'), text: `${noticeCoverage.scope}\n\n${noticeCoverage.missing.join('\n')}` }))} />
                    </>}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
