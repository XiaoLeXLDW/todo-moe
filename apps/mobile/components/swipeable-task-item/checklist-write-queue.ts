import type { Task } from '@mindwtr/core';

export type ChecklistItems = NonNullable<Task['checklist']>;

export type ChecklistWriteCommitResult = boolean | ChecklistItems;

type ChecklistWrite = {
    taskId: string;
    previousChecklist: ChecklistItems;
    nextChecklist: ChecklistItems;
};

type ChecklistWriteSnapshot = {
    checklist: ChecklistItems;
    pending: number;
};

type ChecklistWriteEntry = {
    durableChecklist: ChecklistItems;
    optimisticChecklist: ChecklistItems;
    pending: number;
    tail: Promise<void>;
};

const entries = new Map<string, ChecklistWriteEntry>();
const listeners = new Map<string, Set<(snapshot: ChecklistWriteSnapshot) => void>>();

function publish(taskId: string, snapshot: ChecklistWriteSnapshot) {
    listeners.get(taskId)?.forEach((listener) => listener(snapshot));
}

/**
 * Returns the latest accepted checklist while a task still has queued writes.
 * This lets a virtualized row remount without visually forgetting taps that
 * have already been accepted but have not reached the store yet.
 */
export function getChecklistWriteSnapshot(taskId: string): ChecklistWriteSnapshot | null {
    const entry = entries.get(taskId);
    return entry ? { checklist: entry.optimisticChecklist, pending: entry.pending } : null;
}

export function subscribeChecklistWrites(
    taskId: string,
    listener: (snapshot: ChecklistWriteSnapshot) => void,
) {
    const taskListeners = listeners.get(taskId) ?? new Set();
    taskListeners.add(listener);
    listeners.set(taskId, taskListeners);
    return () => {
        taskListeners.delete(listener);
        if (taskListeners.size === 0) listeners.delete(taskId);
    };
}

/**
 * Serializes accepted checklist writes by task rather than by rendered row.
 * A row may be recycled or unmounted while the work continues. The write
 * itself remains authoritative; subscribers only own optimistic presentation.
 */
export function enqueueChecklistWrite(
    mutation: ChecklistWrite,
    commit: () => Promise<ChecklistWriteCommitResult>,
) {
    let entry = entries.get(mutation.taskId);
    const hadPendingWrite = Boolean(entry);
    if (!entry) {
        entry = {
            durableChecklist: mutation.previousChecklist,
            optimisticChecklist: mutation.nextChecklist,
            pending: 0,
            tail: Promise.resolve(),
        };
        entries.set(mutation.taskId, entry);
    } else {
        entry.optimisticChecklist = mutation.nextChecklist;
    }

    entry.pending += 1;
    publish(mutation.taskId, {
        checklist: entry.optimisticChecklist,
        pending: entry.pending,
    });

    const execute = async () => {
        let committedChecklist: ChecklistItems | null = null;
        try {
            const result = await commit();
            if (Array.isArray(result)) committedChecklist = result;
            else if (result) committedChecklist = mutation.nextChecklist;
        } catch {
            // Store failures are represented as a false result to the queue.
            // The row-level callback remains responsible for user messaging.
        }
        if (committedChecklist) entry!.durableChecklist = committedChecklist;
        entry!.pending = Math.max(0, entry!.pending - 1);
        if (entry!.pending > 0) return;

        const finalChecklist = entry!.durableChecklist;
        if (entries.get(mutation.taskId) === entry) entries.delete(mutation.taskId);
        publish(mutation.taskId, { checklist: finalChecklist, pending: 0 });
    };

    // The first write starts in the press turn. Later writes chain behind the
    // task's current tail, including writes accepted by a remounted row.
    const queued = hadPendingWrite ? entry.tail.then(execute, execute) : execute();
    entry.tail = queued.catch(() => {});
}

export function resetChecklistWriteQueueForTests() {
    entries.clear();
    listeners.clear();
}
