import { normalizeFocusTaskLimit } from './focus-utils';
import { translateWithFallback } from './i18n';
import { useTaskStore } from './store';
import type { Task, TaskStatus } from './types';

type TranslateFn = (key: string) => string;

export type TaskCompletionUndoExpectation = Pick<Task, 'status' | 'checklist'>;

function checklistsMatch(
    current: Task['checklist'],
    expected: Task['checklist'],
): boolean {
    const currentItems = current ?? [];
    const expectedItems = expected ?? [];
    return currentItems.length === expectedItems.length
        && currentItems.every((item, index) => {
            const expectedItem = expectedItems[index];
            return expectedItem !== undefined
                && item.id === expectedItem.id
                && item.title === expectedItem.title
                && item.isCompleted === expectedItem.isCompleted;
        });
}

function matchesUndoExpectation(
    task: Task | undefined,
    expected: TaskCompletionUndoExpectation | undefined,
): boolean {
    if (!expected) return true;
    if (!task || task.deletedAt) return false;
    return task.status === expected.status
        && checklistsMatch(task.checklist, expected.checklist);
}

// One copy of the completion/move toast text for every surface that completes a
// task on either platform: keyboard scopes, the row's own done button, the status
// chord, mobile search. The copies had already drifted, one of them untranslated.
// The single/double brace split follows the keys as they already ship.
export function formatTaskMarkedDoneMessage(t: TranslateFn, title: string): string {
    return translateWithFallback(t, 'task.markedDone', '{title} marked Done').replace('{title}', title);
}

export function formatTaskMovedMessage(t: TranslateFn, title: string, status: TaskStatus): string {
    return translateWithFallback(t, 'task.movedToStatus', '{{title}} moved to {{status}}')
        .replace('{{title}}', title)
        .replace('{{status}}', translateWithFallback(t, `status.${status}`, status));
}

// Completing a task force-clears its Today star (applyTaskUpdates), so
// undoing a completion must restore the star along with the status. The star
// only comes back while the focus cap has room — same rule as starring by hand.
export async function undoTaskCompletion(
    taskId: string,
    previousStatus: TaskStatus,
    wasFocusedToday: boolean,
    options: {
        restoreUpdates?: Partial<Task>;
        expectedCurrent?: TaskCompletionUndoExpectation;
    } = {},
): Promise<void> {
    const state = useTaskStore.getState();
    const completedTask = state._allTasks.find((task) => task.id === taskId);
    if (!matchesUndoExpectation(completedTask, options.expectedCurrent)) {
        throw new Error('Task changed after completion; undo is no longer available');
    }
    const recurrence = completedTask?.recurrence;
    const seriesId = recurrence && typeof recurrence === 'object'
        ? recurrence.seriesId?.trim() || taskId
        : typeof recurrence === 'string'
            ? taskId
            : undefined;
    const generatedOccurrence = seriesId && completedTask?.completedAt
        ? state._allTasks.find((task) => (
            task.id !== taskId
            && !task.deletedAt
            && task.createdAt === completedTask.completedAt
            && task.recurrence
            && typeof task.recurrence === 'object'
            && task.recurrence.seriesId === seriesId
        ))
        : undefined;

    if (generatedOccurrence) {
        const deleteResult = await Promise.resolve(state.deleteTask(generatedOccurrence.id));
        if (!deleteResult.success) {
            throw new Error(deleteResult.error || 'Failed to remove recurring follow-up');
        }
    }

    const {
        isFocusedToday: _restoreFocusedToday,
        focusOrder: previousFocusOrder,
        ...restoreUpdates
    } = options.restoreUpdates ?? {};
    const currentState = useTaskStore.getState();
    const currentTask = currentState._allTasks.find((task) => task.id === taskId);
    if (!matchesUndoExpectation(currentTask, options.expectedCurrent)) {
        if (generatedOccurrence) {
            await Promise.resolve(currentState.restoreTask(generatedOccurrence.id));
        }
        throw new Error('Task changed after completion; undo is no longer available');
    }
    const moveResult = options.restoreUpdates
        ? await Promise.resolve(currentState.updateTask(taskId, {
            ...restoreUpdates,
            status: previousStatus,
            isFocusedToday: false,
            focusOrder: undefined,
        }))
        : await Promise.resolve(currentState.moveTask(taskId, previousStatus));
    if (!moveResult.success) {
        if (generatedOccurrence) {
            await Promise.resolve(useTaskStore.getState().restoreTask(generatedOccurrence.id));
        }
        throw new Error(moveResult.error || 'Failed to restore task status');
    }
    if (!wasFocusedToday) return;

    const current = useTaskStore.getState();
    const focusTaskLimit = normalizeFocusTaskLimit(current.settings.gtd?.focusTaskLimit);
    if (current.getFocusedCount() >= focusTaskLimit) return;
    const focusResult = await Promise.resolve(current.updateTask(taskId, {
        isFocusedToday: true,
        ...(previousFocusOrder !== undefined ? { focusOrder: previousFocusOrder } : {}),
    }));
    if (!focusResult.success) {
        throw new Error(focusResult.error || 'Failed to restore task focus');
    }
}
