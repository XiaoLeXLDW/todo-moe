import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompletionFeedbackStore, feedbackGeometry, type CompletionFeedback, type FeedbackAppearance } from './MoeCompletionFeedbackState';

const appearance: FeedbackAppearance = { backgroundColor: '#fff', borderColor: '#aaa', borderWidth: 1, borderRadius: 20,
    textColor: '#111', fontSize: 15, lineHeight: 20, fontWeight: '500', textAlign: 'left', writingDirection: 'ltr', checkColor: '#173', checkForeground: '#fff' };
const entry = (operationId: number, taskId = `task-${operationId}`): CompletionFeedback => ({ operationId, taskId, title: 'Visible title', appearance,
    row: { x: 12, y: 100, width: 320, height: 64 }, titleRect: { x: 50, y: 12, width: 220, height: 40 }, check: { x: 16, y: 20, width: 24, height: 24 }, expiresAt: Date.now() + 340 });
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('bounded read-only completion paint state', () => {
    it('uses same-window measurement differences with no fixed status-bar subtraction', () => {
        const geometry = feedbackGeometry({ pageX: 20, pageY: 100, width: 400, height: 800 },
            { pageX: 32, pageY: 270, width: 320, height: 64 }, { pageX: 82, pageY: 282, width: 220, height: 40 }, { pageX: 48, pageY: 290, width: 24, height: 24 });
        expect(geometry).toEqual({ row: { x: 12, y: 170, width: 320, height: 64 }, titleRect: { x: 50, y: 12, width: 220, height: 40 }, check: { x: 16, y: 20, width: 24, height: 24 } });
    });
    it('rejects invalid/offscreen or mismatched geometry instead of retrying asynchronously', () => {
        const host = { pageX: 0, pageY: 0, width: 400, height: 800 };
        const row = { pageX: 0, pageY: 100, width: 320, height: 64 };
        const title = { pageX: 50, pageY: 110, width: 200, height: 40 };
        const check = { pageX: 10, pageY: 110, width: 24, height: 24 };
        expect(feedbackGeometry(host, { ...row, pageY: 900 }, title, check)).toBeNull();
        expect(feedbackGeometry(host, row, title, { ...check, pageY: 20 })).toBeNull();
        expect(feedbackGeometry(host, { ...row, width: NaN }, title, check)).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
    });
    it('keeps at most four snapshots and a single expiry timer per host', () => {
        const store = createCompletionFeedbackStore();
        for (let i = 1; i <= 8; i++) store.present(entry(i));
        expect(store.getSnapshot().map((item) => item.operationId)).toEqual([5, 6, 7, 8]);
        expect(vi.getTimerCount()).toBe(1);
        vi.advanceTimersByTime(340);
        expect(store.getSnapshot()).toEqual([]); expect(vi.getTimerCount()).toBe(0);
    });
    it('same-task replacement and old failure/Undo cannot remove a newer operation', () => {
        const store = createCompletionFeedbackStore();
        store.present(entry(1, 'same')); store.present(entry(2, 'same'));
        store.cancel('same', 1);
        expect(store.getSnapshot().map((item) => item.operationId)).toEqual([2]);
        store.cancel('same', 2);
        expect(store.getSnapshot()).toEqual([]); expect(vi.getTimerCount()).toBe(0);
    });
    it('retains only the paint whitelist, not wider caller data, refs or callbacks', () => {
        const store = createCompletionFeedbackStore(); const extra = { task: { status: 'next' }, callback: () => {}, node: {} };
        store.present({ ...entry(1), ...extra, appearance: { ...appearance, ...extra }, row: { ...entry(1).row, ...extra } } as CompletionFeedback);
        const serialized = JSON.stringify(store.getSnapshot());
        expect(serialized).not.toContain('status'); expect(serialized).not.toContain('callback'); expect(serialized).not.toContain('node');
        expect(store.getSnapshot()[0]).toEqual(entry(1)); store.clear();
    });
    it('clearing one host cancels its timer without affecting another host', () => {
        const activity = createCompletionFeedbackStore(); const modal = createCompletionFeedbackStore();
        activity.present(entry(1)); modal.present(entry(2)); activity.clear();
        expect(activity.getSnapshot()).toEqual([]); expect(modal.getSnapshot()).toHaveLength(1); expect(vi.getTimerCount()).toBe(1);
        modal.clear(); expect(vi.getTimerCount()).toBe(0);
    });
    it('bounds Undo identity tokens and ignores an older completion without adding timers', () => {
        const store = createCompletionFeedbackStore();
        for (let i = 1; i <= 4; i++) expect(store.beginUndo(`undo-${i}`, i)).toBe(true);
        expect(store.beginUndo('overflow', 5)).toBe(false);
        expect(store.beginUndo('undo-1', 10)).toBe(true);
        store.finishUndo('undo-1', 1);
        expect(store.isUndoing('undo-1')).toBe(true);
        store.finishUndo('undo-1', 10);
        expect(store.isUndoing('undo-1')).toBe(false);
        expect(store.getSnapshot()).toEqual([]);
        expect(store.hasFeedback()).toBe(true); expect(vi.getTimerCount()).toBe(0);
        store.clear(); expect(store.hasFeedback()).toBe(false); expect(vi.getTimerCount()).toBe(0);
    });
    it('a new same-task action clears an Undo gate and page cleanup discards every identity', () => {
        const store = createCompletionFeedbackStore();
        store.beginUndo('a', 1); store.beginUndo('b', 2);
        store.cancel('a'); expect(store.isUndoing('a')).toBe(false); expect(store.isUndoing('b')).toBe(true);
        store.clear(); expect(store.isUndoing('b')).toBe(false); expect(store.hasFeedback()).toBe(false);
    });
});
