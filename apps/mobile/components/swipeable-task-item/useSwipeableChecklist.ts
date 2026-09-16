import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getChecklistProgress, type Task } from '@mindwtr/core';

import {
    enqueueChecklistWrite,
    getChecklistWriteSnapshot,
    subscribeChecklistWrites,
    type ChecklistItems,
} from './checklist-write-queue';

export type { ChecklistItems } from './checklist-write-queue';

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
    const initialChecklist = getChecklistWriteSnapshot(task.id)?.checklist
        ?? (task.checklist || []) as ChecklistItems;
    const [showChecklist, setShowChecklist] = useState(false);
    const [localChecklist, setLocalChecklist] = useState<ChecklistItems>(initialChecklist);
    const localChecklistRef = useRef<ChecklistItems>(initialChecklist);
    const taskIdRef = useRef(task.id);
    const writeDisabledRef = useRef(writeDisabled);
    const mounted = useRef(true);
    writeDisabledRef.current = writeDisabled;

    const publishLocalChecklist = useCallback((checklist: ChecklistItems) => {
        localChecklistRef.current = checklist;
        if (mounted.current) setLocalChecklist(checklist);
    }, []);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (taskIdRef.current !== task.id) {
            taskIdRef.current = task.id;
            setShowChecklist(false);
        }
        // A store echo must not replace a newer accepted sequence. A remounted
        // row reads the same task-level optimistic snapshot until the queue is
        // fully durable (or rolls back to its last durable snapshot).
        publishLocalChecklist(
            getChecklistWriteSnapshot(task.id)?.checklist
            ?? (task.checklist || []) as ChecklistItems,
        );
    }, [publishLocalChecklist, task.checklist, task.id]);

    useEffect(() => subscribeChecklistWrites(task.id, (snapshot) => {
        if (!mounted.current || taskIdRef.current !== task.id) return;
        publishLocalChecklist(snapshot.checklist);
    }), [publishLocalChecklist, task.id]);

    useEffect(() => {
        if (!writeDisabled) return;
        const acceptedSnapshot = getChecklistWriteSnapshot(task.id);
        publishLocalChecklist(acceptedSnapshot?.checklist ?? (task.checklist || []) as ChecklistItems);
    }, [publishLocalChecklist, task.checklist, task.id, writeDisabled]);

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
        const operationTaskId = task.id;
        publishLocalChecklist(nextChecklist);

        enqueueChecklistWrite(
            { taskId: operationTaskId, previousChecklist, nextChecklist },
            () => commitMutation({
                taskId: operationTaskId,
                itemId,
                itemIndex: index,
                isCompleted: nextItem.isCompleted,
                previousChecklist,
                nextChecklist,
            }),
        );
    }, [commitMutation, publishLocalChecklist, task.id]);

    const checklistProgress = useMemo(
        () => getChecklistProgress({ ...task, checklist: localChecklist }),
        [task, localChecklist],
    );

    return {
        checklistProgress,
        localChecklist,
        showChecklist,
        toggleChecklist,
        toggleChecklistItem,
    };
}
