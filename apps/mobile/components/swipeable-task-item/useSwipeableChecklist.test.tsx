import React from 'react';
import renderer from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwipeableChecklist, type CommitChecklistItemMutation } from './useSwipeableChecklist';
import { resetChecklistWriteQueueForTests } from './checklist-write-queue';

type Hook = ReturnType<typeof useSwipeableChecklist>;

const task = {
    id: 'task-1',
    title: 'Release',
    status: 'next',
    taskMode: 'list',
    checklist: [
        { id: 'item-1', title: 'Build', isCompleted: false },
        { id: 'item-2', title: 'Upload', isCompleted: false },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
} as any;

function renderChecklistHook(commit: CommitChecklistItemMutation, disabled = false) {
    const captured: { current: Hook | null } = { current: null };
    const Probe = ({ value, writeDisabled }: { value: any; writeDisabled: boolean }) => {
        captured.current = useSwipeableChecklist(value, commit, writeDisabled);
        return null;
    };
    let tree!: renderer.ReactTestRenderer;
    renderer.act(() => {
        tree = renderer.create(<Probe value={task} writeDisabled={disabled} />);
    });
    return {
        hook: () => captured.current!,
        setDisabled: (value: boolean) => renderer.act(() => {
            tree.update(<Probe value={task} writeDisabled={value} />);
        }),
        tree,
    };
}

describe('useSwipeableChecklist execution', () => {
    beforeEach(() => {
        resetChecklistWriteQueueForTests();
        vi.clearAllMocks();
    });

    it('optimistically toggles by stable item identity and starts persistence immediately', () => {
        const commit = vi.fn(async () => true);
        const { hook } = renderChecklistHook(commit);

        renderer.act(() => hook().toggleChecklistItem('item-2'));

        expect(hook().localChecklist).toEqual([
            { id: 'item-1', title: 'Build', isCompleted: false },
            { id: 'item-2', title: 'Upload', isCompleted: true },
        ]);
        expect(commit).toHaveBeenCalledTimes(1);
        expect(commit).toHaveBeenCalledWith(expect.objectContaining({
            taskId: 'task-1',
            itemId: 'item-2',
            itemIndex: 1,
            isCompleted: true,
        }));
    });

    it('keeps rapid item writes ordered without moving completed items', async () => {
        let finishFirst!: (value: boolean) => void;
        const commit = vi.fn()
            .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }))
            .mockResolvedValueOnce(true);
        const { hook } = renderChecklistHook(commit);

        renderer.act(() => {
            hook().toggleChecklistItem('item-1');
            hook().toggleChecklistItem('item-2');
        });

        expect(hook().localChecklist?.map((item) => item.id)).toEqual(['item-1', 'item-2']);
        expect(hook().localChecklist?.every((item) => item.isCompleted)).toBe(true);
        expect(commit).toHaveBeenCalledTimes(1);

        await renderer.act(async () => {
            finishFirst(true);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(commit).toHaveBeenCalledTimes(2);
        expect(commit.mock.calls[1][0].nextChecklist).toEqual([
            { id: 'item-1', title: 'Build', isCompleted: true },
            { id: 'item-2', title: 'Upload', isCompleted: true },
        ]);
    });

    it('persists every accepted item write after the row unmounts', async () => {
        let finishFirst!: (value: boolean) => void;
        const commit = vi.fn()
            .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }))
            .mockResolvedValueOnce(true);
        const { hook, tree } = renderChecklistHook(commit);

        renderer.act(() => {
            hook().toggleChecklistItem('item-1');
            hook().toggleChecklistItem('item-2');
            tree.unmount();
        });

        expect(commit).toHaveBeenCalledTimes(1);

        await renderer.act(async () => {
            finishFirst(true);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(commit).toHaveBeenCalledTimes(2);
        expect(commit.mock.calls[1][0].nextChecklist).toEqual([
            { id: 'item-1', title: 'Build', isCompleted: true },
            { id: 'item-2', title: 'Upload', isCompleted: true },
        ]);
    });

    it('rolls the latest optimistic item back when persistence fails', async () => {
        const commit = vi.fn(async () => false);
        const { hook } = renderChecklistHook(commit);

        await renderer.act(async () => {
            hook().toggleChecklistItem('item-1');
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(hook().localChecklist).toEqual(task.checklist);
    });

    it('blocks new taps but lets already accepted writes reach the business guard', async () => {
        let finishFirst!: (value: boolean) => void;
        const commit = vi.fn()
            .mockImplementationOnce(() => new Promise<boolean>((resolve) => { finishFirst = resolve; }))
            .mockResolvedValueOnce(false);
        const { hook, setDisabled } = renderChecklistHook(commit);

        renderer.act(() => {
            hook().toggleChecklistItem('item-1');
            hook().toggleChecklistItem('item-2');
        });
        setDisabled(true);
        renderer.act(() => hook().toggleChecklistItem('item-1'));
        await renderer.act(async () => {
            finishFirst(true);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(commit).toHaveBeenCalledTimes(2);
        expect(hook().localChecklist).toEqual([
            { id: 'item-1', title: 'Build', isCompleted: true },
            { id: 'item-2', title: 'Upload', isCompleted: false },
        ]);
    });
});
