import type { Project, Task } from '@mindwtr/core';

export type CompletionSnapshot = { tasks: readonly Task[]; projects: readonly Project[] };
export type CompletionOperation = { id: number; taskId: string; projectId?: string; eligible: boolean; batchId?: number };
export type ListCompletedEvent = { operationId: number; projectId: string; title: string };
const pending = new Map<string, CompletionOperation>();
type CompletionBatch = { id: number; pending: Set<number>; before: Set<string>; successful: Set<string>; cancelled: boolean };
const batches = new Map<string, CompletionBatch>();
const listeners = new Set<(event: ListCompletedEvent | null) => void>();
let sequence = 0;

/** Reference material, cancelled, archived and soft-deleted rows are not pending work. */
export const isMoePendingTask = (task: Task) => !task.deletedAt && ['inbox', 'next', 'waiting', 'someday'].includes(task.status);

/** Called only from a local user action, before the original store call. */
export function beginMoeCompletion(taskId: string, snapshot: CompletionSnapshot, completing = true): CompletionOperation | null {
  if (pending.has(taskId)) return null;
  const task = snapshot.tasks.find((item) => item.id === taskId);
  const project = snapshot.projects.find((item) => item.id === task?.projectId);
  const outstanding = snapshot.tasks.filter((item) => item.projectId === project?.id && isMoePendingTask(item));
  const operation: CompletionOperation = {
    id: ++sequence, taskId, projectId: project?.id,
    eligible: Boolean(completing && task && project && !project.deletedAt && project.status === 'active'
      && isMoePendingTask(task)),
  };
  if (operation.eligible && project) {
    const batch = batches.get(project.id) ?? { id: operation.id, pending: new Set<number>(), before: new Set<string>(), successful: new Set<string>(), cancelled: false };
    batch.pending.add(operation.id);
    outstanding.forEach((item) => batch.before.add(item.id));
    operation.batchId = batch.id;
    batches.set(project.id, batch);
  }
  pending.set(taskId, operation);
  return operation;
}

/** Read the *whole* store after the original action settles, including repeat successors. */
export function finishMoeCompletion(operation: CompletionOperation, succeeded: boolean, snapshot: CompletionSnapshot): ListCompletedEvent | null {
  if (pending.get(operation.taskId)?.id !== operation.id) return null;
  pending.delete(operation.taskId);
  if (!operation.eligible || !operation.projectId) return null;
  const batch = batches.get(operation.projectId);
  if (!batch || batch.id !== operation.batchId) return null;
  batch.pending.delete(operation.id);
  const project = snapshot.projects.find((item) => item.id === operation.projectId);
  const task = snapshot.tasks.find((item) => item.id === operation.taskId);
  if (succeeded && task?.status === 'done' && !task.deletedAt && task.projectId === operation.projectId) batch.successful.add(task.id);
  if (batch.pending.size > 0) return null;
  batches.delete(operation.projectId);
  // Every disappeared pending item must belong to a successful local action in
  // this batch. A sync update, filter, deletion or move cannot complete the proof.
  if (batch.cancelled || !succeeded || [...batch.before].some((id) => !batch.successful.has(id))) return null;
  if (!project || project.deletedAt || project.status !== 'active' || !task || task.deletedAt
    || task.status !== 'done' || task.projectId !== project.id) return null;
  if (snapshot.tasks.some((item) => item.projectId === project.id && isMoePendingTask(item))) return null;
  return { operationId: operation.id, projectId: project.id, title: project.title };
}

export function publishListCompleted(event: ListCompletedEvent) { listeners.forEach((listener) => listener(event)); }
export function subscribeListCompleted(listener: (event: ListCompletedEvent | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Undo invalidates a pending operation; a stale async success cannot celebrate it. */
export function cancelMoeCompletion(taskId: string) {
  const operation = pending.get(taskId);
  if (operation?.projectId) {
    const batch = batches.get(operation.projectId);
    if (batch && batch.id === operation.batchId) {
      batch.cancelled = true;
      batch.pending.delete(operation.id);
      if (!batch.pending.size) batches.delete(operation.projectId);
    }
  }
  pending.delete(taskId);
  listeners.forEach((listener) => listener(null));
}
