import { afterEach, describe, expect, it } from 'vitest';
import type { Task, Project } from '@mindwtr/core';
import { beginMoeCompletion, cancelMoeCompletion, finishMoeCompletion, isMoePendingTask } from './completion';

const project = { id: 'p', title: '我的清单', status: 'active' } as Project;
const task = (id: string, extra: Partial<Task> = {}) => ({ id, title: id, status: 'next', projectId: 'p', ...extra }) as Task;
const snapshot = (tasks: Task[], projects = [project]) => ({ tasks, projects });
afterEach(() => ['a', 'b'].forEach(cancelMoeCompletion));

describe('local list completion boundary', () => {
  it('celebrates exactly once after a successful local last task', () => {
    const op = beginMoeCompletion('a', snapshot([task('a')]))!;
    expect(op.occurredAt).toEqual(expect.any(Number));
    expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' })])))
      .toEqual({ operationId: op.id, projectId: 'p', title: '我的清单' });
    expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' })]))).toBeNull();
  });
  it('locks the stable task id across simultaneous rows and allows a retry after failure', () => {
    const op = beginMoeCompletion('a', snapshot([task('a')]))!;
    expect(beginMoeCompletion('a', snapshot([task('a')]))).toBeNull();
    expect(finishMoeCompletion(op, false, snapshot([task('a', { status: 'done' })]))).toBeNull();
    expect(beginMoeCompletion('a', snapshot([task('a')]))).not.toBeNull();
  });
  it('counts hidden waiting/someday items from the complete store, not the visible filter', () => {
    for (const status of ['waiting', 'someday'] as const) {
      const all = snapshot([task('a'), task('b', { status })]);
      const op = beginMoeCompletion('a', all)!;
      expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' }), task('b', { status })]))).toBeNull();
    }
  });
  it('rejects a repeat successor created by the successful transaction', () => {
    const op = beginMoeCompletion('a', snapshot([task('a', { recurrence: 'daily' })]))!;
    expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' }), task('b')]))).toBeNull();
  });
  it('cannot celebrate opening an empty list, replaying sync, or an already completed task', () => {
    const op = beginMoeCompletion('a', snapshot([task('a', { status: 'done' })]))!;
    expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' })]))).toBeNull();
  });
  it('does not treat deleting, moving, archiving or undo as local completion', () => {
    const states = [snapshot([task('a', { status: 'done', deletedAt: 'now' })]), snapshot([task('a', { status: 'done', projectId: 'other' })]),
      snapshot([task('a', { status: 'done' })], [{ ...project, status: 'archived' }]), snapshot([task('a')])];
    for (const state of states) {
      const op = beginMoeCompletion('a', snapshot([task('a')]))!;
      expect(finishMoeCompletion(op, true, state)).toBeNull();
    }
    const op = beginMoeCompletion('a', snapshot([task('a')]))!;
    cancelMoeCompletion('a');
    expect(finishMoeCompletion(op, true, snapshot([task('a', { status: 'done' })]))).toBeNull();
  });
  it('keeps separate tasks independent and ignores reference/archived/deleted work', () => {
    expect(beginMoeCompletion('a', snapshot([task('a'), task('b')]))).not.toBeNull();
    expect(beginMoeCompletion('b', snapshot([task('a'), task('b')]))).not.toBeNull();
    expect(isMoePendingTask(task('r', { status: 'reference' }))).toBe(false);
    expect(isMoePendingTask(task('r', { status: 'archived' }))).toBe(false);
    expect(isMoePendingTask(task('r', { deletedAt: 'now' }))).toBe(false);
  });
  it('celebrates rapid independent completions once, after both local writes succeed', () => {
    const initial = snapshot([task('a'), task('b')]);
    const first = beginMoeCompletion('a', initial)!;
    const second = beginMoeCompletion('b', initial)!;
    const done = snapshot([task('a', { status: 'done' }), task('b', { status: 'done' })]);
    expect(finishMoeCompletion(first, true, done)).toBeNull();
    expect(finishMoeCompletion(second, true, done)).toMatchObject({ projectId: 'p', operationId: second.id });
  });
  it('does not claim the list if another device completes a remaining item during a local save', () => {
    const operation = beginMoeCompletion('a', snapshot([task('a'), task('b')]))!;
    expect(finishMoeCompletion(operation, true, snapshot([task('a', { status: 'done' }), task('b', { status: 'done' })]))).toBeNull();
  });
  it('can cancel a non-completion status action without a celebration batch', () => {
    expect(beginMoeCompletion('a', snapshot([task('a')]), false)).not.toBeNull();
    expect(() => cancelMoeCompletion('a')).not.toThrow();
    expect(beginMoeCompletion('a', snapshot([task('a')]))).not.toBeNull();
  });
});
