import type { TaskPriority } from '@mindwtr/core';

type CaptureDraftFields = {
  dueDate: Date | null;
  dueDateHasTime: boolean;
  startTime: Date | null;
  contextTags: readonly string[];
  projectId: string | null;
  selectedAreaId: string | null;
  priority: TaskPriority | null;
  focusNewTask: boolean;
};

/** Compare only this editor's private fields, never read or cache store Tasks. */
export function captureDraftFingerprint(fields: CaptureDraftFields): string {
  return JSON.stringify({
    ...fields,
    dueDate: fields.dueDate?.getTime() ?? null,
    startTime: fields.startTime?.getTime() ?? null,
    contextTags: [...fields.contextTags].sort(),
  });
}

export function hasCaptureDraftChanges(title: string, note: string, current: CaptureDraftFields, baseline: string): boolean {
  return Boolean(title.trim() || note.trim()) || captureDraftFingerprint(current) !== baseline;
}
