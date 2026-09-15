import { AREA_PRESET_COLORS, getEnglishI18nValue, type Project } from '@mindwtr/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyLiveProjectUpdate,
    AREA_COLOR_DISPLAY_BY_HEX,
    openProjectAreaPicker,
    openProjectTagPicker,
} from './project-meta-pickers';

const nativeMocks = vi.hoisted(() => ({
    actionSheetCallbacks: [] as ((buttonIndex: number) => void)[],
    alertPrompt: vi.fn(),
    dismissKeyboard: vi.fn(),
    showActionSheetWithOptions: vi.fn((_: unknown, callback: (buttonIndex: number) => void) => {
        nativeMocks.actionSheetCallbacks.push(callback);
    }),
}));

vi.mock('react-native', () => ({
    ActionSheetIOS: { showActionSheetWithOptions: nativeMocks.showActionSheetWithOptions },
    Alert: { prompt: nativeMocks.alertPrompt },
    Keyboard: { dismiss: nativeMocks.dismissKeyboard },
    Platform: { OS: 'ios' },
}));

beforeEach(() => {
    nativeMocks.actionSheetCallbacks.length = 0;
    nativeMocks.alertPrompt.mockClear();
    nativeMocks.dismissKeyboard.mockClear();
    nativeMocks.showActionSheetWithOptions.mockClear();
});

describe('AREA_COLOR_DISPLAY_BY_HEX', () => {
    it('names every preset color for the iOS action sheets', () => {
        // Without a row the sheet falls back to a raw hex like "◯ #F97316".
        for (const color of AREA_PRESET_COLORS) {
            expect(AREA_COLOR_DISPLAY_BY_HEX[color]?.nameKey).toBeTruthy();
            expect(AREA_COLOR_DISPLAY_BY_HEX[color]?.swatch).toBeTruthy();
        }
    });

    it('uses translation keys that exist in English', () => {
        for (const meta of Object.values(AREA_COLOR_DISPLAY_BY_HEX)) {
            expect(getEnglishI18nValue(meta.nameKey)).toBeTruthy();
        }
    });

    it('does not name colors that are not in the palette', () => {
        const palette = new Set<string>(AREA_PRESET_COLORS);
        expect(Object.keys(AREA_COLOR_DISPLAY_BY_HEX).filter((hex) => !palette.has(hex))).toEqual([]);
    });
});

describe('applyLiveProjectUpdate', () => {
    it('keeps a successful write but suppresses its stale selection result', async () => {
        const activeProject = {
            id: 'project-1',
            title: 'Project',
            status: 'active' as const,
            color: '#3b82f6',
            order: 0,
            tagIds: [],
            areaId: 'area-1',
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:00.000Z',
        };
        let finishWrite!: (value: unknown) => void;
        let selectionIsCurrent = true;
        const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
        const setSelectedProject = vi.fn();
        const pending = applyLiveProjectUpdate({
            projectId: activeProject.id,
            updates: { areaId: 'area-2' },
            updateProject,
            setSelectedProject,
            isSelectionCurrent: () => selectionIsCurrent,
            getProjectById: () => activeProject,
        });

        selectionIsCurrent = false;
        finishWrite({ success: true });

        await expect(pending).resolves.toBe(false);
        expect(updateProject).toHaveBeenCalledWith(activeProject.id, { areaId: 'area-2' });
        expect(setSelectedProject).not.toHaveBeenCalled();
    });

    it('does not let a stale blocked result close the current project picker', async () => {
        const activeProject = {
            id: 'project-1',
            title: 'Project',
            status: 'active' as const,
            color: '#3b82f6',
            order: 0,
            tagIds: [],
            areaId: 'area-1',
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:00.000Z',
        };
        let finishWrite!: (value: unknown) => void;
        let liveProject: Project = activeProject;
        let selectionIsCurrent = true;
        const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
        const setSelectedProject = vi.fn();
        const onBlocked = vi.fn();
        const pending = applyLiveProjectUpdate({
            projectId: activeProject.id,
            updates: { areaId: 'area-2' },
            updateProject,
            setSelectedProject,
            onBlocked,
            isSelectionCurrent: () => selectionIsCurrent,
            getProjectById: () => liveProject,
        });

        selectionIsCurrent = false;
        liveProject = { ...activeProject, status: 'archived' };
        finishWrite({ success: true });

        await expect(pending).resolves.toBe(false);
        expect(updateProject).toHaveBeenCalledTimes(1);
        expect(setSelectedProject).not.toHaveBeenCalled();
        expect(onBlocked).not.toHaveBeenCalled();
    });

    it('closes the current picker when its project becomes archived during the write', async () => {
        const activeProject = {
            id: 'project-1',
            title: 'Project',
            status: 'active' as const,
            color: '#3b82f6',
            order: 0,
            tagIds: [],
            areaId: 'area-1',
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:00.000Z',
        };
        let finishWrite!: (value: unknown) => void;
        let liveProject: Project = activeProject;
        const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
        const setSelectedProject = vi.fn();
        const onBlocked = vi.fn();
        const pending = applyLiveProjectUpdate({
            projectId: activeProject.id,
            updates: { areaId: 'area-2' },
            updateProject,
            setSelectedProject,
            onBlocked,
            isSelectionCurrent: () => true,
            getProjectById: () => liveProject,
        });

        liveProject = { ...activeProject, status: 'archived' };
        finishWrite({ success: true });

        await expect(pending).resolves.toBe(false);
        expect(updateProject).toHaveBeenCalledTimes(1);
        expect(setSelectedProject).not.toHaveBeenCalled();
        expect(onBlocked).toHaveBeenCalledTimes(1);
    });

    it('drops a delayed picker callback after the project becomes archived', async () => {
        const activeProject = {
            id: 'project-1',
            title: 'Project',
            status: 'active' as const,
            color: '#3b82f6',
            order: 0,
            tagIds: [],
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:00.000Z',
        };
        let liveProject: Project = activeProject;
        const updateProject = vi.fn();
        const setSelectedProject = vi.fn();
        const onBlocked = vi.fn();
        const delayedSelect = () => applyLiveProjectUpdate({
            projectId: activeProject.id,
            updates: { areaId: 'area-2' },
            updateProject,
            setSelectedProject,
            onBlocked,
            getProjectById: () => liveProject,
        });

        liveProject = { ...activeProject, status: 'archived' };
        await expect(delayedSelect()).resolves.toBe(false);
        expect(updateProject).not.toHaveBeenCalled();
        expect(setSelectedProject).not.toHaveBeenCalled();
        expect(onBlocked).toHaveBeenCalledTimes(1);
    });

    it('does not publish an optimistic project when the store rejects the write', async () => {
        const activeProject = {
            id: 'project-1',
            title: 'Project',
            status: 'active' as const,
            color: '#3b82f6',
            order: 0,
            tagIds: [],
            areaId: 'area-1',
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:00.000Z',
        };
        const setSelectedProject = vi.fn();
        const onFailed = vi.fn();

        await expect(applyLiveProjectUpdate({
            projectId: activeProject.id,
            updates: { areaId: 'area-2' },
            updateProject: vi.fn().mockResolvedValue({ success: false, error: 'Project is archived' }),
            setSelectedProject,
            onFailed,
            isSelectionCurrent: () => false,
            getProjectById: () => activeProject,
        })).resolves.toBe(false);

        expect(setSelectedProject).not.toHaveBeenCalled();
        expect(onFailed).toHaveBeenCalledWith('Project is archived');
    });
});

describe('iOS project picker selection sessions', () => {
    const project: Project = {
        id: 'project-a',
        title: 'Project A',
        status: 'active',
        color: '#3b82f6',
        order: 0,
        tagIds: ['existing'],
        areaId: 'area-1',
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z',
    };
    const t = (key: string) => key;

    it('keeps a delayed area write but does not restore a stale project selection', async () => {
        let finishWrite!: (value: unknown) => void;
        let current = true;
        const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
        const setSelectedProject = vi.fn();
        const isSelectionCurrent = vi.fn(() => current);

        openProjectAreaPicker({
            addArea: vi.fn(),
            areaUsage: new Map(),
            colors: AREA_PRESET_COLORS,
            deleteArea: vi.fn(),
            getProjectById: () => project,
            isSelectionCurrent,
            logProjectError: vi.fn(),
            selectedProject: project,
            setSelectedProject,
            setShowAreaPicker: vi.fn(),
            showToast: vi.fn(),
            sortAreasByColor: vi.fn(),
            sortAreasByName: vi.fn(),
            sortedAreas: [{
                id: 'area-2',
                name: 'Area 2',
                order: 0,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
            }],
            t,
            updateArea: vi.fn(),
            updateProject,
        });

        nativeMocks.actionSheetCallbacks[0]?.(4);
        expect(updateProject).toHaveBeenCalledWith(project.id, { areaId: 'area-2' });
        current = false;
        finishWrite({ success: true });
        await vi.waitFor(() => expect(isSelectionCurrent).toHaveBeenCalled());

        expect(setSelectedProject).not.toHaveBeenCalled();
    });

    it('keeps a delayed tag write but does not restore a stale project selection', async () => {
        let finishWrite!: (value: unknown) => void;
        let current = true;
        const updateProject = vi.fn(() => new Promise<unknown>((resolve) => { finishWrite = resolve; }));
        const setSelectedProject = vi.fn();
        const isSelectionCurrent = vi.fn(() => current);

        openProjectTagPicker({
            getProjectById: () => project,
            isSelectionCurrent,
            projectTagOptions: ['existing'],
            selectedProject: project,
            setSelectedProject,
            setShowTagPicker: vi.fn(),
            setTagDraft: vi.fn(),
            showToast: vi.fn(),
            t,
            toggleProjectTag: vi.fn(),
            updateProject,
        });

        nativeMocks.actionSheetCallbacks[0]?.(2);
        expect(updateProject).toHaveBeenCalledWith(project.id, { tagIds: [] });
        current = false;
        finishWrite({ success: true });
        await vi.waitFor(() => expect(isSelectionCurrent).toHaveBeenCalled());

        expect(setSelectedProject).not.toHaveBeenCalled();
    });
});
