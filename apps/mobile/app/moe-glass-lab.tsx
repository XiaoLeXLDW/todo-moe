import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface, glassCapabilities } from '@/moe/glass/GlassSurface';
import type { GlassMode } from '@/moe/glass/capabilities';

/** Repeatable native visual fixture; never reads or writes the task store. */
export default function MoeGlassLab() {
    const insets = useSafeAreaInsets();
    const [mode, setMode] = useState<GlassMode>('soft');
    const [dark, setDark] = useState(false);
    const [reduced, setReduced] = useState(false);
    const [selected, setSelected] = useState(0);
    const [text, setText] = useState('');
    return (
        <KeyboardAvoidingView style={[styles.page, { backgroundColor: dark ? '#171927' : '#faf7ff' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen options={{ title: '玻璃验证', headerShown: true }} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 130 + insets.bottom }}>
                <Text style={[styles.title, { color: dark ? '#fff' : '#22243a' }]}>滚动背景，比较三种效果</Text>
                <Text style={{ color: dark ? '#ccd1e6' : '#53556b', marginBottom: 12 }}>{glassCapabilities().reason}</Text>
                <View style={styles.controls}>
                    {(['off', 'soft', 'liquid'] as const).map((value, index) => (
                        <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.button, mode === value && styles.active]}>
                            <Text style={styles.buttonText}>{['关闭', '柔和', '液态'][index]}</Text>
                        </Pressable>
                    ))}
                    <Pressable accessibilityRole="switch" accessibilityState={{ checked: dark }} onPress={() => setDark(!dark)} style={styles.button}><Text style={styles.buttonText}>深色</Text></Pressable>
                    <Pressable accessibilityRole="switch" accessibilityState={{ checked: reduced }} onPress={() => setReduced(!reduced)} style={styles.button}><Text style={styles.buttonText}>减少动画</Text></Pressable>
                </View>
                <TextInput value={text} onChangeText={setText} placeholder="键盘与中文输入测试（不保存）" accessibilityLabel="玻璃验证输入" style={styles.input} />
                {Array.from({ length: 40 }, (_, index) => (
                    <View key={index} style={[styles.tile, { backgroundColor: ['#d7c8fb', '#acebd8', '#f8c7d7', '#bddcfc', '#f8dfa6'][index % 5] }]}>
                        <Text style={styles.tileTitle}>{String(index + 1).padStart(2, '0')}  Moe Glass · 原生动态背景</Text>
                        <View style={styles.stripes}>{[0, 1, 2, 3].map((stripe) => <View key={stripe} style={[styles.stripe, { backgroundColor: stripe % 2 ? '#36436d' : '#fff' }]} />)}</View>
                        <Text>文字、条纹与颜色应随滚动经过底栏；静态半透明不算动态采样通过。</Text>
                    </View>
                ))}
            </ScrollView>
            <GlassSurface mode={mode} dark={dark} reducedMotion={reduced} style={[styles.bar, { bottom: 12 + insets.bottom }]}>
                {[0, 1, 2].map((index) => (
                    <Pressable key={index} accessibilityRole="tab" accessibilityState={{ selected: selected === index }} onPress={() => setSelected(index)} style={[styles.tab, selected === index && { backgroundColor: dark ? '#ffffff22' : '#7777aa22' }]}>
                        <Text style={{ color: dark ? '#fff' : '#22243a', fontWeight: selected === index ? '800' : '400' }}>{['今天', '清单', '收件箱'][index]}</Text>
                    </Pressable>
                ))}
            </GlassSurface>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1 }, title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
    controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    button: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 16, backgroundColor: '#68617e' },
    active: { backgroundColor: '#5943bf' }, buttonText: { color: '#fff', fontWeight: '700' },
    input: { padding: 16, marginVertical: 16, borderRadius: 16, backgroundColor: '#fff', color: '#22243a', minHeight: 52 },
    tile: { borderRadius: 20, padding: 18, marginBottom: 14, minHeight: 140, gap: 12 },
    tileTitle: { fontSize: 19, fontWeight: '700', color: '#22243a' },
    stripes: { flexDirection: 'row', gap: 10 }, stripe: { width: 36, height: 24, borderRadius: 5 },
    bar: { position: 'absolute', left: 16, right: 16, height: 72, flexDirection: 'row', padding: 8, gap: 8 },
    tab: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
});
