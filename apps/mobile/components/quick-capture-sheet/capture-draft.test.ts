import { describe, expect, it } from 'vitest';
import { captureDraftFingerprint, hasCaptureDraftChanges } from './capture-draft';

const original = { dueDate: null, dueDateHasTime: false, startTime: null, contextTags: ['@home', '@phone'], projectId: 'shopping', selectedAreaId: null, priority: null, focusNewTask: false };
describe('capture draft discard boundary', () => {
  it('does not count initial container/date defaults or token ordering as an edit', () => {
    expect(hasCaptureDraftChanges('', '', { ...original, contextTags: ['@phone', '@home'] }, captureDraftFingerprint(original))).toBe(false);
  });
  it('protects title/description and metadata-only edits, and recognizes a reverted edit', () => {
    const baseline = captureDraftFingerprint(original);
    expect(hasCaptureDraftChanges('remember this', '', original, baseline)).toBe(true);
    expect(hasCaptureDraftChanges('', 'note', original, baseline)).toBe(true);
    expect(hasCaptureDraftChanges('', '', { ...original, dueDate: new Date('2026-09-12T00:00:00Z') }, baseline)).toBe(true);
    expect(hasCaptureDraftChanges('', '', { ...original, projectId: null, selectedAreaId: 'home' }, baseline)).toBe(true);
    expect(hasCaptureDraftChanges('  ', '', original, baseline)).toBe(false);
  });
});
