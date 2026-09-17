import React, { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { CircleDot, History, Hourglass, Pencil, Repeat } from 'lucide-react-native';
import { MOE_VISUAL } from '../../moe/visual-system';
import { useStatusColors } from '../../hooks/use-status-colors';
import {
    getInlineMarkdownPreview,
    getTaskAgeLabel,
    getTaskDateCoherenceIssues,
    getTaskUrgency,
    formatI18nTemplate,
    formatTimeEstimateLabel,
    formatTimeSpentLabel,
    hasTimeComponent,
    isTaskActionable,
    isTaskCancelled,
    isTaskCompleted,
    resolveTaskTextDirection,
    safeFormatDate,
    safeParseDate,
    safeParseDueDate,
    tFallback,
    TASK_PRIORITY_COLORS,
} from '@mindwtr/core';
import type { Area, Language, Project, ProjectSequenceTaskCue, Section, Task } from '@mindwtr/core';
import type { ThemeColors } from '../../hooks/use-theme-colors';
import { AppPressable } from '../app-pressable';
import { FocusStarIcon } from '../FocusStarIcon';
import { MarkdownInlineText } from '../markdown-text';
import { styles } from './swipeable-task-item.styles';
import { CompactText } from '@/components/compact-text';
import { MoeCheckButton } from '../../moe/MoeCheckButton';
import { MoeCompletionTitle } from '../../moe/MoeCompletionRow';
import Reanimated from 'react-native-reanimated';
import type { CompletionMeasureRefs } from '../../moe/MoeCompletionFeedback';
import type { FeedbackAppearance } from '../../moe/MoeCompletionFeedbackState';
import { MoeChecklistItem } from '../../moe/MoeChecklistItem';
import { MoeChecklistProgress } from '../../moe/MoeChecklistProgress';

interface SwipeableTaskItemContentProps {
    accessibilityActions: { label: string; name: string }[];
    accessibilityHint: string;
    accessibilityLabel: string;
    canShowFocusToggle: boolean;
    /** When set, the star renders disabled with this as its label. */
    focusToggleDisabledLabel?: string;
    checklistProgress: { completed: number; percent: number; total: number } | null;
    hideChecklistProgress: boolean;
    hideContexts: boolean;
    hideProjectMeta: boolean;
    hideStatusBadge: boolean;
    /** Title-only row: suppress the description preview and metadata parts row. */
    hideDetails: boolean;
    /** Render the status control as a compact icon button (no status-name label) for single-status lists */
    statusBadgeAsIcon: boolean;
    isDark: boolean;
    isHighlighted: boolean;
    isMultiSelected: boolean;
    showFocusHighlight: boolean;
    language: string;
    localChecklist: Task['checklist'];
    checklistWriteDisabled?: boolean;
    interactionDisabled?: boolean;
    allowInspectionWhenDisabled?: boolean;
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => void;
    onContextPress?: (context: string) => void;
    onEditCompletedAt?: () => void;
    onLongPress: () => void;
    onOpenStatusMenu: () => void;
    onPress: () => void;
    onComplete?: () => void;
    onEditChecklist: () => void;
    completionPending?: boolean;
    completionMeasureRefs?: CompletionMeasureRefs;
    completionAppearanceRef?: React.MutableRefObject<FeedbackAppearance | null>;
    onProjectPress?: (projectId: string) => void;
    onTagPress?: (tag: string) => void;
    onToggleChecklist: () => void;
    onToggleChecklistItem: (itemId: string) => void;
    onToggleFocus: () => void;
    projects: Project[];
    sectionById: Map<string, Section>;
    projectDeadlineLabel?: string;
    footerContent?: ReactNode;
    recurrenceLabel?: string;
    sequenceCue?: ProjectSequenceTaskCue;
    areas: Area[];
    selectionMode: boolean;
    showChecklist: boolean;
    showTaskAge: boolean;
    t: (key: string) => string;
    task: Task;
    tc: ThemeColors;
}

export function hasInspectableTaskChecklist(
    task: Pick<Task, 'status'>,
    checklistProgress: Pick<NonNullable<SwipeableTaskItemContentProps['checklistProgress']>, 'total'> | null,
) {
    return task.status !== 'reference' && Boolean(checklistProgress?.total);
}

export function canExecuteTaskChecklist(
    task: Pick<Task, 'status' | 'taskMode'>,
    checklistProgress: Pick<NonNullable<SwipeableTaskItemContentProps['checklistProgress']>, 'total'> | null,
) {
    return hasInspectableTaskChecklist(task, checklistProgress)
        && (task.taskMode === 'list' || isTaskActionable(task));
}

export function SwipeableTaskItemContent({
    accessibilityActions,
    accessibilityHint,
    accessibilityLabel,
    areas,
    canShowFocusToggle,
    focusToggleDisabledLabel,
    checklistProgress,
    hideChecklistProgress,
    hideContexts,
    hideProjectMeta,
    hideStatusBadge,
    hideDetails,
    statusBadgeAsIcon,
    isDark,
    isHighlighted,
    isMultiSelected,
    showFocusHighlight,
    interactionDisabled = false,
    allowInspectionWhenDisabled = false,
    language,
    localChecklist,
    checklistWriteDisabled = false,
    onAccessibilityAction,
    onContextPress,
    onEditCompletedAt,
    onLongPress,
    onOpenStatusMenu,
    onPress,
    onComplete,
    onEditChecklist,
    completionPending = false,
    completionMeasureRefs,
    completionAppearanceRef,
    onProjectPress,
    onTagPress,
    onToggleChecklist,
    onToggleChecklistItem,
    onToggleFocus,
    projects,
    sectionById,
    projectDeadlineLabel,
    footerContent,
    recurrenceLabel,
    sequenceCue,
    selectionMode,
    showChecklist,
    showTaskAge,
    t,
    task,
    tc,
}: SwipeableTaskItemContentProps) {
    const { project, projectColor, section } = useMemo(() => {
        const activeProject = task.projectId ? projects.find((item) => item.id === task.projectId) : undefined;
        const projectArea = activeProject?.areaId
            ? areas.find((area) => area.id === activeProject.areaId)
            : undefined;
        return {
            project: activeProject,
            projectColor: projectArea?.color,
            section: task.sectionId ? sectionById.get(task.sectionId) : undefined,
        };
    }, [areas, projects, sectionById, task.projectId, task.sectionId]);

    const resolvedDirection = resolveTaskTextDirection(task);
    const editChecklistLabel = `${tFallback(t, 'common.edit', 'Edit')}: ${tFallback(t, 'taskEdit.checklist', 'Checklist')}`;
    const canInspectChecklist = hasInspectableTaskChecklist(task, checklistProgress);
    const executesChecklistFromBody = canExecuteTaskChecklist(task, checklistProgress);
    const textDirection = resolvedDirection === 'rtl' ? 'rtl' : 'ltr';
    const textAlign = resolvedDirection === 'rtl' ? 'right' : 'left';
    const timeEstimateLabel = (() => {
        if (!task.timeEstimate) return null;
        return formatTimeEstimateLabel(task.timeEstimate);
    })();
    const dueLabel = (() => {
        const due = safeParseDueDate(task.dueDate);
        if (!due) return null;
        const hasTime = hasTimeComponent(task.dueDate);
        return safeFormatDate(due, hasTime ? 'Pp' : 'P');
    })();
    const dueColor = (() => {
        const urgency = getTaskUrgency(task);
        if (urgency === 'overdue') return tc.danger;
        if (urgency === 'urgent' || urgency === 'upcoming') return tc.warning;
        return tc.secondaryText;
    })();
    const startLabel = (() => {
        const start = safeParseDate(task.startTime);
        if (!start) return null;
        const hasTime = hasTimeComponent(task.startTime);
        return safeFormatDate(start, hasTime ? 'Pp' : 'P');
    })();
    const startDateLabel = tFallback(t, 'taskEdit.startDateLabel', 'Start');
    const dateIssueLabel = getTaskDateCoherenceIssues(task).some((issue) => issue.code === 'start_after_due')
        ? tFallback(t, 'task.dateIssue.startAfterDue', 'Starts after due date')
        : null;
    const terminalTimestamp = (() => {
        if (isTaskCancelled(task)) {
            if (!task.cancelledAt) return null;
            return {
                key: 'cancelled',
                label: tFallback(t, 'task.cancelled', 'Cancelled'),
                timestamp: safeFormatDate(task.cancelledAt, 'Pp', task.cancelledAt),
                editable: false,
            };
        }
        if (!isTaskCompleted(task)) return null;
        const completionTimestamp = task.completedAt || task.updatedAt;
        if (!completionTimestamp) return null;
        return {
            key: 'completed',
            label: tFallback(t, 'list.done', 'Completed'),
            timestamp: safeFormatDate(completionTimestamp, 'Pp', completionTimestamp),
            editable: true,
        };
    })();
    const ageLabel = getTaskAgeLabel(task.createdAt, language as Language);
    // Age is detail: the Focus "hide details" toggle drops it with the rest.
    const showAge = showTaskAge
        && !hideDetails
        && task.status !== 'done'
        && task.status !== 'reference'
        && !!ageLabel;
    const statusColors = useStatusColors()[task.status];
    const isAvailableNextAction = sequenceCue === 'available';
    const descriptionPreview = useMemo(
        () => getInlineMarkdownPreview(task.description ?? ''),
        [task.description],
    );
    const metaParts: ReactNode[] = [];
    const canNavigateMeta = !selectionMode;

    // Items are separated by the row's gap alone. A "·" between them used to be
    // its own node, so a wrapped line could start with a lone dot (#1161).
    const addMetaPart = (node: ReactNode, _key: string) => {
        metaParts.push(node);
    };

    const renderMetaItem = ({
        accessibilityLabel: metaAccessibilityLabel,
        children,
        key,
        onPress: onMetaPress,
    }: {
        accessibilityLabel?: string;
        children: ReactNode;
        key: string;
        onPress?: () => void;
    }) => {
        if (!onMetaPress) {
            return (
                <View key={key} style={styles.inlineMetaItem}>
                    {children}
                </View>
            );
        }
        return (
            <Pressable
                key={key}
                onPress={(event) => {
                    event.stopPropagation();
                    onMetaPress();
                }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={metaAccessibilityLabel}
                style={styles.inlineMetaButton}
            >
                <View style={styles.inlineMetaItem}>
                    {children}
                </View>
            </Pressable>
        );
    };

    if (!hideProjectMeta && project) {
        const projectLabel = section ? `${project.title} · ${section.title}` : project.title;
        addMetaPart(
            renderMetaItem({
                key: 'project',
                onPress: canNavigateMeta && onProjectPress ? () => onProjectPress(project.id) : undefined,
                accessibilityLabel: formatI18nTemplate(
                    tFallback(t, 'task.aria.openProject', 'Open project {name}'),
                    { name: projectLabel },
                ),
                children: (
                    <>
                        <View style={[styles.projectDot, { backgroundColor: projectColor || tc.tint }]} />
                        <CompactText
                            style={[styles.metaText, { color: tc.secondaryText }]}
                            numberOfLines={2}
                        >
                            {projectLabel}
                        </CompactText>
                    </>
                ),
            }),
            'project'
        );
    }

    if (projectDeadlineLabel) {
        addMetaPart(
            <CompactText
                key="project-deadline"
                style={[styles.metaText, styles.projectDeadlineText]}
                numberOfLines={2}
            >
                {projectDeadlineLabel}
            </CompactText>,
            'project-deadline'
        );
    }

    if (!hideContexts && task.contexts?.length) {
        const context = task.contexts[0];
        const moreContexts = task.contexts.length - 1;
        addMetaPart(
            renderMetaItem({
                key: 'context',
                onPress: canNavigateMeta && onContextPress ? () => onContextPress(context) : undefined,
                accessibilityLabel: formatI18nTemplate(
                    tFallback(t, 'task.aria.openContext', 'Open context {name}'),
                    { name: context },
                ),
                children: (
                    <>
                        <CompactText
                            style={[styles.metaText, styles.contextText]}
                            numberOfLines={2}
                        >
                            {context}
                        </CompactText>
                        {moreContexts > 0 && (
                            <CompactText style={[styles.metaText, { color: tc.secondaryText }]}>+{moreContexts}</CompactText>
                        )}
                    </>
                ),
            }),
            'context'
        );
    }

    if (task.tags?.length) {
        const tag = task.tags[0];
        const moreTags = task.tags.length - 1;
        addMetaPart(
            renderMetaItem({
                key: 'tag',
                onPress: canNavigateMeta && onTagPress ? () => onTagPress(tag) : undefined,
                accessibilityLabel: formatI18nTemplate(
                    tFallback(t, 'task.aria.openTag', 'Open tag {name}'),
                    { name: tag },
                ),
                children: (
                    <>
                        <CompactText
                            style={[styles.metaText, styles.tagText]}
                            numberOfLines={2}
                        >
                            {tag}
                        </CompactText>
                        {moreTags > 0 && (
                            <CompactText style={[styles.metaText, { color: tc.secondaryText }]}>+{moreTags}</CompactText>
                        )}
                    </>
                ),
            }),
            'tag'
        );
    }

    if (terminalTimestamp) {
        addMetaPart(
            renderMetaItem({
                key: terminalTimestamp.key,
                onPress: terminalTimestamp.editable && canNavigateMeta && onEditCompletedAt ? onEditCompletedAt : undefined,
                accessibilityLabel: terminalTimestamp.editable
                    ? tFallback(t, 'task.editCompletedAt', 'Edit completion time')
                    : undefined,
                children: (
                    <CompactText
                        style={[styles.metaText, { color: tc.secondaryText }]}
                    >
                        {`${terminalTimestamp.label}: ${terminalTimestamp.timestamp}`}
                    </CompactText>
                ),
            }),
            terminalTimestamp.key
        );
    }

    if (dueLabel) {
        addMetaPart(
            <CompactText
                key="due"
                style={[styles.metaText, styles.dueText, { color: dueColor }]}
            >
                {dueLabel}
            </CompactText>,
            'due'
        );
    }

    if (startLabel) {
        addMetaPart(
            <CompactText
                key="start"
                style={[styles.metaText, { color: tc.secondaryText }]}
            >
                {`${startDateLabel}: ${startLabel}`}
            </CompactText>,
            'start'
        );
    }

    if (dateIssueLabel) {
        addMetaPart(
            <CompactText
                key="date-issue"
                style={[styles.metaText, styles.dateIssueText]}
                numberOfLines={1}
            >
                {dateIssueLabel}
            </CompactText>,
            'date-issue'
        );
    }

    if (recurrenceLabel) {
        addMetaPart(
            renderMetaItem({
                key: 'recurrence',
                children: (
                    <>
                        <Repeat size={12} color={tc.secondaryText} strokeWidth={2} />
                        <CompactText
                            key="recurrence-label"
                            style={[styles.metaText, { color: tc.secondaryText }]}
                            numberOfLines={2}
                        >
                            {recurrenceLabel}
                        </CompactText>
                    </>
                ),
            }),
            'recurrence'
        );
    }

    if (timeEstimateLabel) {
        addMetaPart(
            <Text key="estimate" style={[styles.metaText, { color: tc.secondaryText }]}>
                {timeEstimateLabel}
            </Text>,
            'estimate'
        );
    }

    const timeSpentLabel = formatTimeSpentLabel(task.timeSpentMinutes);
    if (timeSpentLabel) {
        addMetaPart(
            renderMetaItem({
                key: 'time-spent',
                children: (
                    <>
                        <History size={12} color={tc.secondaryText} strokeWidth={2} />
                        <CompactText
                            style={[styles.metaText, { color: tc.secondaryText }]}
                            accessibilityLabel={`${tFallback(t, 'taskEdit.timeSpentLabel', 'Time Spent')}: ${timeSpentLabel}`}
                        >
                            {timeSpentLabel}
                        </CompactText>
                    </>
                ),
            }),
            'time-spent'
        );
    }

    const cardStyle = StyleSheet.flatten<ViewStyle>([
                styles.taskItem,
                { borderRadius: MOE_VISUAL.cardRadius },
                { backgroundColor: tc.taskItemBg },
                { borderWidth: StyleSheet.hairlineWidth, borderColor: tc.border },
                isAvailableNextAction && !selectionMode && {
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.34)' : 'rgba(59, 130, 246, 0.24)',
                },
                showFocusHighlight && canShowFocusToggle && task.isFocusedToday && !selectionMode && { borderWidth: 2, borderColor: tc.tint },
                isHighlighted && !selectionMode && { borderWidth: 2, borderColor: tc.tint },
                selectionMode && { borderWidth: 2, borderColor: isMultiSelected ? tc.tint : tc.border },
            ]);
    if (completionAppearanceRef) completionAppearanceRef.current = {
        backgroundColor: String(cardStyle.backgroundColor ?? tc.taskItemBg), borderColor: String(cardStyle.borderColor ?? tc.border),
        borderWidth: typeof cardStyle.borderWidth === 'number' ? cardStyle.borderWidth : 0,
        borderRadius: typeof cardStyle.borderRadius === 'number' ? cardStyle.borderRadius : MOE_VISUAL.cardRadius,
        textColor: tc.text, fontSize: styles.taskTitle.fontSize ?? 15, lineHeight: styles.taskTitle.lineHeight ?? 20,
        fontWeight: '500', textAlign, writingDirection: textDirection, checkColor: tc.success, checkForeground: tc.onTint,
    };
    return (
        <AppPressable
            style={cardStyle}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={300}
            disabled={interactionDisabled && !allowInspectionWhenDisabled && !executesChecklistFromBody}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityRole="button"
            accessibilityState={(interactionDisabled && !allowInspectionWhenDisabled && !executesChecklistFromBody) || selectionMode
                ? {
                    ...(interactionDisabled && !allowInspectionWhenDisabled && !executesChecklistFromBody ? { disabled: true } : {}),
                    ...(selectionMode ? { selected: isMultiSelected } : {}),
                }
                : undefined}
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={onAccessibilityAction}
        >
            <Reanimated.View ref={completionMeasureRefs?.row} collapsable={false} pointerEvents="none"
                accessible={false} importantForAccessibility="no-hide-descendants" style={styles.completionMeasureSurface} />
            {task.priority && (
                <View
                    style={[styles.priorityStrip, { backgroundColor: TASK_PRIORITY_COLORS[task.priority] }]}
                    testID="task-priority-strip"
                    pointerEvents="none"
                />
            )}
            {selectionMode && (
                <View
                    style={[
                        styles.selectionIndicator,
                        {
                            borderColor: tc.tint,
                            backgroundColor: isMultiSelected ? tc.tint : 'transparent',
                        },
                    ]}
                    pointerEvents="none"
                >
                    {isMultiSelected && <Text style={styles.selectionIndicatorText}>✓</Text>}
                </View>
            )}
            {!selectionMode && onComplete && task.status !== 'reference' && task.status !== 'archived' && !isTaskCancelled(task) ? (
                <View
                    testID={canInspectChecklist ? 'list-parent-completion-control' : undefined}
                    style={canInspectChecklist ? styles.listParentCompletionControl : undefined}
                >
                    <MoeCheckButton particleFeedback="host" checked={task.status === 'done' || completionPending} disabled={interactionDisabled || completionPending}
                        label={task.status === 'done' ? tFallback(t, 'archived.restoreToInbox', 'Restore to Inbox') : tFallback(t, 'common.done', 'Done')}
                        onPress={onComplete} tc={tc} measurementRef={completionMeasureRefs?.check} />
                </View>
            ) : null}
            <View style={styles.taskContent}>
                <View style={styles.titleRow}>
                    <MoeCompletionTitle
                        measurementRef={completionMeasureRefs?.title}
                        completed={task.status === 'done' || completionPending}
                        style={[
                            styles.taskTitle,
                            { color: tc.text, writingDirection: textDirection, textAlign },
                            canShowFocusToggle && styles.taskTitleFlex,
                        ]}
                        numberOfLines={2}
                    >
                        {task.title}
                    </MoeCompletionTitle>
                    {canShowFocusToggle && !selectionMode && (
                        <Pressable
                            onPress={(event) => {
                                event.stopPropagation();
                                onToggleFocus();
                            }}
                            disabled={Boolean(focusToggleDisabledLabel)}
                            hitSlop={8}
                            style={[styles.focusButton, focusToggleDisabledLabel ? styles.focusButtonDisabled : null]}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: Boolean(focusToggleDisabledLabel) }}
                            accessibilityLabel={focusToggleDisabledLabel
                                ?? (task.isFocusedToday ? t('agenda.removeFromFocus') : t('agenda.addToFocus'))}
                        >
                            <FocusStarIcon
                                focused={task.isFocusedToday === true}
                                inactiveColor={tc.secondaryText}
                            />
                        </Pressable>
                    )}
                </View>
                {canInspectChecklist && !hideChecklistProgress && checklistProgress ? (
                    <MoeChecklistProgress
                        disabled={selectionMode}
                        expanded={showChecklist}
                        label={t('checklist.progress')}
                        onPress={onToggleChecklist}
                        progress={checklistProgress}
                        tc={tc}
                    />
                ) : null}
                {!hideDetails && descriptionPreview ? (
                    <MarkdownInlineText
                        markdown={descriptionPreview}
                        tc={tc}
                        direction={textDirection}
                        style={[styles.taskDescription, { color: tc.secondaryText }]}
                        numberOfLines={1}
                    />
                ) : null}
                {!hideDetails && metaParts.length > 0 && (
                    <View style={styles.inlineMeta}>
                        {metaParts}
                    </View>
                )}
                {footerContent}
                {showChecklist && (localChecklist || []).length > 0 && (
                    <View style={[styles.checklistItems, { borderColor: tc.border }]}>
                        {(localChecklist || []).map((item, index) => (
                            <MoeChecklistItem
                                key={item.id || index}
                                checked={item.isCompleted === true}
                                disabled={checklistWriteDisabled}
                                label={item.title}
                                onPress={() => onToggleChecklistItem(item.id)}
                                tc={tc}
                            />
                        ))}
                        {!selectionMode && !interactionDisabled && canInspectChecklist ? (
                            <Pressable
                                accessibilityLabel={editChecklistLabel}
                                accessibilityRole="button"
                                onPress={(event) => {
                                    event?.stopPropagation?.();
                                    onEditChecklist();
                                }}
                                style={styles.checklistEditButton}
                            >
                                <Pencil size={14} color={tc.tint} strokeWidth={2.2} />
                                <Text style={[styles.checklistEditText, { color: tc.tint }]}>
                                    {editChecklistLabel}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                )}
                {showAge && (
                    <View style={styles.staleRow}>
                        <Hourglass size={11} color={tc.secondaryText} accessible={false} />
                        <Text style={[styles.staleText, { color: tc.secondaryText }]}>{ageLabel}</Text>
                    </View>
                )}
            </View>
            {!hideStatusBadge && (
                <Pressable
                    disabled={interactionDisabled}
                    onPress={interactionDisabled ? undefined : (event) => {
                        event.stopPropagation();
                        onOpenStatusMenu();
                    }}
                    hitSlop={8}
                    style={
                        statusBadgeAsIcon
                            ? styles.statusIconButton
                            : [
                                styles.statusBadge,
                                { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                            ]
                    }
                    accessibilityLabel={formatI18nTemplate(
                        tFallback(t, 'task.aria.changeStatus', 'Change status. Current status: {status}'),
                        { status: t(`status.${task.status}`) },
                    )}
                    accessibilityHint={tFallback(
                        t,
                        'task.aria.changeStatusHint',
                        'Double-tap to open status menu',
                    )}
                    accessibilityRole="button"
                    accessibilityState={interactionDisabled ? { disabled: true } : undefined}
                >
                    {statusBadgeAsIcon ? (
                        <CircleDot size={20} color={statusColors.text} strokeWidth={2} />
                    ) : (
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                            {t(`status.${task.status}`)}
                        </Text>
                    )}
                </Pressable>
            )}
        </AppPressable>
    );
}
