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
import { productHelp, productPrivacy } from '@/moe/legal/product-information';
import { bundledNotices, noticeCoverage } from '@/moe/legal/notices.generated';
import { UPDATE_BADGE_AVAILABLE_KEY, UPDATE_BADGE_LATEST_KEY } from './settings.constants';
import { useSettingsScrollContent } from './settings.hooks';
import { SettingsTopBar } from './settings.shell';
import { styles } from './settings.styles';

export function AboutSettingsScreen({ onUpdateBadgeChange }: { onUpdateBadgeChange: (next: boolean) => void }) {
    const tc = useThemeColors();
    const reduced = useReducedMotion();
    const { showToast } = useToast();
    const scrollContentStyle = useSettingsScrollContent();
    const [buildOpen, setBuildOpen] = useState(false);
    const [document, setDocument] = useState<{ title: string; text: string } | null>(null);
    const [licensesOpen, setLicensesOpen] = useState(false);
    const [query, setQuery] = useState('');
    const identity = getAppIdentity();
    const build = Constants.expoConfig?.extra?.todoMoe as { versionCode?: number; sourceSha?: string; dirty?: boolean; upstreamVersion?: string; upstreamSha?: string } | undefined;
    const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || '未知版本';
    const versionCode = Application.nativeBuildVersion || build?.versionCode || '未知';
    useEffect(() => {
        // Releases are opened explicitly. Discard badges left by the upstream store checker.
        onUpdateBadgeChange(false);
        void AsyncStorage.multiRemove([UPDATE_BADGE_AVAILABLE_KEY, UPDATE_BADGE_LATEST_KEY]).catch(() => undefined);
    }, [onUpdateBadgeChange]);
    const openLink = async (url: string) => {
        try { await Linking.openURL(url); }
        catch { showToast({ title: '无法打开链接', message: '请稍后再试，或在浏览器打开 Todo Moe 仓库。', tone: 'warning' }); }
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
            <SettingsTopBar title="关于 Todo Moe" />
            <ScrollView style={styles.scrollView} contentContainerStyle={scrollContentStyle}>
                <View style={[styles.settingCard, { backgroundColor: tc.cardBg }]}>
                    <View style={[styles.aboutAppHeader, { borderBottomColor: tc.border }]}>
                        <Image source={require('../../moe/brand/icon.png')} style={styles.aboutAppIcon} resizeMode="cover" />
                        <Text style={[styles.aboutAppName, { color: tc.text }]}>Todo Moe{identity.channel === 'development' ? ' Dev' : ''}</Text>
                        <Text selectable style={[styles.aboutAppVersion, { color: tc.secondaryText }]}>版本 {version} · {versionCode}</Text>
                        <Text style={{ color: tc.secondaryText, marginTop: 8 }}>轻巧、顺手的待办清单</Text>
                    </View>
                    {row('下载与更新', 'GitHub Releases · 正式 APK', () => void openLink(TODO_MOE_RELEASES_URL), true)}
                    {row('使用帮助', '记录、整理、撤销和备份', () => setDocument({ title: '使用帮助', text: productHelp }))}
                    {row('反馈问题', '在 Todo Moe 仓库提交问题', () => void openLink(TODO_MOE_ISSUES_URL), true)}
                    {row('源代码', 'XiaoLeXLDW / todo-moe', () => void openLink(TODO_MOE_REPOSITORY), true)}
                    {row('隐私说明', '本地数据、可选服务与权限', () => setDocument({ title: '隐私说明', text: productPrivacy }))}
                    {row('开源许可与致谢', 'AGPL-3.0-only · 离线阅读', () => setLicensesOpen(true))}
                    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: buildOpen }} onPress={() => setBuildOpen(!buildOpen)} style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: tc.secondaryText }]}>构建信息 {buildOpen ? '⌃' : '⌄'}</Text>
                    </TouchableOpacity>
                    {buildOpen && <Text selectable style={{ color: tc.secondaryText, padding: 16, lineHeight: 22 }}>{`${identity.channel}\n${identity.packageName}\n源码：${build?.sourceSha || '未知'}${build?.dirty ? '（含未提交改动）' : ''}\n上游 Mindwtr：${build?.upstreamVersion || '未知'}\n${build?.upstreamSha || ''}`}</Text>}
                </View>
                <Text style={{ color: tc.secondaryText, padding: 16, lineHeight: 22 }}>基于 Mindwtr。感谢上游作者、SukiSU-Ultra、compose-miuix-ui、AndroidLiquidGlass 及所有开源贡献者。</Text>
            </ScrollView>
            <Modal visible={licensesOpen || document !== null} animationType={reduced ? 'none' : 'slide'} onRequestClose={closeReader}>
                <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="返回" onPress={closeReader} style={{ padding: 20, minHeight: 56 }}>
                        <Text style={{ color: tc.text, fontSize: 18 }}>‹ {document?.title || '开源许可与致谢'}</Text>
                    </TouchableOpacity>
                    {document ? <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Text selectable style={{ color: tc.text, fontSize: 15, lineHeight: 24 }}>{document.text}</Text></ScrollView> : <>
                        <Text style={{ color: tc.secondaryText, paddingHorizontal: 20, lineHeight: 22 }}>完整许可随应用提供，无需联网。依赖清单来自已安装的移动端运行依赖声明，不等同于完整 APK 二进制审计。</Text>
                        <TextInput accessibilityLabel="搜索开源组件" placeholder="搜索组件或许可证" placeholderTextColor={tc.secondaryText} value={query} onChangeText={setQuery} style={{ color: tc.text, padding: 16, margin: 16, borderWidth: 1, borderColor: tc.border, borderRadius: 12 }} />
                        <FlatList keyboardShouldPersistTaps="handled" data={bundledNotices.filter(item => item.title.toLowerCase().includes(query.toLowerCase()))} keyExtractor={item => item.source} renderItem={({ item }) => row(item.title, '查看完整文本', () => setDocument(item))} ListFooterComponent={row('清单覆盖范围', '部分组件未附独立根目录许可文件', () => setDocument({ title: '清单覆盖范围', text: `${noticeCoverage.scope}\n\n${noticeCoverage.missing.join('\n')}` }))} />
                    </>}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
