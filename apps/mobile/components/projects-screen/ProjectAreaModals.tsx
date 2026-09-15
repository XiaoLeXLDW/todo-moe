import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ban } from 'lucide-react-native';
import { tFallback, type Area, type Project } from '@mindwtr/core';

import { projectsScreenStyles as styles } from './projects-screen.styles';
import { applyLiveProjectUpdate, getLiveMutableProject } from './project-meta-pickers';
import { useAndroidKeyboardInset } from '../../lib/use-android-keyboard-inset';
import { isActionFailure } from '../store-action-result';
import { MoeFolderIcon } from '@/moe/MoeFolderIcon';
import { MoeGlassPanel } from '@/moe/glass/MoeGlassPanel';

type ThemeColors = {
    danger?: string;
    border: string;
    cardBg: string;
    inputBg: string;
    secondaryText: string;
    text: string;
    tint: string;
};

type ProjectAreaModalsProps = {
    standalone?: boolean;
    addArea: (name: string, options: { color: string }) => void | Promise<unknown>;
    areaListMaxHeight: number;
    areaManagerListMaxHeight: number;
    areaUsage: Map<string, number>;
    colors: readonly string[];
    expandedAreaColorId: string | null;
    newAreaColor: string;
    newAreaName: string;
    onCloseAreaManager: () => void;
    onDeleteArea: (id: string) => void;
    onSetExpandedAreaColorId: React.Dispatch<React.SetStateAction<string | null>>;
    onSetNewAreaColor: React.Dispatch<React.SetStateAction<string>>;
    onSetNewAreaName: React.Dispatch<React.SetStateAction<string>>;
    onSetSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>;
    onSetShowAreaManager: React.Dispatch<React.SetStateAction<boolean>>;
    onSetShowAreaPicker: React.Dispatch<React.SetStateAction<boolean>>;
    onShowToast: (options: { title: string; message: string; tone: 'warning' | 'error' | 'success' | 'info' }) => void;
    overlayModalPresentation: 'overFullScreen' | 'fullScreen';
    pickerCardMaxHeight: number;
    selectedProject: Project | null;
    showAreaManager: boolean;
    showAreaPicker: boolean;
    sortedAreas: Area[];
    sortAreasByColor: () => void;
    sortAreasByName: () => void;
    t: (key: string) => string;
    tc: ThemeColors;
    updateArea: (id: string, updates: Partial<Area>) => void | Promise<unknown>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<unknown>;
};

export function ProjectAreaModals({
    standalone = false,
    addArea,
    areaListMaxHeight,
    areaManagerListMaxHeight,
    areaUsage,
    colors,
    expandedAreaColorId,
    newAreaColor,
    newAreaName,
    onCloseAreaManager,
    onDeleteArea,
    onSetExpandedAreaColorId,
    onSetNewAreaColor,
    onSetNewAreaName,
    onSetSelectedProject,
    onSetShowAreaManager,
    onSetShowAreaPicker,
    onShowToast,
    overlayModalPresentation,
    pickerCardMaxHeight,
    selectedProject,
    showAreaManager,
    showAreaPicker,
    sortedAreas,
    sortAreasByColor,
    sortAreasByName,
    t,
    tc,
    updateArea,
    updateProject,
}: ProjectAreaModalsProps) {
    const keyboardInset = useAndroidKeyboardInset(showAreaManager);
    const [editingAreaId, setEditingAreaId] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');
    const pendingSave = React.useRef(false);
    const managerSession = React.useRef(0);
    React.useEffect(() => {
        managerSession.current += 1;
        pendingSave.current = false;
        setSaving(false);
        setSaveError('');
        setEditingAreaId(null);
        return () => { managerSession.current += 1; };
    }, [showAreaManager]);
    const dismissProjectPickers = React.useCallback(() => {
        onSetShowAreaPicker(false);
        onSetShowAreaManager(false);
    }, [onSetShowAreaManager, onSetShowAreaPicker]);
    const setProjectArea = React.useCallback((areaId?: string) => {
        if (!selectedProject) {
            dismissProjectPickers();
            return false;
        }
        return applyLiveProjectUpdate({
            projectId: selectedProject.id,
            updates: { areaId },
            updateProject,
            setSelectedProject: onSetSelectedProject,
            onBlocked: dismissProjectPickers,
            onFailed: (message) => onShowToast({
                title: tFallback(t, 'common.error', 'Error'),
                message: message || tFallback(t, 'projects.updateFailed', 'Could not update list.'),
                tone: 'error',
            }),
        });
    }, [dismissProjectPickers, onSetSelectedProject, onShowToast, selectedProject, t, updateProject]);

    React.useEffect(() => {
        if (standalone || selectedProject?.status !== 'archived') return;
        dismissProjectPickers();
    }, [dismissProjectPickers, selectedProject?.status, standalone]);

    const saveArea = async () => {
        const name = newAreaName.trim();
        if (!name || pendingSave.current) return;
        if (!standalone && (!selectedProject || !getLiveMutableProject(selectedProject.id))) {
            dismissProjectPickers();
            return;
        }
        pendingSave.current = true;
        setSaving(true);
        setSaveError('');
        const session = managerSession.current;
        try {
            const result = editingAreaId
                ? await updateArea(editingAreaId, { name, color: newAreaColor })
                : await addArea(name, { color: newAreaColor });
            if (session !== managerSession.current) return;
            if (isActionFailure(result) || (!editingAreaId && !result)) {
                setSaveError(tFallback(t, 'projects.createAreaFailed', 'Could not save folder'));
                return;
            }
            onSetNewAreaName('');
            onCloseAreaManager();
        } catch {
            if (session === managerSession.current) setSaveError(tFallback(t, 'projects.createAreaFailed', 'Could not save folder'));
        } finally {
            if (session === managerSession.current) {
                pendingSave.current = false;
                setSaving(false);
            }
        }
    };

    return (
        <>
            <Modal
                visible={showAreaPicker}
                transparent
                animationType="fade"
                presentationStyle={overlayModalPresentation}
                onRequestClose={() => onSetShowAreaPicker(false)}
            >
                <Pressable style={styles.overlay} onPress={() => onSetShowAreaPicker(false)}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                    >
                        <MoeGlassPanel active={showAreaPicker} cornerRadius={14}
                            style={[styles.pickerCard, { borderColor: tc.border, maxHeight: pickerCardMaxHeight }]}>
                        <Text style={[styles.linkModalTitle, { color: tc.text }]}>{t('projects.areaLabel')}</Text>
                        <TouchableOpacity
                            style={[styles.pickerRow, { borderColor: tc.border }]}
                            onPress={() => {
                                if (!selectedProject || !getLiveMutableProject(selectedProject.id)) {
                                    dismissProjectPickers();
                                    return;
                                }
                                onSetShowAreaPicker(false);
                                onSetNewAreaName('');
                                onSetNewAreaColor(colors[0] || '#3b82f6');
                                onSetShowAreaManager(true);
                            }}
                        >
                            <Text style={[styles.pickerRowText, { color: tc.secondaryText }]}>+ {t('projects.areaLabel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pickerRow, { borderColor: tc.border }]}
                            onPress={async () => {
                                if (await setProjectArea(undefined)) onSetShowAreaPicker(false);
                            }}
                        >
                            <Text style={[styles.pickerRowText, { color: tc.text }]}>{t('projects.noArea')}</Text>
                        </TouchableOpacity>
                        <ScrollView style={{ maxHeight: areaListMaxHeight }}>
                            {sortedAreas.map((area) => (
                                <TouchableOpacity
                                    key={area.id}
                                    style={[styles.pickerRow, { borderColor: tc.border }]}
                                    onPress={async () => {
                                        if (await setProjectArea(area.id)) onSetShowAreaPicker(false);
                                    }}
                                >
                                    <MoeFolderIcon icon={area.icon} color={area.color || tc.tint} />
                                    <Text style={[styles.pickerRowText, { color: tc.text }]}>{area.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        </MoeGlassPanel>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={showAreaManager}
                transparent
                animationType="fade"
                presentationStyle={overlayModalPresentation}
                onRequestClose={saving ? () => undefined : onCloseAreaManager}
            >
                <Pressable
                    style={keyboardInset > 0 ? [styles.overlay, { paddingBottom: keyboardInset }] : styles.overlay}
                    onPress={saving ? undefined : onCloseAreaManager}
                >
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                    >
                        <MoeGlassPanel active={showAreaManager} cornerRadius={14}
                            style={[styles.pickerCard, { borderColor: tc.border, maxHeight: pickerCardMaxHeight }]}>
                        <View style={styles.areaManagerHeader}>
                            <Text style={[styles.linkModalTitle, { color: tc.text }]}>{t('projects.areaLabel')}</Text>
                            <View style={styles.areaSortButtons}>
                                <TouchableOpacity onPress={sortAreasByName} style={[styles.areaSortButton, { borderColor: tc.border }]}>
                                    <Text style={[styles.areaSortText, { color: tc.secondaryText }]}>{t('projects.sortByName')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={sortAreasByColor} style={[styles.areaSortButton, { borderColor: tc.border }]}>
                                    <Text style={[styles.areaSortText, { color: tc.secondaryText }]}>{t('projects.sortByColor')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {sortedAreas.length === 0 ? (
                            <Text style={[styles.helperText, { color: tc.secondaryText }]}>{t('projects.noArea')}</Text>
                        ) : (
                            <ScrollView
                                style={{ maxHeight: areaManagerListMaxHeight, minHeight: 120 }}
                                contentContainerStyle={[styles.areaManagerList, { flexGrow: 1 }]}
                                showsVerticalScrollIndicator
                                nestedScrollEnabled
                            >
                                {sortedAreas.map((area) => {
                                    const inUse = (areaUsage.get(area.id) || 0) > 0;
                                    const isExpanded = expandedAreaColorId === area.id;
                                    return (
                                        <View key={area.id} style={styles.areaManagerItem}>
                                            <View style={[styles.areaManagerRow, { borderColor: tc.border }]}>
                                                <View style={styles.areaManagerInfo}>
                                                    <MoeFolderIcon icon={area.icon} color={area.color || tc.tint} />
                                                    <Text style={[styles.areaManagerText, { color: tc.text }]} numberOfLines={2}>{area.name}</Text>
                                                </View>
                                                <View style={styles.areaManagerActions}>
                                                    <TouchableOpacity
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`${t('projects.renameArea')}: ${area.name}`}
                                                        disabled={saving}
                                                        onPress={() => {
                                                            setEditingAreaId(area.id);
                                                            setSaveError('');
                                                            onSetNewAreaName(area.name);
                                                            onSetNewAreaColor(area.color || colors[0] || '#3b82f6');
                                                        }}
                                                        style={styles.areaRenameButton}
                                                    >
                                                        <Text style={{ color: tc.tint }}>{t('common.edit')}</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => onSetExpandedAreaColorId(isExpanded ? null : area.id)}
                                                        style={[styles.colorToggleButton, { borderColor: tc.border }]}
                                                    >
                                                        <View style={[styles.colorOption, { backgroundColor: area.color || tc.tint }]} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        disabled={inUse}
                                                        onPress={() => {
                                                            if (inUse) {
                                                                onShowToast({
                                                                    title: tFallback(t, 'common.notice', 'Notice'),
                                                                    message: tFallback(t, 'projects.areaInUse', 'Area has projects.'),
                                                                    tone: 'warning',
                                                                });
                                                                return;
                                                            }
                                                            onDeleteArea(area.id);
                                                        }}
                                                        style={[styles.areaDeleteButton, inUse && styles.areaDeleteButtonDisabled]}
                                                    >
                                                        <Text style={[styles.areaDeleteText, { color: inUse ? tc.secondaryText : '#EF4444' }]}>
                                                            {t('common.delete')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            {isExpanded ? (
                                                <View style={styles.areaColorPickerRow}>
                                                    <TouchableOpacity
                                                        accessibilityLabel={tFallback(t, 'projects.colorNone', 'None')}
                                                        style={[
                                                            styles.colorOption,
                                                            styles.colorOptionNone,
                                                            { borderColor: tc.border },
                                                            // Not styles.colorOptionSelected (#000 border) — invisible
                                                            // against this button's transparent fill in dark theme.
                                                            // The color swatches below stay visible on #000 because
                                                            // they have a solid fill; this one needs a theme token.
                                                            !area.color && { borderColor: tc.tint },
                                                        ]}
                                                        onPress={() => {
                                                            void updateArea(area.id, { color: undefined });
                                                            onSetExpandedAreaColorId(null);
                                                        }}
                                                    >
                                                        <Ban size={16} color={tc.secondaryText} />
                                                    </TouchableOpacity>
                                                    {colors.map((color) => (
                                                        <TouchableOpacity
                                                            key={`${area.id}-${color}`}
                                                            style={[
                                                                styles.colorOption,
                                                                { backgroundColor: color },
                                                                (area.color || tc.tint) === color && styles.colorOptionSelected,
                                                            ]}
                                                            onPress={() => {
                                                                void updateArea(area.id, { color });
                                                                onSetExpandedAreaColorId(null);
                                                            }}
                                                        />
                                                    ))}
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        )}
                        <View style={styles.areaEditorHeading}>
                            <Text style={{ color: tc.text, fontWeight: '600' }}>{editingAreaId ? t('projects.renameArea') : t('areas.new')}</Text>
                            {editingAreaId ? (
                                <TouchableOpacity disabled={saving} onPress={() => {
                                    setEditingAreaId(null);
                                    setSaveError('');
                                    onSetNewAreaName('');
                                }} accessibilityRole="button" style={styles.areaRenameButton}>
                                    <Text style={{ color: tc.tint }}>+ {t('areas.new')}</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <TextInput
                            value={newAreaName}
                            editable={!saving}
                            onChangeText={onSetNewAreaName}
                            placeholder={t('projects.areaLabel')}
                            placeholderTextColor={tc.secondaryText}
                            style={[styles.linkModalInput, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                        />
                        {saveError ? <Text accessibilityLiveRegion="polite" style={{ color: tc.danger ?? tc.text, marginBottom: 8 }}>{saveError}</Text> : null}
                        <View style={styles.colorPicker}>
                            {colors.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        newAreaColor === color && styles.colorOptionSelected,
                                    ]}
                                    onPress={() => onSetNewAreaColor(color)}
                                />
                            ))}
                        </View>
                        <View style={styles.linkModalButtons}>
                            <TouchableOpacity onPress={onCloseAreaManager} disabled={saving} style={styles.linkModalButton}>
                                <Text style={[styles.linkModalButtonText, { color: tc.secondaryText }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={saveArea}
                                disabled={saving || !newAreaName.trim()}
                                accessibilityState={{ busy: saving, disabled: saving || !newAreaName.trim() }}
                                style={[styles.linkModalButton, (saving || !newAreaName.trim()) && styles.linkModalButtonDisabled]}
                            >
                                <Text style={[styles.linkModalButtonText, { color: tc.tint }]}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                        </MoeGlassPanel>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
