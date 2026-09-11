import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));

beforeEach(() => { vi.resetModules(); storage.getItem.mockReset().mockResolvedValue(null); storage.setItem.mockReset().mockResolvedValue(undefined); });
describe('device preference persistence', () => {
  it('hydrates before applying an edit, preserving other saved preferences', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ theme: 'ink', haptics: 'off' }));
    const { setMoePreferences, getMoePreferences } = await import('./preferences');
    await setMoePreferences({ glass: 'off' });
    expect(getMoePreferences()).toMatchObject({ theme: 'ink', haptics: 'off', glass: 'off' });
    expect(storage.setItem.mock.calls[0][0]).toBe('@todo-moe/presentation/v1');
  });
  it('serializes quick edits so an older write cannot overwrite the final selection', async () => {
    let release!: () => void;
    storage.setItem.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const { setMoePreferences, getMoePreferences, hydrateMoePreferences } = await import('./preferences');
    await hydrateMoePreferences();
    const first = setMoePreferences({ theme: 'ink' });
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const second = setMoePreferences({ theme: 'family' });
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)![1]).theme).toBe('family');
    expect(getMoePreferences().theme).toBe('family');
  });
  it('rolls back a failed save and remains editable after corrupt JSON', async () => {
    storage.getItem.mockResolvedValue('{corrupt');
    storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    const { setMoePreferences, getMoePreferences } = await import('./preferences');
    await expect(setMoePreferences({ theme: 'ink' })).rejects.toThrow('disk full');
    expect(getMoePreferences().theme).toBe('soft');
    await setMoePreferences({ haptics: 'off' });
    expect(getMoePreferences().haptics).toBe('off');
  });
});
