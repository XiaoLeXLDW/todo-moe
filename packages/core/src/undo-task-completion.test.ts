import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeState = vi.hoisted(() => ({
    _allTasks: [] as any[],
    deleteTask: vi.fn(),
    restoreTask: vi.fn(),
    updateTask: vi.fn(),
    moveTask: vi.fn(),
    settings: { gtd: {} },
    getFocusedCount: vi.fn(() => 0),
}));

vi.mock('./store', () => ({
    useTaskStore: { getState: () => storeState },
}));

import {
    formatTaskMarkedDoneMessage,
    formatTaskMovedMessage,
    undoTaskCompletion,
} from './undo-task-completion';

beforeEach(() => {
    vi.clearAllMocks();
    storeState._allTasks = [];
    storeState.deleteTask.mockResolvedValue({ success: true });
    storeState.restoreTask.mockResolvedValue({ success: true });
    storeState.updateTask.mockResolvedValue({ success: true });
    storeState.moveTask.mockResolvedValue({ success: true });
});

// The two keys ship with different placeholder conventions ('{title}' vs
// '{{title}}'); the formatters interpret the keys as they are, so both platforms
// get the same text from one home instead of hand-rolling a `.replace` each.
describe('task action toast text', () => {
    const passthrough = (key: string) => key;

    it('falls back to English when the key is missing', () => {
        expect(formatTaskMarkedDoneMessage(passthrough, 'File taxes')).toBe('File taxes marked Done');
        expect(formatTaskMovedMessage(passthrough, 'File taxes', 'waiting'))
            .toBe('File taxes moved to waiting');
    });

    it('fills a translated template and the translated status name', () => {
        const t = (key: string) => (
            key === 'task.markedDone' ? '{title} erledigt'
                : key === 'task.movedToStatus' ? '{{title}} nach {{status}} verschoben'
                    : key === 'status.waiting' ? 'Wartend'
                        : key
        );
        expect(formatTaskMarkedDoneMessage(t, 'Steuern')).toBe('Steuern erledigt');
        expect(formatTaskMovedMessage(t, 'Steuern', 'waiting')).toBe('Steuern nach Wartend verschoben');
    });
});

describe('guarded completion undo', () => {
    const completedChecklist = [
        { id: 'build', title: 'Build', isCompleted: true },
        { id: 'upload', title: 'Upload', isCompleted: true },
    ];
    const priorChecklist = [
        { id: 'build', title: 'Build', isCompleted: true },
        { id: 'upload', title: 'Upload', isCompleted: false },
    ];

    it('restores the checklist when the completion snapshot is still current', async () => {
        storeState._allTasks = [{
            id: 'release',
            title: 'Release',
            status: 'done',
            checklist: completedChecklist,
        }];

        await undoTaskCompletion('release', 'next', false, {
            restoreUpdates: { checklist: priorChecklist },
            expectedCurrent: { status: 'done', checklist: completedChecklist },
        });

        expect(storeState.updateTask).toHaveBeenCalledWith('release', expect.objectContaining({
            checklist: priorChecklist,
            status: 'next',
        }));
    });

    it('refuses to overwrite a checklist edited after completion', async () => {
        storeState._allTasks = [{
            id: 'release',
            title: 'Release',
            status: 'done',
            checklist: [
                { id: 'build', title: 'Build v2', isCompleted: true },
                { id: 'upload', title: 'Upload', isCompleted: true },
                { id: 'notify', title: 'Notify Tibo', isCompleted: false },
            ],
        }];

        await expect(undoTaskCompletion('release', 'next', false, {
            restoreUpdates: { checklist: priorChecklist },
            expectedCurrent: { status: 'done', checklist: completedChecklist },
        })).rejects.toThrow('undo is no longer available');

        expect(storeState.deleteTask).not.toHaveBeenCalled();
        expect(storeState.updateTask).not.toHaveBeenCalled();
        expect(storeState.moveTask).not.toHaveBeenCalled();
    });

    it('restores a recurring successor when the parent changes during undo cleanup', async () => {
        const completedAt = '2026-09-17T10:00:00.000Z';
        storeState._allTasks = [{
            id: 'release',
            title: 'Release',
            status: 'done',
            completedAt,
            checklist: completedChecklist,
            recurrence: { seriesId: 'release-series', frequency: 'weekly' },
        }, {
            id: 'release-next',
            title: 'Release',
            status: 'next',
            createdAt: completedAt,
            recurrence: { seriesId: 'release-series', frequency: 'weekly' },
        }];
        storeState.deleteTask.mockImplementationOnce(async (taskId: string) => {
            storeState._allTasks = storeState._allTasks.map((task) => (
                task.id === taskId
                    ? { ...task, deletedAt: '2026-09-17T10:00:01.000Z' }
                    : task.id === 'release'
                        ? {
                            ...task,
                            checklist: [
                                { id: 'build', title: 'Build v2', isCompleted: true },
                                { id: 'upload', title: 'Upload', isCompleted: true },
                            ],
                        }
                        : task
            ));
            return { success: true };
        });

        await expect(undoTaskCompletion('release', 'next', false, {
            restoreUpdates: { checklist: priorChecklist },
            expectedCurrent: { status: 'done', checklist: completedChecklist },
        })).rejects.toThrow('undo is no longer available');

        expect(storeState.deleteTask).toHaveBeenCalledWith('release-next');
        expect(storeState.restoreTask).toHaveBeenCalledWith('release-next');
        expect(storeState.updateTask).not.toHaveBeenCalled();
    });
});
