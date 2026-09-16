import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChecklistProgress, type Task } from '@mindwtr/core';

export type ChecklistItems = NonNullable<Task['checklist']>;

export type ChecklistItemMutation = {
    taskId: string;
    itemId: string;
    itemIndex: number;
    isCompleted: boolean;
    previousChecklist: ChecklistItems;
    nextChecklist: ChecklistItems;
};

export type CommitChecklistItemMutation = (mutation: ChecklistItemMutation) => Promise<boolean>;

/**
 * Owns only row-local presentation state. Business persistence is delegated to
 * the row so the final list item can share the parent's completion/Undo chain.
 * Writes are started without a debounce and kept in click order; optimistic
 * state therefore never jumps around when several items are tapped quickly.
 */
export function useSwipeableChecklist(
    task: Task,
    commitMutation: CommitChecklistItemMutation,
    writeDisabled = false,
) {
    const initialChecklist = (task.checklist || []) as ChecklistItems;
    const [showChecklist, setShowChecklist] = useState(false);
    const [localChecklist, setLocalChecklist] = useState<ChecklistItems>(initialChecklist);
    const localChecklistRef = useRef<ChecklistItems>(initialChecklist);
    const durableChecklistRef = useRef<ChecklistItems>(initialChecklist);
    const taskIdRef = useRef(task.id);
    const writeDisabledRef = useRef(writeDisabled);
    const writeGeneration = useRef(0);
    const revision = useRef(0);
    const pendingWrites = useRef(0);
    const mounted = useRef(true);
    const writeQueue = useRef<Promise<void>>(Promise.resolve());
    writeDisabledRef.current = writeDisabled;

    const publishLocalChecklist = useCallback((checklist: ChecklistItems) => {
        localChecklistRef.current = checklist;
        if (mounted.current) setLocalChecklist(checklist);
    }, []);

    const cancelPendingChecklist = useCallback(() => {
        writeGeneration.current += 1;
        revision.current += 1;
    }, []);

    useEffect(() => {
        if (taskIdRef.current !== task.id) {
            cancelPendingChecklist();
            taskIdRef.current = task.id;
            setShowChecklist(false);
            pendingWrites.current = 0;
            durableChecklistRef.current = (task.checklist || []) as ChecklistItems;
            publishLocalChecklist((task.checklist || []) as ChecklistItems);
            return;
        }
        // A store echo must not replace a newer optimistic sequence. Once the
        // queue is empty the row can safely accept external/sync changes again.
        if (pendingWrites.current === 0) {
            durableChecklistRef.current = (task.checklist || []) as ChecklistItems;
            publishLocalChecklist((task.checklist || []) as ChecklistItems);
        }
    }, [cancelPendingChecklist, publishLocalChecklist, task.checklist, task.id]);

    useEffect(() => {
        if (!writeDisabled) return;
        cancelPendingChecklist();
        pendingWrites.current = 0;
        durableChecklistRef.current = (task.checklist || []) as ChecklistItems;
        publishLocalChecklist((task.checklist || []) as ChecklistItems);
    }, [cancelPendingChecklist, publishLocalChecklist, task.checklist, writeDisabled]);

    useEffect(() => () => {
        mounted.current = false;
        cancelPendingChecklist();
    }, [cancelPendingChecklist]);

    const toggleChecklist = useCallback(() => {
        setShowChecklist((value) => !value);
    }, []);

    const toggleChecklistItem = useCallback((itemId: string) => {
        if (writeDisabledRef.current) return;
        const previousChecklist = localChecklistRef.current;
        const index = previousChecklist.findIndex((item) => item.id === itemId);
        const previousItem = previousChecklist[index];
        if (!previousItem) return;
        const nextChecklist = previousChecklist.map((item, itemIndex) => (
            itemIndex === index ? { ...item, isCompleted: !item.isCompleted } : item
        ));
        const nextItem = nextChecklist[index];
        const operationRevision = ++revision.current;
        const operationGeneration = writeGeneration.current;
        pendingWrites.current += 1;
        publishLocalChecklist(nextChecklist);

        const run = async () => {
            if (operationGeneration !== writeGeneration.current || writeDisabledRef.current) {
                pendingWrites.current = Math.max(0, pendingWrites.current - 1);
                return;
            }
            let succeeded = false;
            try {
                succeeded = await commitMutation({
                    taskId: task.id,
                    itemId,
                    itemIndex: index,
                    isCompleted: nextItem.isCompleted,
                    previousChecklist,
                    nextChecklist,
                });
            } finally {
                pendingWrites.current = Math.max(0, pendingWrites.current - 1);
            }
            if (succeeded) durableChecklistRef.current = nextChecklist;
            else if (mounted.current && operationRevision === revision.current) {
                publishLocalChecklist(durableChecklistRef.current);
            }
        };
        // Start the first persistence call in the same press turn. Later taps
        // queue behind it so every full checklist snapshot reaches the store in
        // user order instead of racing or being debounce-merged.
        writeQueue.current = pendingWrites.current === 1 ? run() : writeQueue.current.then(run, run);
    }, [commitMutation, publishLocalChecklist, task.id]);

    const checklistProgress = useMemo(
        () => getChecklistProgress({ ...task, checklist: localChecklist }),
        [task, localChecklist],
    );

    return {
        cancelPendingChecklist,
        checklistProgress,
        localChecklist,
        showChecklist,
        toggleChecklist,
        toggleChecklistItem,
    };
}
