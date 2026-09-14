/** Short-lived paint data only. This module never accepts a Task, ReactNode or
 * business callback and is not a second source for task queries. */
export type FeedbackRect = { x: number; y: number; width: number; height: number };
export type FeedbackAppearance = {
    backgroundColor: string; borderColor: string; borderWidth: number; borderRadius: number;
    textColor: string; fontSize: number; lineHeight: number; fontWeight: '400' | '500' | '600' | '700';
    textAlign: 'left' | 'right'; writingDirection: 'ltr' | 'rtl';
    checkColor: string; checkForeground: string;
};
export type CompletionFeedback = {
    operationId: number; taskId: string; title: string; appearance: FeedbackAppearance;
    row: FeedbackRect; titleRect: FeedbackRect; check: FeedbackRect; expiresAt: number;
};
export type FeedbackMeasurement = { pageX: number; pageY: number; width: number; height: number };
export type FeedbackLayoutGate = { epoch: number; pending: boolean; until: number; canceledOperationIds: readonly number[] };

const valid = (rect: FeedbackMeasurement) => [rect.pageX, rect.pageY, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0;
/** Both origins are from the same host window; no status-bar/inset constants. */
export function feedbackGeometry(host: FeedbackMeasurement, row: FeedbackMeasurement, title: FeedbackMeasurement, check: FeedbackMeasurement) {
    if (![host, row, title, check].every(valid)) return null;
    if (row.width > host.width + 4 || row.height > host.height + 4) return null;
    const relative = (rect: FeedbackMeasurement, origin: FeedbackMeasurement): FeedbackRect => ({
        x: rect.pageX - origin.pageX, y: rect.pageY - origin.pageY, width: rect.width, height: rect.height,
    });
    const rowRect = relative(row, host);
    if (rowRect.x + rowRect.width <= 0 || rowRect.y + rowRect.height <= 0 || rowRect.x >= host.width || rowRect.y >= host.height) return null;
    const within = (rect: FeedbackMeasurement) => rect.pageX >= row.pageX - 4 && rect.pageY >= row.pageY - 4
        && rect.pageX + rect.width <= row.pageX + row.width + 4 && rect.pageY + rect.height <= row.pageY + row.height + 4;
    if (!within(title) || !within(check)) return null;
    return { row: rowRect, titleRect: relative(title, row), check: relative(check, row) };
}

export function createCompletionFeedbackStore() {
    let entries: readonly CompletionFeedback[] = [];
    // Only identity tokens while the original two-stage Undo promise is pending.
    const undoing = new Map<string, number>();
    let layoutGate: FeedbackLayoutGate = { epoch: 0, pending: false, until: 0, canceledOperationIds: [] };
    // Native paint can outlive React's cancellation commit by a frame. Retain
    // only the latest four unique visual IDs until host cleanup, without timers.
    const cancelPaint = (operationIds: readonly number[]) => {
        if (!operationIds.length) return;
        const canceledOperationIds = [...layoutGate.canceledOperationIds.filter((id) => !operationIds.includes(id)), ...operationIds].slice(-4);
        layoutGate = { ...layoutGate, canceledOperationIds };
    };
    const finishLayoutHandoff = () => {
        if (!undoing.size) layoutGate = { ...layoutGate, pending: false, until: Date.now() + 340 };
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const schedule = () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
        if (!entries.length) return;
        timer = setTimeout(() => {
            timer = undefined;
            entries = entries.filter((entry) => entry.expiresAt > Date.now());
            notify(); schedule();
        }, Math.max(0, Math.min(...entries.map((entry) => entry.expiresAt)) - Date.now()));
    };
    return {
        getSnapshot: () => entries,
        hasFeedback: () => entries.length > 0 || undoing.size > 0,
        isUndoing: (taskId: string) => undoing.has(taskId),
        getLayoutGate: () => layoutGate,
        subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        beginUndo(taskId: string, operationId: number) {
            if (!Number.isSafeInteger(operationId) || operationId < 1) return false;
            const previous = undoing.get(taskId);
            if (previous !== undefined && previous > operationId) return false;
            if (previous === undefined && undoing.size >= 4) return false;
            undoing.set(taskId, operationId);
            cancelPaint([operationId]);
            layoutGate = { ...layoutGate, epoch: layoutGate.epoch + 1, pending: true, until: 0 };
            notify(); return true;
        },
        finishUndo(taskId: string, operationId: number) {
            if (undoing.get(taskId) !== operationId) return;
            undoing.delete(taskId); finishLayoutHandoff(); notify();
        },
        present(entry: CompletionFeedback) {
            if (!Number.isSafeInteger(entry.operationId) || entry.operationId < 1 || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= Date.now() || entry.expiresAt > Date.now() + 1400) return false;
            // Pick fields explicitly: even a structurally wider caller object
            // cannot smuggle Task data or callbacks into the retained payload.
            const { operationId, taskId, title, appearance, row, titleRect, check, expiresAt } = entry;
            const copyRect = ({ x, y, width, height }: FeedbackRect): FeedbackRect => ({ x, y, width, height });
            const a = appearance;
            const snapshot = { operationId, taskId, title, appearance: {
                backgroundColor: a.backgroundColor, borderColor: a.borderColor, borderWidth: a.borderWidth, borderRadius: a.borderRadius,
                textColor: a.textColor, fontSize: a.fontSize, lineHeight: a.lineHeight, fontWeight: a.fontWeight,
                textAlign: a.textAlign, writingDirection: a.writingDirection, checkColor: a.checkColor, checkForeground: a.checkForeground,
            }, row: copyRect(row), titleRect: copyRect(titleRect), check: copyRect(check), expiresAt };
            entries = [...entries.filter((item) => item.taskId !== taskId && item.expiresAt > Date.now()), snapshot].slice(-4);
            notify(); schedule(); return true;
        },
        cancel(taskId: string, operationId?: number) {
            const removedIds = entries.filter((entry) => entry.taskId === taskId && (operationId === undefined || entry.operationId === operationId))
                .map((entry) => entry.operationId);
            const next = entries.filter((entry) => entry.taskId !== taskId || (operationId !== undefined && entry.operationId !== operationId));
            const removeUndo = undoing.has(taskId) && (operationId === undefined || undoing.get(taskId) === operationId);
            if (next.length === entries.length && !removeUndo) return;
            cancelPaint(removedIds);
            if (removeUndo) { undoing.delete(taskId); finishLayoutHandoff(); }
            entries = next; notify(); schedule();
        },
        dismissVisuals() {
            if (!entries.length) return;
            cancelPaint(entries.map((entry) => entry.operationId));
            entries = [];
            notify(); schedule();
        },
        clear() {
            if (timer !== undefined) clearTimeout(timer);
            timer = undefined;
            entries = []; undoing.clear();
            layoutGate = { epoch: layoutGate.epoch + 1, pending: false, until: 0, canceledOperationIds: [] };
            notify();
        },
    };
}
