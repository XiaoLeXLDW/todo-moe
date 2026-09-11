import { beforeEach, describe, expect, it, vi } from 'vitest';
import { animateMoeListMutation } from './motion';
const mocks = vi.hoisted(() => ({ configureNext: vi.fn(), motion: 'standard' as 'simple' | 'standard' | 'lively' }));
vi.mock('react-native', () => ({ LayoutAnimation: { configureNext: mocks.configureNext } }));
vi.mock('./preferences', () => ({ getMoePreferences: () => ({ motion: mocks.motion }) }));

beforeEach(() => { mocks.configureNext.mockReset(); mocks.motion = 'standard'; });
describe('non-blocking motion', () => {
  it('does not schedule native animation when either reduce-motion control is enabled', () => {
    animateMoeListMutation(true);
    mocks.motion = 'simple';
    animateMoeListMutation(false);
    expect(mocks.configureNext).not.toHaveBeenCalled();
  });
  it('allows the write to run immediately even if the native animation API fails', () => {
    mocks.configureNext.mockImplementation(() => { throw new Error('Unsupported renderer'); });
    const write = vi.fn();
    expect(() => { animateMoeListMutation(false); write(); }).not.toThrow();
    expect(write).toHaveBeenCalledOnce();
  });
});
